'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type ImportRow = {
  family_name?: string
  primary_parent?: string
  email?: string
  phone?: string
  emergency_phone?: string
  address?: string
  source?: string
  lifecycle_stage?: string
  weekly_fee_total?: string | number
  notes?: string
  tags?: string // comma-separated
}

const ALLOWED_SOURCES = new Set(['fb_ad', 'instagram', 'google', 'word_of_mouth', 'school', 'walkin', 'open_day', 'other'])
const ALLOWED_STAGES = new Set(['lead', 'trial', 'active', 'paused', 'past', 'lost'])

export type ImportResult = {
  ok: boolean
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

/**
 * Bulk-import families. Accepts an array of rows already parsed client-side
 * from the CSV. Each row's columns have already been mapped to canonical names
 * via the import form's "column mapping" step. We de-dupe by (tenant_id, email)
 * — if a family with the same email exists we UPDATE rather than insert.
 *
 * Multi-tenant safe: every row gets the signed-in user's tenant_id, ignoring
 * whatever was in the CSV.
 */
export async function importFamilies(rows: ImportRow[]): Promise<ImportResult> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const tenantId = user.tenantId

  let inserted = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  // Pull existing emails so we can upsert without N round-trips.
  const { data: existing } = await supabase
    .from('families')
    .select('id, email')
    .eq('tenant_id', tenantId)
    .not('email', 'is', null)
  const existingByEmail = new Map<string, string>()
  for (const e of existing ?? []) {
    if (e.email) existingByEmail.set(e.email.toLowerCase(), e.id)
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    const family_name = (r.family_name ?? '').toString().trim()
    if (!family_name) {
      skipped++
      errors.push(`Row ${i + 2}: family_name is required`)
      continue
    }
    const email = (r.email ?? '').toString().trim() || null
    const phone = normalisePhone((r.phone ?? '').toString().trim())
    const source = ALLOWED_SOURCES.has((r.source ?? '').toString().trim().toLowerCase())
      ? (r.source as string).toLowerCase()
      : null
    const lifecycle_stage = ALLOWED_STAGES.has((r.lifecycle_stage ?? '').toString().trim().toLowerCase())
      ? (r.lifecycle_stage as string).toLowerCase()
      : 'lead'
    const weekly_fee_total = Number(r.weekly_fee_total ?? 0) || 0
    const tags = (r.tags ?? '').toString().split(',').map((t) => t.trim()).filter(Boolean)

    const payload = {
      tenant_id: tenantId,
      family_name,
      primary_parent: (r.primary_parent ?? '').toString().trim() || null,
      email,
      phone,
      emergency_phone: (r.emergency_phone ?? '').toString().trim() || null,
      address: (r.address ?? '').toString().trim() || null,
      source,
      lifecycle_stage,
      weekly_fee_total,
      notes: (r.notes ?? '').toString().trim() || null,
      tags,
    }

    try {
      const existingId = email ? existingByEmail.get(email.toLowerCase()) : null
      if (existingId) {
        const { error } = await supabase.from('families').update(payload).eq('id', existingId).eq('tenant_id', tenantId)
        if (error) {
          errors.push(`Row ${i + 2} (${family_name}): ${error.message}`)
          skipped++
        } else {
          updated++
        }
      } else {
        const { error } = await supabase.from('families').insert(payload)
        if (error) {
          errors.push(`Row ${i + 2} (${family_name}): ${error.message}`)
          skipped++
        } else {
          inserted++
          if (email) existingByEmail.set(email.toLowerCase(), 'new')
        }
      }
    } catch (e) {
      errors.push(`Row ${i + 2} (${family_name}): ${(e as Error).message}`)
      skipped++
    }
  }

  revalidatePath('/families')
  revalidatePath('/leads')
  revalidatePath('/dashboard')
  return { ok: errors.length === 0, inserted, updated, skipped, errors }
}

function normalisePhone(raw: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D+/g, '')
  if (digits.length === 10 && digits.startsWith('04')) return '+61' + digits.slice(1)
  if (digits.length === 11 && digits.startsWith('614')) return '+' + digits
  if (raw.startsWith('+')) return raw.replace(/\s+/g, '')
  return raw // leave as-is if we can't normalise — don't lose data
}
