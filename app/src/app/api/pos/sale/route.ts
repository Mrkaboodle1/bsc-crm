// POST /api/pos/sale — record a reception till transaction.
// Body: { items:[{product_id,name,price,qty}], payment_method, discount?, family_id?, notes? }
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

type Item = { product_id?: string; name: string; price: number; qty: number }

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const items: Item[] = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  const subtotal = items.reduce((a, i) => a + Number(i.price || 0) * Number(i.qty || 0), 0)
  const discount = Number(body.discount || 0)
  const total = Math.max(0, subtotal - discount)
  const payment_method = ['cash', 'card', 'account', 'gift', 'other'].includes(body.payment_method) ? body.payment_method : 'cash'

  const admin = createAdminSupabase()
  const { data, error } = await admin.from('sales').insert({
    tenant_id: profile.tenant_id,
    subtotal, discount, total, payment_method,
    staff_user_id: auth.user.id,
    family_id: body.family_id || null,
    items: items.map((i) => ({ product_id: i.product_id ?? null, name: i.name, price: Number(i.price) || 0, qty: Number(i.qty) || 0 })),
    notes: body.notes || null,
  }).select('id, total').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id, total: data.total })
}
