import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { TrendingUp, Users, Calendar, Target, DollarSign } from 'lucide-react'

export const dynamic = 'force-dynamic'

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-AU')

export default async function MrrPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('families').select('lifecycle_stage, weekly_fee_total')
  const fams = (data ?? []) as { lifecycle_stage: string | null; weekly_fee_total: number | null }[]

  const active = fams.filter((f) => f.lifecycle_stage === 'active')
  const weeklySum = active.reduce((a, f) => a + Number(f.weekly_fee_total || 0), 0)
  const members = active.length
  const mrr = weeklySum * 52 / 12
  const arr = weeklySum * 52
  const avgWeekly = members ? weeklySum / members : 0
  const missingFee = active.filter((f) => !Number(f.weekly_fee_total || 0)).length
  const leads = fams.filter((f) => f.lifecycle_stage === 'lead').length
  const trials = fams.filter((f) => f.lifecycle_stage === 'trial').length

  const GOAL = 100
  const pct = Math.min(100, Math.round((members / GOAL) * 100))
  const newAvgWeekly = 30 // new all-year membership entry price
  const projMrr = newAvgWeekly * GOAL * 52 / 12
  const projArr = newAvgWeekly * GOAL * 52

  return (
    <DashboardShell user={user} currentPath="/finance/mrr" pageTitle="Recurring Revenue (MRR)" pageSubtitle="Your predictable monthly income from memberships — the number that grows the business.">
      {/* Headline KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={<DollarSign size={20} />} label="MRR — Monthly Recurring Revenue" value={money(mrr)} tone="red" big />
        <Kpi icon={<Calendar size={20} />} label="ARR — Yearly Recurring Revenue" value={money(arr)} tone="amber" />
        <Kpi icon={<Users size={20} />} label="Active members" value={String(members)} tone="emerald" />
        <Kpi icon={<TrendingUp size={20} />} label="Avg / member / week" value={money(avgWeekly)} tone="zinc" />
      </div>

      {/* Goal progress */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-2"><Target size={18} className="text-[#D72027]" /><h2 className="font-extrabold text-zinc-900">North star — {GOAL} members</h2></div>
        <div className="flex items-end justify-between mb-1">
          <span className="text-sm text-zinc-500">{members} of {GOAL} members</span>
          <span className="text-sm font-extrabold text-[#D72027]">{pct}%</span>
        </div>
        <div className="h-4 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#D72027] to-[#FFC107]" style={{ width: `${pct}%` }} /></div>
        <p className="text-xs text-zinc-500 mt-2">{GOAL - members > 0 ? `${GOAL - members} more members to hit your goal.` : 'Goal reached! 🎉'} You have <strong>{leads.toLocaleString()} leads</strong> and <strong>{trials} trial{trials === 1 ? '' : 's'}</strong> in the pipeline to convert.</p>
      </div>

      {/* Projection */}
      <div className="bg-zinc-950 text-white rounded-2xl p-6 mb-6 max-w-3xl">
        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">What {GOAL} members looks like (new $30 membership)</div>
        <div className="flex flex-wrap gap-8">
          <div><div className="text-3xl font-extrabold">{money(projMrr)}</div><div className="text-xs text-zinc-400 uppercase tracking-wider mt-1">Projected MRR</div></div>
          <div><div className="text-3xl font-extrabold">{money(projArr)}</div><div className="text-xs text-zinc-400 uppercase tracking-wider mt-1">Projected ARR</div></div>
          <div><div className="text-3xl font-extrabold text-emerald-400">+{money(projMrr - mrr)}</div><div className="text-xs text-zinc-400 uppercase tracking-wider mt-1">Extra MRR to gain</div></div>
        </div>
      </div>

      {missingFee > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 max-w-3xl">
          ⚠️ <strong>{missingFee} active member{missingFee === 1 ? ' has' : 's have'} no weekly fee recorded</strong> — so your real MRR may be a little higher. Tidy their fees on each family to make this exact.
        </div>
      )}

      <p className="text-xs text-zinc-400 mt-6 max-w-3xl">MRR = your weekly membership income × 52 ÷ 12. It&apos;s the single most important number for a subscription business — steady MRR is what makes Big Star valuable, fundable and franchisable.</p>
    </DashboardShell>
  )
}

function Kpi({ icon, label, value, tone, big }: { icon: React.ReactNode; label: string; value: string; tone: 'red' | 'amber' | 'emerald' | 'zinc'; big?: boolean }) {
  const tones: Record<string, string> = { red: 'text-[#D72027]', amber: 'text-amber-600', emerald: 'text-emerald-600', zinc: 'text-zinc-700' }
  return (
    <div className={`bg-white rounded-2xl border border-zinc-200 p-5 ${big ? 'ring-2 ring-[#D72027]/20' : ''}`}>
      <div className={`${tones[tone]} mb-2`}>{icon}</div>
      <div className={`${big ? 'text-3xl' : 'text-2xl'} font-extrabold text-zinc-900 leading-none`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-2">{label}</div>
    </div>
  )
}
