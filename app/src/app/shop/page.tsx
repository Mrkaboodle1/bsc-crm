import { Storefront } from '@/components/storefront'
import { PRODUCTS, type Product } from '@/lib/store-products'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Public shop. Reads the default tenant's catalogue + branding from the DB,
// falling back to the built-in starter products if the table isn't set up yet.
export default async function ShopPage() {
  let products: Product[] = PRODUCTS
  let bizName = 'Big Star Circus'
  let location = ''
  let website = ''
  try {
    const sb = await createServerSupabaseAdmin()
    const { data: tenant } = await sb.from('tenants').select('id, name, address, website').order('created_at').limit(1).maybeSingle()
    if (tenant) {
      bizName = tenant.name || bizName
      location = tenant.address || ''
      website = (tenant.website || '').replace(/^https?:\/\//, '')
      const { data: rows } = await sb.from('products')
        .select('id, name, description, price, emoji').eq('tenant_id', tenant.id).eq('active', true).eq('in_shop', true).order('sort')
      if (rows && rows.length) {
        products = rows.map((r) => ({ id: r.id, name: r.name, price: Number(r.price), blurb: r.description ?? '', emoji: r.emoji ?? '🏷️' }))
      }
    }
  } catch { /* fall back to starter products */ }

  const footer = [bizName, location, website].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎪</div>
          <h1 className="text-3xl font-extrabold text-zinc-900">{bizName} Shop</h1>
          <p className="text-zinc-600 mt-1">Class passes, workshops, show tickets & merch.</p>
        </div>
        <Storefront products={products} businessName={bizName} />
        <p className="text-center text-xs text-zinc-400 mt-8">{footer}</p>
      </div>
    </div>
  )
}
