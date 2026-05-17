// Pulls customers + subscriptions from Stripe and reconciles into the
// families table. Idempotent — safe to run repeatedly. Dedup strategy:
//   1. Match by stripe_customer_id if already on the family record.
//   2. Otherwise match by email (case-insensitive).
//   3. Otherwise insert as a brand-new family.
//
// Lifecycle derivation: the *highest-priority* active subscription's status
// drives the family's lifecycle_stage. Priority: active > trialing > past_due
// > paused > canceled. weekly_fee_total is the sum of active-subscription
// weekly amounts.

import {
  listAllCustomers,
  listAllSubscriptions,
  weeklyAmountFromSubscription,
  lifecycleFromSubStatus,
  type StripeCustomer,
  type StripeSubscription,
} from '../tools/stripe.js'
import { supabase, getTenantId } from '../tools/supabase.js'
import { logger } from '../logger.js'

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  trialing: 1,
  past_due: 2,
  unpaid: 3,
  paused: 4,
  incomplete: 5,
  canceled: 6,
  incomplete_expired: 7,
}

export type SyncResult = {
  customersFromStripe: number
  subsFromStripe: number
  familiesInserted: number
  familiesUpdated: number
  familiesSkipped: number
  errors: string[]
}

export async function syncStripe(opts?: { dryRun?: boolean }): Promise<SyncResult> {
  const dryRun = opts?.dryRun ?? false
  const tenantId = await getTenantId()
  logger.info({ tenantId, dryRun }, 'Stripe sync starting')

  const [customers, subs] = await Promise.all([listAllCustomers(), listAllSubscriptions({ status: 'all' })])
  logger.info({ customers: customers.length, subs: subs.length }, 'Fetched Stripe records')

  // Group subscriptions by customer for fast lookup
  const subsByCustomer = new Map<string, StripeSubscription[]>()
  for (const s of subs) {
    const list = subsByCustomer.get(s.customer) ?? []
    list.push(s)
    subsByCustomer.set(s.customer, list)
  }

  // Pre-fetch all existing BSC families (by stripe_customer_id and by email)
  const { data: existing } = await supabase
    .from('families')
    .select('id, family_name, email, phone, stripe_customer_id, lifecycle_stage')
    .eq('tenant_id', tenantId)
  const byStripeId = new Map<string, { id: string; family_name: string; email: string | null; phone: string | null; lifecycle_stage: string | null }>()
  const byEmail = new Map<string, { id: string; family_name: string; email: string | null; phone: string | null; lifecycle_stage: string | null }>()
  for (const f of existing ?? []) {
    if (f.stripe_customer_id) byStripeId.set(f.stripe_customer_id, f)
    if (f.email) byEmail.set(f.email.toLowerCase(), f)
  }

  let inserted = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const cust of customers) {
    try {
      const result = await reconcileOne(cust, subsByCustomer.get(cust.id) ?? [], { tenantId, byStripeId, byEmail, dryRun })
      if (result === 'inserted') inserted++
      else if (result === 'updated') updated++
      else skipped++
    } catch (e) {
      const msg = `Customer ${cust.id} (${cust.email ?? '?'}): ${(e as Error).message}`
      logger.error({ err: msg }, 'Reconcile failed')
      errors.push(msg)
    }
  }

  logger.info(
    { customersFromStripe: customers.length, subsFromStripe: subs.length, inserted, updated, skipped, errors: errors.length },
    'Stripe sync done'
  )

  return {
    customersFromStripe: customers.length,
    subsFromStripe: subs.length,
    familiesInserted: inserted,
    familiesUpdated: updated,
    familiesSkipped: skipped,
    errors,
  }
}

type ReconcileCtx = {
  tenantId: string
  byStripeId: Map<string, { id: string; family_name: string; email: string | null; phone: string | null; lifecycle_stage: string | null }>
  byEmail: Map<string, { id: string; family_name: string; email: string | null; phone: string | null; lifecycle_stage: string | null }>
  dryRun: boolean
}

