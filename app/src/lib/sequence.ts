import 'server-only'
import type { createAdminSupabase } from './supabase-admin'
import { sendEmail } from './email'
import { sendSms } from './sms'
import { freeTrialEmails, FT_WELCOME_SMS } from './free-trial-emails'

type Admin = ReturnType<typeof createAdminSupabase>
export type Step = { tag: string; offsetDays: number; subject: string; html: string }

const fill = (s: string, name: string) => (s || '').replace(/\{\{\s*(?:contact\.)?first_name\s*\}\}/gi, name || 'there')

// Editable steps from the DB; fall back to the built-in copy (with {{first_name}} kept).
export async function getSequenceSteps(admin: Admin, tenantId: string, sequence = 'free_trial'): Promise<Step[]> {
  const { data } = await admin.from('sequence_steps').select('tag, offset_days, subject, body_html').eq('tenant_id', tenantId).eq('sequence', sequence).eq('active', true).order('step_order')
  if (data && data.length) return data.map((s) => ({ tag: (s.tag as string) || '', offsetDays: Number(s.offset_days) || 0, subject: (s.subject as string) || '', html: (s.body_html as string) || '' }))
  return freeTrialEmails('{{first_name}}').map((e) => ({ tag: e.key, offsetDays: e.offsetDays, subject: e.subject, html: e.html }))
}

// Seed the DB from the built-in copy once, so the editor has content to edit.
export async function seedFreeTrialSteps(admin: Admin, tenantId: string): Promise<number> {
  const { data: existing } = await admin.from('sequence_steps').select('id').eq('tenant_id', tenantId).eq('sequence', 'free_trial').limit(1)
  if (existing && existing.length) return 0
  const rows = freeTrialEmails('{{first_name}}').map((e, i) => ({ tenant_id: tenantId, sequence: 'free_trial', step_order: i + 1, tag: e.key, offset_days: e.offsetDays, subject: e.subject, body_html: e.html }))
  const { error } = await admin.from('sequence_steps').insert(rows)
  return error ? 0 : rows.length
}

// Enrol a contact: send the immediate step now + queue the rest into scheduled_messages.
export async function enrollFreeTrial(admin: Admin, tenantId: string, contact: { email: string; firstName?: string | null; phone?: string | null }): Promise<{ sent: boolean; scheduled: number }> {
  if (!contact.email) return { sent: false, scheduled: 0 }
  const steps = await getSequenceSteps(admin, tenantId, 'free_trial')
  if (!steps.length) return { sent: false, scheduled: 0 }
  const name = contact.firstName || 'there'
  const now = Date.now()
  const first = steps.find((s) => s.offsetDays === 0) || steps[0]
  const r = await sendEmail(contact.email, fill(first.subject, name), fill(first.html, name), first.tag)
  if (contact.phone) { try { await sendSms(contact.phone, FT_WELCOME_SMS) } catch {} }
  const later = steps.filter((s) => s !== first && s.offsetDays > 0)
  const rows = later.map((e) => ({ tenant_id: tenantId, send_at: new Date(now + e.offsetDays * 86400000).toISOString(), channel: 'email', to_email: contact.email, subject: fill(e.subject, name), body_html: fill(e.html, name), context: `free-trial ${e.tag}: ${contact.email}`, status: 'pending' }))
  if (rows.length) await admin.from('scheduled_messages').insert(rows)
  return { sent: r.ok, scheduled: rows.length }
}
