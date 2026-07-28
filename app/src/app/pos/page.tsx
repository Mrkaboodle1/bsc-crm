import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getProducts, getTodaySales } from '@/lib/pos'
import { PosTill } from '@/components/pos-till'

export const dynamic = 'force-dynamic'

export default async function PosPage() {
  const user = await verifySession()
  const products = await getProducts({ posOnly: true })
  const today = await getTodaySales()
  const canManage = ['owner', 'manager'].includes(user.role)

  return (
    <DashboardShell user={user} currentPath="/pos" pageTitle="Reception Till" pageSubtitle="Ring up merch, casual classes, tickets and passes.">
      {products === null ? (
        <SetupNeeded />
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center">
          <div className="text-4xl mb-3">🛍️</div>
          <h2 className="font-extrabold text-zinc-900 mb-1">No products yet</h2>
          <p className="text-sm text-zinc-500">{canManage ? 'Add your first product with “Manage products”.' : 'Ask the owner to add products to the till.'}</p>
        </div>
      ) : (
        <PosTill products={products} canManage={canManage} todayCount={today?.count ?? 0} todayTotal={today?.total ?? 0} />
      )}
    </DashboardShell>
  )
}

function SetupNeeded() {
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 max-w-2xl">
      <div className="text-3xl mb-2">🛠️</div>
      <h2 className="font-extrabold text-zinc-900 text-lg mb-2">One-time setup needed</h2>
      <p className="text-sm text-zinc-700 mb-3">The till needs its database tables created. Jacky has the setup file ready (<code className="bg-white px-1.5 py-0.5 rounded text-xs">schema/016_pos_memberships.sql</code>) — paste it into Supabase once and this page goes live with your products.</p>
      <p className="text-xs text-zinc-500">After it’s applied, refresh this page.</p>
    </div>
  )
}
