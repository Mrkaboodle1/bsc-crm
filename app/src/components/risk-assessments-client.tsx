'use client'

import { useState } from 'react'
import { Plus, Trash2, Printer, ChevronLeft, Save, ShieldAlert } from 'lucide-react'

type Hazard = { hazard: string; who: string; risk: string; controls: string }
type Content = { location?: string; assessor?: string; date?: string; review_date?: string; description?: string; hazards?: Hazard[] }
export type RA = { id: string; title: string; activity_type: string | null; content: Content; updated_at: string }

const LOC = 'Big Star Circus — Molendinar, Gold Coast'
const h = (hazard: string, who: string, risk: string, controls: string): Hazard => ({ hazard, who, risk, controls })

// The 8 standard starter templates — fully editable after creation.
const DEFAULTS: Array<{ title: string; activity_type: string; content: Content }> = [
  { title: 'Circus Skills', activity_type: 'circus', content: { location: LOC, description: 'General circus skills (juggling, balance, props, acro).', hazards: [
    h('Trips/collisions with equipment', 'Students/Coaches', 'Medium', 'Clear, defined activity zones; equipment packed away when not in use; coach supervision.'),
    h('Prop strikes (juggling/clubs)', 'Students', 'Low', 'Spacing between students; soft props for beginners; eye contact before passing.'),
    h('Slips/falls on floor', 'Students', 'Low', 'Clean, dry, non-slip floor; bare feet/grip socks; spills cleaned immediately.'),
    h('Overexertion/strain', 'Students', 'Low', 'Warm-up every session; age-appropriate progressions.'),
  ] } },
  { title: 'Aerial', activity_type: 'aerial', content: { location: LOC, description: 'Aerial silks, hoop, trapeze, straps.', hazards: [
    h('Falls from height', 'Students', 'High', 'Crash mats under all apparatus; coach spotting; strict height progression; 1:small-group ratio.'),
    h('Equipment/rigging failure', 'Students/Coaches', 'High', 'Daily visual rig inspection; certified rigging & hardware; documented load ratings; periodic engineer check.'),
    h('Entanglement', 'Students', 'Medium', 'Hair tied back; no loose clothing/jewellery; coach line of sight at all times.'),
    h('Friction burns/grip loss', 'Students', 'Low', 'Technique coaching; grip aids; chalk; no oils/lotions before class.'),
  ] } },
  { title: 'Gymnastics', activity_type: 'gymnastics', content: { location: LOC, description: 'Tumbling, beam, floor and conditioning.', hazards: [
    h('Falls/poor landings', 'Students', 'High', 'Matting; coach spotting; skill progression; no unsupervised new skills.'),
    h('Overstretch/muscle strain', 'Students', 'Medium', 'Structured warm-up & cool-down; coach-led stretching; respect individual limits.'),
    h('Collisions', 'Students', 'Medium', 'One-at-a-time on apparatus; clear queues; defined run-up lanes.'),
  ] } },
  { title: 'School Holiday Workshop', activity_type: 'shw', content: { location: LOC, description: 'Full-day holiday program, 9am–3pm.', hazards: [
    h('Drop-off / pick-up / wrong adult', 'Children', 'Medium', 'Sign in & out; child only released to parent or person named at booking; ID check if unsure.'),
    h('Allergies / medical event', 'Children', 'High', 'Collect medical & allergy info at booking; allergy action plans on hand; first-aid trained staff; nut-aware.'),
    h('Lost / wandering child', 'Children', 'Medium', 'Regular headcounts; supervision ratios; doors monitored; roll marked on the day.'),
    h('Craft tools (scissors/glue)', 'Children', 'Low', 'Age-appropriate tools; supervision; safe storage.'),
    h('Fatigue/overheating', 'Children', 'Low', 'Water breaks; shaded/cool indoor space; rest periods.'),
  ] } },
  { title: 'Kids Night Out', activity_type: 'kno', content: { location: LOC, description: 'Evening disco + circus games + pizza + movie.', hazards: [
    h('Low light / disco lighting', 'Children', 'Medium', 'Stairs, exits and walkways kept well-lit; trip hazards removed; supervised dance space.'),
    h('Food (pizza) allergies', 'Children', 'High', 'Collect dietary needs at booking; check labels; separate allergy-safe options; staff aware.'),
    h('Excited running / collisions', 'Children', 'Medium', 'Clear rules; supervision; defined active vs quiet zones.'),
    h('Pick-up safety (night)', 'Children', 'Medium', 'Sign out; released only to named adult; well-lit pick-up area.'),
  ] } },
  { title: 'General Classes', activity_type: 'class', content: { location: LOC, description: 'Weekly term circus/acro/fusion classes.', hazards: [
    h('Trips/collisions', 'Students', 'Medium', 'Clear floor; defined zones; coach supervision.'),
    h('Strain/injury on skills', 'Students', 'Medium', 'Warm-up; progression; spotting where needed; mats.'),
    h('Behaviour/horseplay', 'Students', 'Low', 'Clear expectations; coach managing the group; remove from activity if unsafe.'),
  ] } },
  { title: 'OSHC Workshop', activity_type: 'oshc', content: { location: LOC, description: 'Outside-school-hours-care incursion/excursion run by BSC staff.', hazards: [
    h('Unfamiliar venue', 'Children/Coaches', 'Medium', 'Pre-visit venue check; identify exits & hazards; bring portable first-aid kit.'),
    h('Transitions / headcounts', 'Children', 'Medium', 'Headcount at every transition; agreed ratios with the OSHC service; clear boundaries.'),
    h('Equipment setup on-site', 'Coaches', 'Medium', 'Only set up on suitable surfaces; mats for any elevated work; inspect before use.'),
  ] } },
  { title: 'Circus Show / Performance', activity_type: 'show', content: { location: LOC, description: 'Public performance / showcase with audience.', hazards: [
    h('Performance rigging / height', 'Performers', 'High', 'Rig inspected & load-checked before show; mats; only rehearsed skills performed.'),
    h('Audience / crowd & exits', 'Audience', 'Medium', 'Barriers between audience & performance area; clear, unobstructed exits; marshals.'),
    h('Fire / flame props', 'Performers/Audience', 'High', 'Only trained performers; safe distance from audience; extinguisher & fire blanket on hand; no flame indoors unless permitted.'),
    h('Staging / cables / electrical', 'All', 'Medium', 'Cables taped down; tested equipment; stable staging; trip hazards removed.'),
  ] } },
]

