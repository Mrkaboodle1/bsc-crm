import 'server-only'

// Fetch a contact's Stripe payment history — subscriptions AND one-off payments
// (School Holiday Workshops, Kids Night Out, trials, etc.). By customer id when we
// have it, otherwise by billing email. Read-only, best-effort (never throws).
const KEY = process.env.STRIPE_SECRET_KEY
export const STRIPE_ACCOUNT = 'acct_1KHe8gFzV0h5dzJF'
export const customerLink = (id: string | null | undefined) => id ? `https://dashboard.stripe.com/${STRIPE_ACCOUNT}/customers/${id}` : null
export const paymentLink = (pi: string | null | undefined) => pi ? `https://dashboard.stripe.com/${STRIPE_ACCOUNT}/payments/${pi}` : null

export type ContactPayment = { id: string; amount: number; currency: string; description: string | null; status: string; created: number; refunded: boolean; link: string | null }

// Stripe's charge search doesn't allow filtering by email, so this only pulls charges
// for a known Stripe customer (subscribers). One-off SHW/KNO payments are read from the
// CRM's own workshop_bookings in the contact page and merged in there.
export async function getContactPayments(opts: { customerId?: string | null }): Promise<ContactPayment[]> {
  if (!KEY || !opts.customerId) return []
  try {
    const url = `https://api.stripe.com/v1/charges?customer=${encodeURIComponent(opts.customerId)}&limit=30`
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + KEY } })
    if (!r.ok) return []
    const d = await r.json()
    return (d.data || [])
      .map((c: Record<string, unknown>) => ({
        id: c.id as string,
        amount: (c.amount as number) / 100,
        currency: (c.currency as string) || 'aud',
        description: (c.description as string) || null,
        status: c.status as string,
        created: c.created as number,
        refunded: ((c.amount_refunded as number) || 0) > 0,
        link: paymentLink(c.payment_intent as string) || customerLink(c.customer as string),
      }))
      .filter((c: ContactPayment) => c.status === 'succeeded')
      .sort((a: ContactPayment, b: ContactPayment) => b.created - a.created)
  } catch {
    return []
  }
}
