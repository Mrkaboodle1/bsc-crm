// Thin wrapper around the Stripe HTTP API. Uses a restricted key with
// limited scopes (customers/subscriptions write, invoices/charges/payment-intents/
// products/prices read) — so the API surface here intentionally doesn't expose
// destructive operations like deletes or refunds.

import { logger } from '../logger.js'

const STRIPE_API = 'https://api.stripe.com/v1'

function authHeader(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return `Bearer ${key}`
}

// Stripe uses application/x-www-form-urlencoded for POST/PUT, not JSON.
function encodeForm(obj: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (Array.isArray(v)) v.forEach((item) => params.append(`${k}[]`, String(item)))
    else params.append(k, String(v))
  }
  return params.toString()
}

async function stripeFetch<T = unknown>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<T> {
  const url = path.startsWith('http') ? path : `${STRIPE_API}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(),
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' && body ? encodeForm(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Stripe ${method} ${path} failed: ${res.status} ${text.slice(0, 400)}`)
  }
  return (await res.json()) as T
}

// ────────────────────────────────────────────────────────────────────
// Types — only the fields we use, kept narrow on purpose.
// ────────────────────────────────────────────────────────────────────

export type StripeCustomer = {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  description: string | null
  metadata: Record<string, string>
  address: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } | null
  created: number
  delinquent: boolean
}

export type StripeSubscription = {
  id: string
  customer: string // customer id
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused'
  current_period_end: number
  current_period_start: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  created: number
  items: {
    data: Array<{
      id: string
      price: {
        id: string
        unit_amount: number | null // in cents
        recurring: { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } | null
        nickname: string | null
        product: string
      }
      quantity: number
    }>
  }
  metadata: Record<string, string>
}

export type StripeInvoice = {
  id: string
  customer: string
  subscription: string | null
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  amount_due: number
  amount_paid: number
  created: number
  hosted_invoice_url: string | null
  next_payment_attempt: number | null
  attempt_count: number
}

// ────────────────────────────────────────────────────────────────────
// Pagination helper — Stripe pages 100 records at a time via starting_after.
// ────────────────────────────────────────────────────────────────────

async function paginate<T extends { id: string }>(basePath: string): Promise<T[]> {
  const all: T[] = []
  let startingAfter: string | null = null
  for (let safety = 0; safety < 200; safety++) {
    // Parse the base path into pathname + existing params, then add pagination
    const [path, existingQs = ''] = basePath.split('?')
    const params = new URLSearchParams(existingQs)
    if (!params.has('limit')) params.set('limit', '100')
    if (startingAfter) params.set('starting_after', startingAfter)
    const url = `${path}?${params.toString()}`
    const resp: { data: T[]; has_more: boolean } = await stripeFetch<{ data: T[]; has_more: boolean }>('GET', url)
    all.push(...resp.data)
    if (!resp.has_more || resp.data.length === 0) break
    startingAfter = resp.data[resp.data.length - 1]!.id
  }
  return all
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export async function listAllCustomers(): Promise<StripeCustomer[]> {
  return paginate<StripeCustomer>('/customers')
}

export async function listAllSubscriptions(opts?: { status?: 'all' | 'active' | 'past_due' | 'canceled' | 'trialing' }): Promise<StripeSubscription[]> {
  const status = opts?.status ?? 'all'
  return paginate<StripeSubscription>(`/subscriptions?status=${status}`)
}

export async function listSubscriptionsForCustomer(customerId: string): Promise<StripeSubscription[]> {
  return paginate<StripeSubscription>(`/subscriptions?customer=${customerId}&status=all`)
}

export async function getCustomer(id: string): Promise<StripeCustomer> {
  return stripeFetch<StripeCustomer>('GET', `/customers/${id}`)
}

export async function listRecentInvoices(opts?: { limit?: number; customer?: string }): Promise<StripeInvoice[]> {
  const limit = opts?.limit ?? 25
  const cust = opts?.customer ? `&customer=${opts.customer}` : ''
  const resp = await stripeFetch<{ data: StripeInvoice[] }>('GET', `/invoices?limit=${limit}${cust}`)
  return resp.data
}

/** Health probe. Returns customer + active-subscription counts. */
export async function testStripeConnection(): Promise<{ ok: boolean; customerSample?: number; activeSubs?: number; error?: string }> {
  try {
    const [custResp, subsResp] = await Promise.all([
      stripeFetch<{ data: StripeCustomer[]; has_more: boolean }>('GET', '/customers?limit=1'),
      stripeFetch<{ data: StripeSubscription[]; has_more: boolean }>('GET', '/subscriptions?status=active&limit=100'),
    ])
    return {
      ok: true,
      customerSample: custResp.data.length,
      activeSubs: subsResp.data.length,
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Derive a per-week dollar amount from a Stripe subscription. */
export function weeklyAmountFromSubscription(sub: StripeSubscription): number {
  let totalCentsPerWeek = 0
  for (const item of sub.items.data) {
    const unit = item.price.unit_amount ?? 0
    const qty = item.quantity ?? 1
    const cents = unit * qty
    const recurring = item.price.recurring
    if (!recurring) continue
    let weeksPerInterval = 1
    switch (recurring.interval) {
      case 'week':  weeksPerInterval = recurring.interval_count; break
      case 'month': weeksPerInterval = recurring.interval_count * (52 / 12); break
      case 'year':  weeksPerInterval = recurring.interval_count * 52; break
      case 'day':   weeksPerInterval = recurring.interval_count / 7; break
    }
    totalCentsPerWeek += cents / weeksPerInterval
  }
  return Math.round(totalCentsPerWeek) / 100
}

/** Bucket a Stripe sub status into a BSC lifecycle stage. */
export function lifecycleFromSubStatus(status: StripeSubscription['status'], cancelAtPeriodEnd: boolean): 'active' | 'trial' | 'paused' | 'past' | 'lost' {
  if (status === 'trialing') return 'trial'
  if (status === 'active') return cancelAtPeriodEnd ? 'paused' : 'active'
  if (status === 'past_due' || status === 'unpaid') return 'active' // still in the funnel, just behind on payment
  if (status === 'paused') return 'paused'
  if (status === 'canceled' || status === 'incomplete_expired') return 'past'
  if (status === 'incomplete') return 'lost'
  return 'past'
}

logger.debug('Stripe wrapper loaded')
