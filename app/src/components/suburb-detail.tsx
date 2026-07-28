'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save } from 'lucide-react'
import { band, demandVerdict, scoreVenue, type Suburb } from '@/lib/expansion'
import { VenueEnquiry } from './venue-enquiry'

type Row = Record<string, any>
const TONE: Record<string, string> = { green: 'text-emerald-600', teal: 'text-teal-600', amber: 'text-amber-600', orange: 'text-orange-600', red: 'text-red-600' }
const inp = 'w-full px-2.5 py-1.5 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'
const lbl = 'text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1'

const STATUSES = ['research', 'watch', 'demand_test', 'venue_search', 'launch_ready', 'open', 'rejected']

export function SuburbDetail({ suburb, venues, competitors, community, leads, tasks }: {
  suburb: Suburb & Row; venues: Row[]; competitors: Row[]; community: Row[]; leads: Row[]; tasks: Row[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'facts' | 'venues' | 'rivals' | 'community' | 'demand' | 'tasks'>('facts')
  const [s, setS] = useState<Row>(suburb)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const b = band(s.score)
  const missing: string[] = (s.score_breakdown?.missing as string[]) ?? []
  const breakdown: Record<string, number> = s.score_breakdown ?? {}

  const dv = demandVerdict({
    leads: leads.length,
    trials: leads.filter((l) => ['booked_trial', 'attended', 'joined'].includes(l.outcome)).length,
    attended: leads.filter((l) => ['attended', 'joined'].includes(l.outcome)).length,
    joined: leads.filter((l) => l.outcome === 'joined').length,
  })

  async function saveSuburb() {
    setBusy(true)
    await fetch('/api/expansion?table=suburbs', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, ...numeric(s) }),
    })
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 1800); router.refresh()
  }
  async function addRow(table: string, body: Row) {
    setBusy(true)
    await fetch(`/api/expansion?table=${table}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, suburb_id: s.id }) })
    setBusy(false); router.refresh()
  }
  async function del(table: string, id: string) {
    if (!confirm('Delete this?')) return
    await fetch(`/api/expansion?table=${table}&id=${id}`, { method: 'DELETE' })
    router.refresh()
  }
  const set = (k: string, v: unknown) => setS({ ...s, [k]: v })

  const TABS = [['facts', 'The facts'], ['venues', `Venues (${venues.length})`], ['rivals', `Competitors (${competitors.length})`],
    ['community', `Community (${community.length})`], ['demand', `Demand (${leads.length})`], ['tasks', `Tasks (${tasks.filter(t => !t.done).length})`]] as const

  return (
    <div>
      {/* Score header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-4xl font-black tabular-nums ${TONE[b.tone]}`}>{s.score ?? '–'}</div>
              <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">out of 100</div>
            </div>
            <div>
              <div className={`font-black ${TONE[b.tone]}`}>{b.label}</div>
              <div className="text-xs text-zinc-500">Data confidence: <strong>{s.confidence}</strong></div>
              {missing.length > 0 && <div className="text-xs text-amber-700 mt-0.5">⚠ Needs: {missing.join(', ')}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={s.status} onChange={(e) => set('status', e.target.value)} className="px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm font-bold focus:border-[#D72027] focus:outline-none">
              {STATUSES.map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}
            </select>
            <button onClick={saveSuburb} disabled={busy} className="inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50">
              <Save size={15} /> {saved ? 'Saved' : busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        {Object.keys(breakdown).filter((k) => k !== 'missing').length > 0 && (
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {Object.entries(breakdown).filter(([k]) => k !== 'missing').map(([k, v]) => (
              <span key={k} className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full capitalize">{k}: {v}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1.5 bg-zinc-100 p-1 rounded-xl w-fit mb-4 flex-wrap">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)} className={`text-sm font-bold px-3 py-1.5 rounded-lg ${tab === k ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'}`}>{label}</button>
        ))}
      </div>

      {/* FACTS */}
      {tab === 'facts' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card title="Who lives here">
            <Grid>
              <F label="Children 5–16"><input type="number" value={s.children_5_16 ?? ''} onChange={(e) => set('children_5_16', e.target.value)} className={inp} /></F>
              <F label="Population"><input type="number" value={s.population ?? ''} onChange={(e) => set('population', e.target.value)} className={inp} /></F>
              <F label="Growth %"><input type="number" step="0.1" value={s.population_growth_pct ?? ''} onChange={(e) => set('population_growth_pct', e.target.value)} className={inp} /></F>
              <F label="Median income"><input type="number" value={s.median_income ?? ''} onChange={(e) => set('median_income', e.target.value)} className={inp} /></F>
              <F label="Primary schools"><input type="number" value={s.primary_schools ?? ''} onChange={(e) => set('primary_schools', e.target.value)} className={inp} /></F>
              <F label="High schools"><input type="number" value={s.high_schools ?? ''} onChange={(e) => set('high_schools', e.target.value)} className={inp} /></F>
              <F label="Km from HQ"><input type="number" step="0.1" value={s.distance_km ?? ''} onChange={(e) => set('distance_km', e.target.value)} className={inp} /></F>
              <F label="Drive (pm traffic)"><input type="number" value={s.travel_minutes_pm ?? ''} onChange={(e) => set('travel_minutes_pm', e.target.value)} className={inp} /></F>
              <F label="Homeschool activity"><select value={s.homeschool_activity ?? ''} onChange={(e) => set('homeschool_activity', e.target.value)} className={inp}><option value="">—</option><option>none</option><option>some</option><option>strong</option></select></F>
              <F label="NDIS activity"><select value={s.ndis_activity ?? ''} onChange={(e) => set('ndis_activity', e.target.value)} className={inp}><option value="">—</option><option>none</option><option>some</option><option>strong</option></select></F>
            </Grid>
          </Card>
          <Card title="The problem we solve here">
            <F label="Main problem for families"><textarea rows={2} value={s.main_problem ?? ''} onChange={(e) => set('main_problem', e.target.value)} className={inp} /></F>
            <F label="Evidence"><textarea rows={2} value={s.problem_evidence ?? ''} onChange={(e) => set('problem_evidence', e.target.value)} className={inp} /></F>
            <F label="BigStar's answer"><textarea rows={2} value={s.bigstar_solution ?? ''} onChange={(e) => set('bigstar_solution', e.target.value)} className={inp} /></F>
            <F label="Local marketing message"><textarea rows={2} value={s.marketing_message ?? ''} onChange={(e) => set('marketing_message', e.target.value)} className={inp} /></F>
            <Grid>
              <F label="First program to launch"><input value={s.launch_program ?? ''} onChange={(e) => set('launch_program', e.target.value)} className={inp} /></F>
              <F label="Opening offer"><input value={s.opening_offer ?? ''} onChange={(e) => set('opening_offer', e.target.value)} className={inp} /></F>
            </Grid>
            <F label="Notes"><textarea rows={2} value={s.notes ?? ''} onChange={(e) => set('notes', e.target.value)} className={inp} /></F>
          </Card>
        </div>
      )}

      {/* VENUES */}
      {tab === 'venues' && (
        <List
          rows={venues} table="venues" onDel={del}
          addFields={[['name', 'Venue name *'], ['venue_type', 'Type (hall/church/PCYC…)'], ['address', 'Address'], ['phone', 'Phone'], ['email', 'Email']]}
          onAdd={(v) => addRow('venues', v)}
          render={(v) => {
            const sc = scoreVenue(v)
            const maps = v.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}` : null
            const street = v.address ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(v.address)}` : null
            const council = /council|city of gold coast|bicentennial|community centre|community hall/i.test(`${v.venue_type} ${v.name}`)
            return (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-black text-zinc-900">{v.name}</div>
                    <div className="text-xs text-zinc-500">{v.venue_type}</div>
                    {v.address && <div className="text-xs text-zinc-600 mt-0.5">📍 {v.address}</div>}
                  </div>
                  <div className="text-right shrink-0"><div className="text-xl font-black tabular-nums text-zinc-900">{v.score ?? sc.score}</div><div className="text-[9px] uppercase tracking-wider text-zinc-400">venue score</div></div>
                </div>

                {/* Who runs it + how to reach them, right here */}
                <div className="flex gap-1.5 mt-2 flex-wrap text-[10px] items-center">
                  <Pill tone={council ? 'good' : undefined}>{council ? '🏛 Council-run' : '🔑 Private / other'}</Pill>
                  {v.rate_nonprofit != null && <Pill tone="good">${v.rate_nonprofit}/hr community rate</Pill>}
                  {v.rate_casual != null && <Pill>${v.rate_casual}/hr casual</Pill>}
                  {v.ceiling_height_m && <Pill>{v.ceiling_height_m}m ceiling</Pill>}
                  {v.ok_aerial && <Pill tone="good">aerial ok</Pill>}
                  <Pill>{String(v.contact_status || 'not contacted').replace(/_/g, ' ')}</Pill>
                </div>

                <div className="flex gap-2 mt-2 flex-wrap text-xs">
                  {v.phone && <a href={`tel:${String(v.phone).replace(/\s/g, '')}`} className="font-bold text-[#D72027] hover:underline">📞 {v.phone}</a>}
                  {v.email && <a href={`mailto:${v.email}`} className="font-bold text-[#D72027] hover:underline">✉️ {v.email}</a>}
                  {v.website && <a href={v.website} target="_blank" rel="noreferrer" className="font-bold text-[#D72027] hover:underline">🔗 Venue page</a>}
                  {maps && <a href={maps} target="_blank" rel="noreferrer" className="font-bold text-blue-600 hover:underline">🗺 Map</a>}
                  {street && <a href={street} target="_blank" rel="noreferrer" className="font-bold text-blue-600 hover:underline">👁 Street View</a>}
                </div>

                {v.contact_name && <div className="text-xs text-zinc-500 mt-1">Contact: <strong>{v.contact_name}</strong></div>}
                {v.existing_classes && <div className="text-xs text-zinc-500 mt-1">Already runs: {v.existing_classes}</div>}
                {v.notes && <div className="text-xs text-zinc-600 mt-1.5 bg-zinc-50 rounded-lg px-2.5 py-1.5">{v.notes}</div>}
                {(v.needs_confirmation || sc.missing.length > 0) && (
                  <div className="text-[10px] text-amber-700 mt-1.5">⚠ Ask them: {v.needs_confirmation || sc.missing.join(', ')}</div>
                )}
                <VenueEnquiry venue={v} suburb={s.name} />
              </>
            )
          }}
        />
      )}

      {/* COMPETITORS */}
      {tab === 'rivals' && (
        <List rows={competitors} table="competitors" onDel={del}
          addFields={[['name', 'Business name *'], ['category', 'Category (gymnastics/dance…)'], ['website', 'Website'], ['pricing', 'Pricing'], ['pressure_score', 'Pressure 0–10']]}
          onAdd={(v) => addRow('competitors', { ...v, pressure_score: v.pressure_score ? Number(v.pressure_score) : null })}
          render={(c) => (
            <>
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-black text-zinc-900">{c.name}</div><div className="text-xs text-zinc-500">{[c.category, c.pricing].filter(Boolean).join(' · ')}</div></div>
                {c.pressure_score != null && <div className="text-right"><div className="text-xl font-black tabular-nums text-zinc-900">{c.pressure_score}</div><div className="text-[9px] uppercase tracking-wider text-zinc-400">pressure</div></div>}
              </div>
              {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="text-xs text-[#D72027] hover:underline">{c.website}</a>}
            </>
          )}
        />
      )}

      {/* COMMUNITY */}
      {tab === 'community' && (
        <List rows={community} table="community" onDel={del}
          addFields={[['name', 'Group / page name *'], ['platform', 'Platform'], ['link', 'Link'], ['audience_size', 'Audience size'], ['usefulness', 'Usefulness 0–10']]}
          onAdd={(v) => addRow('community', { ...v, audience_size: v.audience_size ? Number(v.audience_size) : null, usefulness: v.usefulness ? Number(v.usefulness) : null })}
          render={(g) => (
            <>
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-black text-zinc-900">{g.name}</div><div className="text-xs text-zinc-500">{[g.platform, g.audience_size ? `${Number(g.audience_size).toLocaleString()} members` : null].filter(Boolean).join(' · ')}</div></div>
                {g.usefulness != null && <div className="text-lg font-black tabular-nums text-zinc-900">{g.usefulness}<span className="text-[10px] text-zinc-400">/10</span></div>}
              </div>
              {g.link && <a href={g.link} target="_blank" rel="noreferrer" className="text-xs text-[#D72027] hover:underline break-all">{g.link}</a>}
              <div className="text-[10px] text-zinc-400 mt-1">Access: {String(g.access_status || 'not joined').replace('_', ' ')} · never bypass a private group — request to join.</div>
            </>
          )}
        />
      )}

      {/* DEMAND */}
      {tab === 'demand' && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <List rows={leads} table="leads" onDel={del}
              addFields={[['parent_name', 'Parent name'], ['email', 'Email'], ['phone', 'Phone'], ['child_age', 'Child age'], ['preferred_day', 'Preferred day']]}
              onAdd={(v) => addRow('leads', { ...v, child_age: v.child_age ? Number(v.child_age) : null, stage: 'organic', outcome: 'interested' })}
              render={(l) => (
                <div className="flex items-center justify-between gap-2">
                  <div><div className="font-bold text-zinc-900">{l.parent_name || l.email || 'Lead'}</div><div className="text-xs text-zinc-500">{[l.child_age ? `child ${l.child_age}` : null, l.preferred_day, l.phone].filter(Boolean).join(' · ')}</div></div>
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">{String(l.outcome || '').replace('_', ' ')}</span>
                </div>
              )}
            />
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 h-fit">
            <h3 className="font-black text-zinc-900 mb-1">Go / no-go</h3>
            <p className={`text-sm font-black mb-3 ${dv.verdict === 'pass' ? 'text-emerald-600' : dv.verdict === 'promising' ? 'text-amber-600' : 'text-zinc-500'}`}>
              {dv.verdict === 'pass' ? '✅ Thresholds met' : dv.verdict === 'promising' ? '🟡 Promising' : '⬜ Not yet'} — {dv.passed}/{dv.total}
            </p>
            <ul className="space-y-2 text-sm">
              {dv.checks.map((c) => (
                <li key={c.label} className="flex justify-between border-b border-zinc-100 pb-1.5">
                  <span className={c.got >= c.need ? 'text-emerald-700 font-semibold' : 'text-zinc-600'}>{c.got >= c.need ? '✓' : '○'} {c.label}</span>
                  <span className="font-black tabular-nums">{c.got}/{c.need}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TASKS */}
      {tab === 'tasks' && (
        <List rows={tasks} table="tasks" onDel={del}
          addFields={[['title', 'What needs doing *'], ['due_on', 'Due (YYYY-MM-DD)']]}
          onAdd={(v) => addRow('tasks', { ...v, due_on: v.due_on || null })}
          render={(t) => (
            <div className="flex items-center gap-2">
              <span className={t.done ? 'line-through text-zinc-400' : 'font-bold text-zinc-900'}>{t.title}</span>
              {t.due_on && <span className="text-xs text-zinc-400 ml-auto">due {t.due_on}</span>}
            </div>
          )}
        />
      )}
    </div>
  )
}

// numbers arrive from inputs as strings — coerce the numeric columns back
function numeric(s: Row): Row {
  const nums = ['population', 'children_5_16', 'population_growth_pct', 'primary_schools', 'high_schools', 'childcare_centres', 'oshc_providers', 'median_income', 'family_household_pct', 'distance_km', 'travel_minutes_pm']
  const out: Row = { ...s }
  delete out.score_breakdown; delete out.created_at; delete out.updated_at; delete out.tenant_id
  for (const k of nums) out[k] = out[k] === '' || out[k] == null ? null : Number(out[k])
  return out
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-zinc-200 p-5"><h3 className="font-black text-zinc-900 mb-3">{title}</h3><div className="space-y-3">{children}</div></div>
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3">{children}</div> }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className={lbl}>{label}</label>{children}</div> }
function Pill({ children, tone }: { children: React.ReactNode; tone?: 'good' }) {
  return <span className={`px-2 py-0.5 rounded-full font-bold ${tone === 'good' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>{children}</span>
}

function List({ rows, table, addFields, onAdd, onDel, render }: {
  rows: Row[]; table: string; addFields: [string, string][]
  onAdd: (v: Row) => void; onDel: (t: string, id: string) => void; render: (r: Row) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Row>({})
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-3.5 py-2 rounded-xl mb-3">
        <Plus size={15} /> Add
      </button>
      {open && (
        <div className="bg-white rounded-2xl border-2 border-[#D72027]/25 p-4 mb-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {addFields.map(([k, label]) => (
              <input key={k} placeholder={label} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={inp} />
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { onAdd(v); setV({}); setOpen(false) }} className="bg-[#D72027] text-white font-bold text-sm px-4 py-2 rounded-lg">Save</button>
            <button onClick={() => setOpen(false)} className="text-sm font-semibold text-zinc-500 px-3">Cancel</button>
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500 text-sm">Nothing here yet.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-zinc-200 p-4 relative group">
              {render(r)}
              <button onClick={() => onDel(table, r.id)} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
