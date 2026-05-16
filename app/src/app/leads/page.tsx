import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { LeadsKanban, type Lead } from '@/components/leads-kanban'

const LEAD_CLASSIFICATIONS = [
  'trial_enquiry',
  'birthday_party',
  'ndis_enquiry',
  'school_gig',
  'corporate_gig',
  'other',
] as const

export default async function LeadsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Pipeline #1 — families already tagged as lead/trial in the lifecycle table.
  const familiesRes = await supabase
    .from('families')
    .select('id, family_name, primary_parent, email, phone, source, lifecycle_stage, created_at, notes, tags')
    .in('lifecycle_stage', ['lead', 'trial'])
    .order('created_at', { ascending: false })

  // Pipeline #2 — emails Jacky classified as high-intent that DON'T yet have a
  // matched family. These are the actual fresh leads coming in through admin@.
  // Look back 90 days so we don't lose track of older inbound.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000).toISOString()
  const emailsRes = await supabase
    .from('email_messages')
    .select('id, from_email, from_name, subject, body_text, body_preview:body_text, received_at, classification, matched_family_id')
    .in('classification', LEAD_CLASSIFICATIONS as unknown as string[])
    .gte('received_at', ninetyDaysAgo)
    .is('matched_family_id', null)
    .order('received_at', { ascending: false })

  // Pipeline #3 — pending_actions per email so we can show "draft awaiting your
  // approval" / "reply sent" badges on each lead card.
  const allEmailIds = (emailsRes.data ?? []).map((e) => e.id)
  const allFamilyIds = (familiesRes.data ?? []).map((f) => f.id)
  const actionsRes = await supabase
    .from('pending_actions')
    .select('id, status, kind, source_email_id, related_family_id, created_at, sent_at')
    .or(
      [
        allEmailIds.length ? `source_email_id.in.(${allEmailIds.join(',')})` : null,
        allFamilyIds.length ? `related_family_id.in.(${allFamilyIds.join(',')})` : null,
      ].filter(Boolean).join(',')
    )

  const actionsByEmail = new Map<string, typeof actionsRes.data>()
  const actionsByFamily = new Map<string, typeof actionsRes.data>()
  for (const a of actionsRes.data ?? []) {
    if (a.source_email_id) {
      const list = actionsByEmail.get(a.source_email_id) ?? []
      list.push(a)
      actionsByEmail.set(a.source_email_id, list)
    }
    if (a.related_family_id) {
      const list = actionsByFamily.get(a.related_family_id) ?? []
      list.push(a)
      actionsByFamily.set(a.related_family_id, list)
    }
  }

  function actionBadge(actions: typeof actionsRes.data | undefined): Lead['action'] {
    if (!actions || actions.length === 0) return 'none'
    const statuses = actions.map((a) => a.status)
    if (statuses.includes('sent')) return 'sent'
    if (statuses.includes('approved')) return 'approved'
    if (statuses.includes('pending')) return 'pending'
    if (statuses.includes('failed')) return 'failed'
    return 'none'
  }

  // Build the unified lead list.
  const leads: Lead[] = []

  for (const f of familiesRes.data ?? []) {
    leads.push({
      id: f.id,
      kind: 'family',
      name: f.family_name,
      parent: f.primary_parent,
      email: f.email,
      phone: f.phone,
      source: f.source,
      classification: null,
      stage: f.lifecycle_stage === 'trial' ? 'trial_booked' : 'new',
      receivedAt: f.created_at,
      preview: f.notes,
      tags: f.tags ?? [],
      action: actionBadge(actionsByFamily.get(f.id)),
      href: `/families/${f.id}`,
    })
  }

  for (const e of emailsRes.data ?? []) {
    const actions = actionsByEmail.get(e.id) ?? []
    const action = actionBadge(actions)
    // Stage inference: sent reply → contacted; otherwise → new.
    const stage = action === 'sent' || action === 'approved' ? 'contacted' : 'new'
    leads.push({
      id: e.id,
      kind: 'email',
      name: e.from_name || e.from_email || '(unknown sender)',
      parent: null,
      email: e.from_email,
      phone: null,
      source: 'email',
      classification: e.classification,
      stage,
      receivedAt: e.received_at,
      preview: e.subject,
      tags: [],
      action,
      href: `/jacky?prefill=${encodeURIComponent(`Tell me about lead ${e.from_name || e.from_email}. Show me the email and what we drafted.`)}`,
    })
  }

  return (
    <DashboardShell
      user={user}
      currentPath="/leads"
      pageTitle="Leads"
      pageSubtitle={`${leads.length} leads in your pipeline — ${leads.filter(l => l.action === 'pending').length} draft${leads.filter(l => l.action === 'pending').length === 1 ? '' : 's'} waiting for approval`}
      pageActions={
        <a
          href="/jacky"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
        >
          🎪 Ask Jacky
        </a>
      }
    >
      {(familiesRes.error || emailsRes.error) && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          {familiesRes.error?.message || emailsRes.error?.message}
        </div>
      )}
      <LeadsKanban leads={leads} />
    </DashboardShell>
  )
}