const RISK_CLS: Record<string, string> = { Low: 'bg-emerald-100 text-emerald-800', Medium: 'bg-amber-100 text-amber-800', High: 'bg-red-100 text-red-700' }
const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027]'

export function RiskAssessmentsClient({ initial, businessName }: { initial: RA[]; businessName: string }) {
  const [list, setList] = useState<RA[]>(initial)
  const [open, setOpen] = useState<RA | null>(null)
  const [busy, setBusy] = useState(false)

  async function seed() {
    setBusy(true)
    const r = await fetch('/api/risk-assessments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seed: DEFAULTS }) })
    const j = await r.json(); setBusy(false)
    if (j.ok) setList((xs) => [...xs, ...j.rows].sort((a, b) => a.title.localeCompare(b.title)))
    else alert(j.error || 'Could not set up')
  }
  async function addCustom() {
    const title = window.prompt('Name this risk assessment'); if (!title?.trim()) return
    const r = await fetch('/api/risk-assessments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), content: { location: LOC, hazards: [] } }) })
    const j = await r.json(); if (j.ok) { setList((xs) => [...xs, j.row]); setOpen(j.row) }
  }
  async function del(ra: RA) {
    if (!confirm(`Delete "${ra.title}"?`)) return
    setList((xs) => xs.filter((x) => x.id !== ra.id)); if (open?.id === ra.id) setOpen(null)
    fetch(`/api/risk-assessments?id=${ra.id}`, { method: 'DELETE' }).catch(() => {})
  }

  if (open) return <Editor ra={open} businessName={businessName} onBack={() => setOpen(null)} onSaved={(saved) => { setList((xs) => xs.map((x) => x.id === saved.id ? saved : x)); setOpen(saved) }} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-zinc-500">Tap one to edit or print. Add your own anytime.</p>
        <div className="flex gap-2">
          {list.length === 0 && <button onClick={seed} disabled={busy} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50">{busy ? 'Setting up…' : 'Set up the 8 standard ones'}</button>}
          <button onClick={addCustom} className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-xl"><Plus size={16} /> New</button>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center"><ShieldAlert size={26} className="mx-auto text-zinc-300 mb-2" /><p className="text-sm text-zinc-600">No risk assessments yet — tap <strong>“Set up the 8 standard ones”</strong> to create starter docs for Circus, Aerial, Gymnastics, School Holiday, KNO, Classes, OSHC and Shows.</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((ra) => (
            <div key={ra.id} className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col">
              <button onClick={() => setOpen(ra)} className="text-left flex-1">
                <div className="font-extrabold text-zinc-900">{ra.title}</div>
                <div className="text-xs text-zinc-400 mt-1">{(ra.content?.hazards?.length ?? 0)} hazard{(ra.content?.hazards?.length ?? 0) === 1 ? '' : 's'}</div>
              </button>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                <button onClick={() => setOpen(ra)} className="text-xs font-bold text-[#D72027]">Open</button>
                <div className="flex-1" />
                <button onClick={() => del(ra)} className="p-1 text-zinc-300 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Editor({ ra, businessName, onBack, onSaved }: { ra: RA; businessName: string; onBack: () => void; onSaved: (r: RA) => void }) {
  const [c, setC] = useState<Content>({ hazards: [], ...ra.content })
  const [title, setTitle] = useState(ra.title)
  const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false)
  const set = (k: keyof Content, v: unknown) => setC((p) => ({ ...p, [k]: v }))
  const hazards = c.hazards ?? []
  const setHaz = (i: number, k: keyof Hazard, v: string) => set('hazards', hazards.map((row, x) => x === i ? { ...row, [k]: v } : row))
  const addHaz = () => set('hazards', [...hazards, { hazard: '', who: 'Students', risk: 'Medium', controls: '' }])
  const delHaz = (i: number) => set('hazards', hazards.filter((_, x) => x !== i))

  async function save() {
    setBusy(true)
    const r = await fetch('/api/risk-assessments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ra.id, title, content: c }) })
    setBusy(false)
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); onSaved({ ...ra, title, content: c }) }
    else alert('Could not save')
  }

  function print() {
    const rows = hazards.map((x) => `<tr><td>${esc(x.hazard)}</td><td>${esc(x.who)}</td><td style="text-align:center"><b>${esc(x.risk)}</b></td><td>${esc(x.controls)}</td></tr>`).join('')
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(`<html><head><title>${esc(title)} — Risk Assessment</title><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#222;padding:28px;font-size:12px}
      h1{color:#A0151B;margin:0 0 2px} .sub{color:#666;margin:0 0 14px}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin:0 0 14px}
      table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #ccc;padding:7px;text-align:left;vertical-align:top}
      th{background:#f4f4f5;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
      .desc{margin:0 0 12px}
    </style></head><body>
      <h1>${esc(title)} — Risk Assessment</h1>
      <p class="sub">${esc(businessName)}</p>
      <div class="meta">
        <div><b>Location:</b> ${esc(c.location || '')}</div><div><b>Assessor:</b> ${esc(c.assessor || '')}</div>
        <div><b>Date:</b> ${esc(c.date || '')}</div><div><b>Review date:</b> ${esc(c.review_date || '')}</div>
      </div>
      ${c.description ? `<p class="desc"><b>Activity:</b> ${esc(c.description)}</p>` : ''}
      <table><thead><tr><th>Hazard</th><th>Who's at risk</th><th>Risk</th><th>Controls in place</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:20px">Signed: __________________________   Date: ____________</p>
    </body></html>`)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-600 hover:text-zinc-900"><ChevronLeft size={16} /> All risk assessments</button>
        <div className="flex gap-2">
          <button onClick={print} className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-xl"><Printer size={15} /> Print</button>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-extrabold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50"><Save size={15} /> {busy ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
        <input className={inp + ' font-extrabold text-lg'} value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Location</span><input className={inp} value={c.location ?? ''} onChange={(e) => set('location', e.target.value)} /></label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Assessor</span><input className={inp} value={c.assessor ?? ''} onChange={(e) => set('assessor', e.target.value)} placeholder="Your name" /></label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Date</span><input type="date" className={inp} value={c.date ?? ''} onChange={(e) => set('date', e.target.value)} /></label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Review date</span><input type="date" className={inp} value={c.review_date ?? ''} onChange={(e) => set('review_date', e.target.value)} /></label>
        </div>
        <label className="block"><span className="text-xs font-semibold text-zinc-600">Activity description</span><textarea rows={2} className={inp} value={c.description ?? ''} onChange={(e) => set('description', e.target.value)} /></label>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Hazards & controls ({hazards.length})</span>
          <button onClick={addHaz} className="inline-flex items-center gap-1 text-xs font-bold text-[#D72027]"><Plus size={13} /> Add hazard</button>
        </div>
        <div className="divide-y divide-zinc-100">
          {hazards.map((row, i) => (
            <div key={i} className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input className={inp + ' font-semibold'} value={row.hazard} onChange={(e) => setHaz(i, 'hazard', e.target.value)} placeholder="Hazard" />
                <select value={row.risk} onChange={(e) => setHaz(i, 'risk', e.target.value)} className={`text-xs font-bold px-2 py-2 rounded-lg border-0 ${RISK_CLS[row.risk] ?? 'bg-zinc-100'}`}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
                <button onClick={() => delHaz(i)} className="p-1.5 text-zinc-300 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
              <div className="grid sm:grid-cols-[160px_1fr] gap-2">
                <input className={inp} value={row.who} onChange={(e) => setHaz(i, 'who', e.target.value)} placeholder="Who's at risk" />
                <input className={inp} value={row.controls} onChange={(e) => setHaz(i, 'controls', e.target.value)} placeholder="Controls in place" />
              </div>
            </div>
          ))}
          {hazards.length === 0 && <p className="p-4 text-sm text-zinc-400">No hazards yet — tap “Add hazard”.</p>}
        </div>
      </div>
    </div>
  )
}

function esc(s: string) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
