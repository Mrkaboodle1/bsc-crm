import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CopyButton } from '@/components/copy-button'
import { PRODUCTS } from '@/lib/store-products'
import { ExternalLink } from 'lucide-react'

const BASE = 'https://app-chi-silk-29.vercel.app'

export default async function StorePage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  // Orders arrive as notes with a store- form slug.
  const { data: orders } = await supabase
    .from('pending_actions').select('id, draft_subject, draft_body, draft_recipient, created_at')
    .eq('kind', 'note').ilike('draft_subject', '%store-%')
    .order('created_at', { ascending: false }).limit(20)

  return (
    <DashboardShell
      user={user}
      currentPath="/marketing/store"
      pageTitle="Store"
      pageSubtitle="Sell passes, tickets and merch — orders land in your CRM."
      pageActions={
        <a href={`${BASE}/shop`} target="_blank" className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg"><ExternalLink size={15} /> View shop</a>
      }
    >
      <div className="space-y-6 max-w-4xl">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-zinc-600">Your shop is live at <a href={`${BASE}/shop`} target="_blank" className="font-semibold text-[#D72027]">{BASE.replace('https://', '')}/shop</a></div>
          <CopyButton text={`${BASE}/shop`} label="Copy shop link" />
        </div>

        <div>
          <h3 className="font-semibold text-zinc-900 mb-3">Products ({PRODUCTS.length})</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRODUCTS.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 min-w-0"><div className="font-semibold text-sm text-zinc-900 truncate">{p.name}</div><div className="text-xs text-zinc-500">${p.price}{p.unit ? `/${p.unit}` : ''}</div></div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">To add or change products, just tell Jacky. Card checkout (Stripe) can be switched on next.</p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 text-xs font-bold uppercase tracking-wide text-zinc-500">Recent orders ({orders?.length ?? 0})</div>
          {(orders?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">No orders yet — share your shop link to start selling.</div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {(orders ?? []).map((o) => (
                <li key={o.id} className="px-5 py-3">
                  <div className="text-sm text-zinc-800 whitespace-pre-wrap">{(o.draft_body ?? '').replace(/^New .*submission\.\n?/, '')}</div>
                  <div className="text-[11px] text-zinc-400 mt-1">{o.draft_recipient || ''} · {o.created_at ? new Date(o.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane' }) : ''}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