async function reconcileOne(
  cust: StripeCustomer,
  custSubs: StripeSubscription[],
  ctx: ReconcileCtx
): Promise<'inserted' | 'updated' | 'skipped'> {
  // Derive lifecycle from the highest-priority sub
  const sorted = [...custSubs].sort((a, b) => (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99))
  const primary = sorted[0]
  const lifecycle = primary
    ? lifecycleFromSubStatus(primary.status, primary.cancel_at_period_end)
    : null // no subs = leave existing stage or 'lead' for new families
  const weeklyFee = custSubs
    .filter((s) => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due')
    .reduce((sum, s) => sum + weeklyAmountFromSubscription(s), 0)

  const name = cust.name?.trim() || cust.email || `Stripe customer ${cust.id.slice(-6)}`
  const familyName = nameToFamilyName(name)
  const primaryParent = name

  // Find existing — prefer stripe_customer_id match, then email
  let existing = ctx.byStripeId.get(cust.id) ?? null
  if (!existing && cust.email) existing = ctx.byEmail.get(cust.email.toLowerCase()) ?? null

  const payload = {
    tenant_id: ctx.tenantId,
    family_name: familyName,
    primary_parent: primaryParent,
    email: cust.email,
    phone: cust.phone,
    address: addressString(cust),
    lifecycle_stage: lifecycle ?? existing?.lifecycle_stage ?? 'lead',
    stripe_customer_id: cust.id,
    weekly_fee_total: weeklyFee,
  }

  if (existing) {
    if (ctx.dryRun) {
      logger.debug({ id: existing.id, cust: cust.id, lifecycle, weeklyFee }, '[dry-run] would update')
      return 'updated'
    }
    // Only overwrite the family_name + primary_parent if they're empty — Rhett may
    // have edited the human-friendly versions in the CRM. Always update lifecycle,
    // stripe id, and weekly fee from Stripe (source of truth for those).
    const update: Record<string, unknown> = {
      lifecycle_stage: payload.lifecycle_stage,
      stripe_customer_id: payload.stripe_customer_id,
      weekly_fee_total: payload.weekly_fee_total,
    }
    if (!existing.email && cust.email) update.email = cust.email
    if (!existing.phone && cust.phone) update.phone = cust.phone
    const { error } = await supabase.from('families').update(update).eq('id', existing.id)
    if (error) throw new Error(error.message)
    // Update our lookup so subsequent passes don't double-process
    ctx.byStripeId.set(cust.id, { ...existing, lifecycle_stage: payload.lifecycle_stage })
    return 'updated'
  }

  if (ctx.dryRun) {
    logger.debug({ cust: cust.id, name: familyName, lifecycle }, '[dry-run] would insert')
    return 'inserted'
  }
  const { data, error } = await supabase.from('families').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  // Add to lookups so a duplicate Stripe customer in the same batch doesn't double-insert
  ctx.byStripeId.set(cust.id, { id: data!.id, family_name: familyName, email: cust.email, phone: cust.phone, lifecycle_stage: payload.lifecycle_stage })
  if (cust.email) ctx.byEmail.set(cust.email.toLowerCase(), { id: data!.id, family_name: familyName, email: cust.email, phone: cust.phone, lifecycle_stage: payload.lifecycle_stage })
  return 'inserted'
}

function nameToFamilyName(input: string): string {
  // "Erin Smith" → "Smith"; "Smith Family" → "Smith Family"; "erin@example.com" → "erin"
  if (input.includes('@')) return input.split('@')[0]!
  const parts = input.trim().split(/\s+/)
  if (parts.length >= 2) {
    // Use the last word unless it's "Family"/"Household" — in which case keep the whole phrase
    const last = parts[parts.length - 1]!
    if (/^(family|household)$/i.test(last)) return input
    return last
  }
  return input
}

function addressString(c: StripeCustomer): string | null {
  if (!c.address) return null
  const a = c.address
  const parts = [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean)
  if (parts.length === 0) return null
  return parts.join(', ')
}
