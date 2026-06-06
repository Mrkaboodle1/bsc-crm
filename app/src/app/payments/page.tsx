import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CreditCard, TrendingUp, Users, CheckCircle2 } from 'lucide-react'

export default async function PaymentsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('families')
    .select('id, family_name, primary_parent, weekly_fee_total, stripe_customer_id, lifecycle_stage, tags')
    .limit(5000)
  const fams = (data ?? []).filter((f) => !(f.tags ?? []).includes('from-roll-sheet'))

  const paying = fams.filter((f) => (Number(f.weekly_fee_total) || 0) > 0)
  const weekly = paying.reduce((s, f) => s + (Number(f.weekly_fee_total) || 0), 0)
  const monthly = weekly * 4.33
  const annual = weekly * 52
  const onStripe = fams.filter((f) => f.stripe_customer_id).length
  const avg = paying.length ? weekly / paying.length : 0

  const top = [...paying].sort((a, b) => (Number(b.weekly_fee_total) || 0) - (Number(a.weekly_fee_total) || 0)).slice(0, 12)

  return (
    <DashboardShell user={user} currentPath="/payments" pageTitle="Finance" pageSubtitle="Your recurring revenue at a glance — from live subscription data.">
      <div className="space-y-6 max-w-5xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={<TrendingUp size={16} />} label="Weekly revenue" value={`$${weekly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent />
          <Kpi icon={<CreditCard size={16} />} label="Monthly (est.)" value={`$${monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <Kpi icon={<TrendingUp size={16} />} label="Annual (est.)" value={`$${annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <Kpi icon={<Users size={16} />} label="Paying families" value={paying.length.toLocaleString()} accent />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Mini label="Avg / family / week" value={`$${avg.toFixed(0)}`} />
          <Mini label="On card (Stripe)" value={`${onStripe}`} />
          <Mini label="Active subscriptions" value={`${paying.filter((f) => f.lifecycle_stage === 'active').length}`} />
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Top paying families</span>
            <a href="https://dashboard.stripe.com" target="_blank" className="text-xs font-semibold text-[#D72027] hover:underline">Open Stripe →</a>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-zinc-50">
              {top.map((f) => (
                <tr key={f.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3"><a href={`/contacts/${f.id}`} className="font-medium text-zinc-800 hover:text-[#D72027]">{f.primary_parent || f.family_name}</a></td>
                  <td className="px-3 py-3">{f.stripe_customer_id ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={12} /> Stripe</span> : <span className="text-[11px] text-zinc-400">manual</span>}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">${Number(f.weekly_fee_total).toFixed(0)}<span className="text-xs text-zinc-400">/wk</span></td>
                </tr>
              ))}
              {top.length === 0 && <tr><td className="px-5 py-10 text-center text-zinc-400">No paying families recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm">
          Detailed invoices, failed-payment recovery and GST reports arrive when we connect <strong>Xero</strong> (next on your integrations list). These figures come live from each family&apos;s subscription.
        </div>
      </div>
    </DashboardShell>
  )
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'bg-[#D72027] border-[#D72027] text-white' : 'bg-white border-zinc-200'}`}>
      <div className={`flex items-center gap-1.5 text-xs ${accent ? 'text-white/80' : 'text-zinc-400'}`}>{icon}{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${accent ? '' : 'text-zinc-900'}`}>{value}</div>
    </div>
  )
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div className="bg-white rounded-xl border border-zinc-200 p-4"><div className="text-xl font-bold text-zinc-900">{value}</div><div className="text-xs text-zinc-500 mt-0.5">{label}</div></div>
}
