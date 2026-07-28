import 'server-only'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

export type Product = {
  id: string; name: string; description: string | null; price: number
  category: string; emoji: string | null; image_url: string | null
  in_shop: boolean; in_pos: boolean; active: boolean; sort: number
}
export type MembershipPlan = {
  id: string; name: string; description: string | null; price: number
  billing_period: string; perks: string[]; class_credits: number | null
  active: boolean; sort: number
}
export type Sale = {
  id: string; sold_at: string; total: number; payment_method: string
  items: Array<{ name: string; price: number; qty: number }>
}

// Returns null when the POS tables haven't been created yet (graceful setup state).
function missing(msg?: string) { return !!msg && (msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache')) }

export async function getProducts(opts: { posOnly?: boolean; shopOnly?: boolean } = {}): Promise<Product[] | null> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  let q = supabase.from('products')
    .select('id, name, description, price, category, emoji, image_url, in_shop, in_pos, active, sort')
    .eq('tenant_id', user.tenantId).eq('active', true).order('sort').order('name')
  if (opts.posOnly) q = q.eq('in_pos', true)
  if (opts.shopOnly) q = q.eq('in_shop', true)
  const { data, error } = await q
  if (error) return missing(error.message) ? null : []
  return (data ?? []) as Product[]
}

export async function getMembershipPlans(): Promise<MembershipPlan[] | null> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('membership_plans')
    .select('id, name, description, price, billing_period, perks, class_credits, active, sort')
    .eq('tenant_id', user.tenantId).order('sort').order('name')
  if (error) return missing(error.message) ? null : []
  return (data ?? []) as MembershipPlan[]
}

export async function getTodaySales(): Promise<{ count: number; total: number; sales: Sale[] } | null> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase.from('sales')
    .select('id, sold_at, total, payment_method, items')
    .eq('tenant_id', user.tenantId).gte('sold_at', start.toISOString())
    .order('sold_at', { ascending: false })
  if (error) return missing(error.message) ? null : { count: 0, total: 0, sales: [] }
  const sales = (data ?? []) as Sale[]
  return { count: sales.length, total: sales.reduce((a, s) => a + Number(s.total || 0), 0), sales }
}
