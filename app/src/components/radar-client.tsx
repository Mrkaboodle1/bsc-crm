'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Calculator, ListChecks, MapPin, Loader2 } from 'lucide-react'
import { band, modelSatellite, DEFAULT_FINANCE, PLAYBOOK, DEMAND_THRESHOLDS, type Suburb, type FinanceInputs } from '@/lib/expansion'

type Counts = Record<string, { venues: number; competitors: number; community: number; leads: number }>

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  open:         { label: 'Open',        cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  launch_ready: { label: 'Launch ready',cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  demand_test:  { label: 'Demand test', cls: 'bg-amber-50 text-amber-800 border-amber-200',       dot: 'bg-amber-400' },
  venue_search: { label: 'Venue search',cls: 'bg-orange-50 text-orange-800 border-orange-200',    dot: 'bg-orange-500' },
  watch:        { label: 'Watch',       cls: 'bg-blue-50 text-blue-800 border-blue-200',          dot: 'bg-blue-400' },
  research:     { label: 'Research',    cls: 'bg-zinc-50 text-zinc-600 border-zinc-200',          dot: 'bg-zinc-400' },
  rejected:     { label: 'Rejected',    cls: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500' },
}
const TONE: Record<string, string> = { green: 'text-emerald-600', teal: 'text-teal-600', amber: 'text-amber-600', orange: 'text-orange-600', red: 'text-red-600' }
const money = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-AU')

export function RadarClient({ suburbs, counts }: { suburbs: Suburb[]; counts: Counts }) {
  const router = useRouter()
  const [tab, setTab] = useState<'radar' | 'money' | 'playbook'>('radar')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', region: 'Gold Coast', postcode: '', lga: '' })
  const [fin, setFin] = useState<FinanceInputs>(DEFAULT_FINANCE)
  const m = modelSatellite(fin)

  async function addSuburb() {
    if (!form.name.trim()) return
    setBusy(true)
    await fetch('/api/expansion?table=suburbs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, status: 'research', confidence: 'low' }),
    })
    setBusy(false); setAdding(false); setForm({ name: '', region: 'Gold Coast', postcode: '', lga: '' })
    router.refresh()
  }

  const num = (k: keyof FinanceInputs) => (
    <input type="number" value={fin[k]} onChange={(e) => setFin({ ...fin, [k]: parseFloat(e.target.value) || 0 })}
      className="w-full px-2.5 py-1.5 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none tabular-nums" />
  )

  return (
    <div>
      <div className="flex gap-1.5 bg-zinc-100 p-1 rounded-xl w-fit mb-5">
        {([['radar', 'Radar', MapPin], ['money', 'Money model', Calculator], ['playbook', 'Launch playbook', ListChecks]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 text-sm font-bold px-3.5 py-2 rounded-lg ${tab === k ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── RADAR ── */}
      {tab === 'radar' && (
        <>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-sm text-zinc-500 max-w-2xl">
              Each suburb is scored out of 100 on child population, demand-test results, venues, competition, community reach,
              money, travel and inclusion. <strong>85+ = launch priority.</strong> Nothing scores well until the demand test is run.
            </p>
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-3.5 py-2.5 rounded-xl shrink-0">
              <Plus size={15} /> Add a suburb
            </button>
          </div>

          {adding && (
            <div className="bg-white rounded-2xl border-2 border-[#D72027]/25 p-4 mb-4">
              <div className="grid sm:grid-cols-4 gap-2">
                <input autoFocus placeholder="Suburb *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />
                <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none">
                  {['Gold Coast', 'Beenleigh & Logan', 'Ipswich', 'Brisbane', 'Northern NSW'].map((r) => <option key={r}>{r}</option>)}
                </select>
                <input placeholder="Postcode" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} className="px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />
                <input placeholder="Council / LGA" value={form.lga} onChange={(e) => setForm({ ...form, lga: e.target.value })} className="px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={addSuburb} disabled={busy} className="bg-[#D72027] text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50">{busy ? 'Adding…' : 'Add to radar'}</button>
                <button onClick={() => setAdding(false)} className="text-sm font-semibold text-zinc-500 px-3">Cancel</button>
              </div>
            </div>
          )}

          {suburbs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center">
              <div className="text-4xl mb-2">📡</div>
              <p className="font-bold text-zinc-700">Nothing on the radar yet.</p>
              <p className="text-sm text-zinc-500 mt-1">Start with the pilot three: <strong>Robina</strong>, <strong>Nerang</strong>, <strong>Coomera</strong>.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {suburbs.map((s) => {
                const b = band(s.score)
                const st = STATUS[s.status] ?? STATUS.research!
                const c = counts[s.id] ?? { venues: 0, competitors: 0, community: 0, leads: 0 }
                const missing = (s.score_breakdown as { missing?: string[] } | null)?.missing ?? []
                return (
                  <a key={s.id} href={`/expansion/${s.id}`} className="bg-white rounded-2xl border border-zinc-200 p-4 hover:border-[#D72027] hover:shadow-sm transition block">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-black text-zinc-900 truncate">{s.name}</div>
                        <div className="text-[11px] text-zinc-400">{[s.region, s.postcode].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-2xl font-black tabular-nums ${TONE[b.tone]}`}>{s.score ?? '–'}</div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">/100</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${st.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                      </span>
                      <span className={`text-[10px] font-bold ${TONE[b.tone]}`}>{b.label}</span>
                      <span className="text-[10px] text-zinc-400">· confidence {s.confidence}</span>
                    </div>
                    {/* A zero here almost always means "nobody has looked yet",
                        not "there is nothing there" — say so, or the card reads
                        like a suburb with no competition when it's just unresearched. */}
                    <div className="grid grid-cols-4 gap-1 mt-3 text-center">
                      {([['Venues', c.venues], ['Rivals', c.competitors], ['Groups', c.community], ['Leads', c.leads]] as const).map(([l, n]) => (
                        <div key={l} className={`rounded-lg py-1.5 ${n ? 'bg-zinc-50' : 'bg-amber-50/70'}`}>
                          <div className={`text-sm font-black tabular-nums ${n ? 'text-zinc-800' : 'text-amber-600/70'}`}>{n || '–'}</div>
                          <div className={`text-[9px] font-bold uppercase tracking-wide ${n ? 'text-zinc-400' : 'text-amber-600/70'}`}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {c.venues + c.competitors + c.community + c.leads === 0 && (
                      <div className="mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 rounded px-2 py-1">
                        🔍 Not researched yet — a dash means unknown, not &ldquo;none here&rdquo;
                      </div>
                    )}
                    {missing.length > 0 && <div className="mt-2 text-[10px] text-amber-700">⚠ still needed: {missing.slice(0, 2).join(', ')}{missing.length > 2 ? `, +${missing.length - 2}` : ''}</div>}
                  </a>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── MONEY MODEL ── */}
      {tab === 'money' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h3 className="font-black text-zinc-900 mb-1">Satellite money model</h3>
            <p className="text-sm text-zinc-500 mb-4">Change any number — the answer updates instantly. Defaults assume a non-profit hall rate.</p>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Hall rate $/hr">{num('hallRate')}</Field>
              <Field label="Hall hours/week">{num('hoursPerWeek')}</Field>
              <Field label="Coach $/hr">{num('coachRate')}</Field>
              <Field label="Assistant $/hr">{num('assistantRate')}</Field>
              <Field label="Coach travel hrs/wk">{num('coachTravelHours')}</Field>
              <Field label="Km driven/week">{num('kmPerWeek')}</Field>
              <Field label="Fee per student $/wk">{num('feePerStudent')}</Field>
              <Field label="Students">{num('students')}</Field>
              <Field label="Equipment (one-off)">{num('equipmentOnce')}</Field>
              <Field label="Marketing $/wk">{num('marketingPerWeek')}</Field>
            </div>
          </div>
          <div className="space-y-3">
            <div className={`rounded-2xl p-5 text-white ${m.weeklyMargin > 0 ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-red-600 to-red-800'}`}>
              <div className="text-[11px] font-black uppercase tracking-widest opacity-80">Weekly contribution</div>
              <div className="text-4xl font-black tabular-nums mt-1">{money(m.weeklyMargin)}</div>
              <div className="text-sm opacity-90 mt-1">{money(m.monthlyProfit)}/month · {money(m.annualProfit)}/year</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Break-even students" value={String(m.breakEvenStudents)} warn={m.breakEvenStudents > fin.students} />
              <Stat label="Risk" value={m.risk.toUpperCase()} warn={m.risk !== 'low'} />
              <Stat label="Revenue per hall hour" value={money(m.revenuePerHallHour)} />
              <Stat label="Margin per student" value={money(m.perStudentMargin)} />
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-2">Where the money goes each week</div>
              {Object.entries(m.breakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-1 border-b border-zinc-100 last:border-0">
                  <span className="capitalize text-zinc-600">{k}</span><span className="font-bold tabular-nums">{money(v)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 font-black">
                <span>Revenue</span><span className="tabular-nums text-emerald-600">{money(m.revenue)}</span>
              </div>
            </div>
            {m.paybackWeeks && <p className="text-xs text-zinc-500">Equipment pays for itself in about <strong>{m.paybackWeeks} weeks</strong>.</p>}
          </div>
        </div>
      )}

      {/* ── PLAYBOOK ── */}
      {tab === 'playbook' && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-5">
            <h3 className="font-black text-zinc-900 mb-1">The BigStar launch playbook</h3>
            <p className="text-sm text-zinc-500 mb-4">Same 15 steps every time. That&apos;s what makes it repeatable across five locations.</p>
            <ol className="space-y-2.5">
              {PLAYBOOK.map((p) => (
                <li key={p.step} className="flex gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#D72027]/10 text-[#D72027] text-xs font-black flex items-center justify-center shrink-0">{p.step}</span>
                  <div><div className="font-bold text-zinc-800 text-sm">{p.title}</div><div className="text-xs text-zinc-500">{p.detail}</div></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 h-fit">
            <h3 className="font-black text-zinc-900 mb-1">Go / no-go thresholds</h3>
            <p className="text-sm text-zinc-500 mb-3">A venue being free is <em>not</em> a reason to open. These are.</p>
            <ul className="space-y-2 text-sm">
              {Object.entries({
                'Qualified expressions of interest': DEMAND_THRESHOLDS.qualifiedLeads,
                'Trial bookings': DEMAND_THRESHOLDS.trialBookings,
                'Actually turned up': DEMAND_THRESHOLDS.attendees,
                'Paid founding members': DEMAND_THRESHOLDS.foundingMembers,
                'Students by 6 months': DEMAND_THRESHOLDS.studentsBy6Months,
                'Students by 18 months': DEMAND_THRESHOLDS.studentsBy18Months,
              }).map(([k, v]) => (
                <li key={k} className="flex justify-between border-b border-zinc-100 pb-1.5">
                  <span className="text-zinc-600">{k}</span><span className="font-black tabular-nums">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">{label}</label>{children}</div>
}
function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white'}`}>
      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-xl font-black tabular-nums mt-0.5 ${warn ? 'text-amber-700' : 'text-zinc-900'}`}>{value}</div>
    </div>
  )
}
