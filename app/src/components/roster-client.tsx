'use client'

import { useRef, useState } from 'react'
import { X, Send, Mail, Printer, GripVertical } from 'lucide-react'
import type { RosterClass, StaffLite } from '@/lib/roster'
import type { WorkshopWithCounts, RosterCoach } from '@/lib/workshops'

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const POSITIONS = [
  { value: 'head_coach', label: 'Head Coach', cls: 'bg-[#D72027] text-white' },
  { value: 'lead', label: 'Lead Coach', cls: 'bg-orange-500 text-white' },
  { value: 'coach', label: 'Coach', cls: 'bg-sky-100 text-sky-800' },
  { value: 'jr_coach', label: 'Jr Coach', cls: 'bg-teal-100 text-teal-800' },
  { value: 'trainee', label: 'Trainee', cls: 'bg-amber-100 text-amber-800' },
  { value: 'assistant', label: 'Assistant', cls: 'bg-zinc-100 text-zinc-700' },
]
const posOf = (r: string) => POSITIONS.find((p) => p.value === r) || POSITIONS[2]
const t12 = (t: string | null) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h, 10); return `${((hr + 11) % 12) + 1}:${m}${hr >= 12 ? 'pm' : 'am'}` }
const hhmm = (t: string | null) => (t || '').slice(0, 5)
const niceDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

type Kind = 'class' | 'ws'
type Drag = { staffId: string; kind: Kind; srcRefId: string; coachId: string | null; coachName: string | null; role: string } | null
const apiOf = (k: Kind) => k === 'class' ? { url: '/api/classes/staff', key: 'class_id' } : { url: '/api/workshops/staff', key: 'workshop_id' }

type SessionLite = { id: string; staff: StaffLite[] }

export function RosterClient({ classes, workshops, kno, coaches, canManage }: { classes: RosterClass[]; workshops: WorkshopWithCounts[]; kno: WorkshopWithCounts[]; coaches: RosterCoach[]; canManage: boolean }) {
  const [cls, setCls] = useState<RosterClass[]>(classes)
  const [ws, setWs] = useState<WorkshopWithCounts[]>(workshops)
  const [knoS, setKnoS] = useState<WorkshopWithCounts[]>(kno)
  const [send, setSend] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const drag = useRef<Drag>(null)

  const byDay: Record<number, RosterClass[]> = {}
  for (const c of cls) (byDay[c.day_of_week] ||= []).push(c)

  // ---- optimistic state helpers (no page reload → instant) ----
  function mutateStaff(kind: Kind, refId: string, fn: (s: StaffLite[]) => StaffLite[]) {
    if (kind === 'class') { setCls((arr) => arr.map((x) => x.id === refId ? { ...x, staff: fn(x.staff) } : x)); return }
    const apply = (arr: WorkshopWithCounts[]) => arr.map((x) => x.id === refId ? { ...x, staff: fn(x.staff as unknown as StaffLite[]) as unknown as WorkshopWithCounts['staff'] } : x)
    setWs(apply); setKnoS(apply)
  }
  async function addStaff(kind: Kind, refId: string, c: RosterCoach) {
    const a = apiOf(kind)
    const role = (c.role === 'trainee' || c.trainee_level) ? 'trainee' : 'coach'
    const tmpId = 'tmp-' + Math.random().toString(36).slice(2)
    mutateStaff(kind, refId, (s) => [...s, { id: tmpId, coach_id: c.id, coach_name: c.full_name, role }])
    try {
      const r = await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [a.key]: refId, coach_id: c.id, coach_name: c.full_name, role }) })
      const j = await r.json()
      if (j.id) mutateStaff(kind, refId, (s) => s.map((x) => x.id === tmpId ? { ...x, id: j.id } : x))
    } catch { /* leave optimistic */ }
  }
  async function removeStaff(kind: Kind, refId: string, id: string) {
    mutateStaff(kind, refId, (s) => s.filter((x) => x.id !== id))
    if (!id.startsWith('tmp-')) fetch(`${apiOf(kind).url}?id=${id}`, { method: 'DELETE' }).catch(() => {})
  }
  function setRole(kind: Kind, refId: string, id: string, role: string) {
    mutateStaff(kind, refId, (s) => s.map((x) => x.id === id ? { ...x, role } : x))
    if (!id.startsWith('tmp-')) fetch(apiOf(kind).url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role }) }).catch(() => {})
  }
  async function onDrop(kind: Kind, refId: string) {
    const d = drag.current; drag.current = null
    if (!d || d.srcRefId === refId) return         // same session → no-op (kills the "buggy" feel)
    // remove from source (optimistic) + delete server row
    mutateStaff(d.kind, d.srcRefId, (s) => s.filter((x) => x.id !== d.staffId))
    if (!d.staffId.startsWith('tmp-')) fetch(`${apiOf(d.kind).url}?id=${d.staffId}`, { method: 'DELETE' }).catch(() => {})
    // add to target (optimistic) + create server row
    const tmpId = 'tmp-' + Math.random().toString(36).slice(2)
    mutateStaff(kind, refId, (s) => [...s, { id: tmpId, coach_id: d.coachId, coach_name: d.coachName, role: d.role }])
    const a = apiOf(kind)
    try {
      const r = await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [a.key]: refId, coach_id: d.coachId, coach_name: d.coachName, role: d.role }) })
      const j = await r.json(); if (j.id) mutateStaff(kind, refId, (s) => s.map((x) => x.id === tmpId ? { ...x, id: j.id } : x))
    } catch { /* leave optimistic */ }
  }
  const patchClass = (id: string, body: Record<string, unknown>) => { setCls((arr) => arr.map((c) => c.id === id ? { ...c, ...body } as RosterClass : c)); fetch('/api/classes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) }).catch(() => {}) }
  const patchWs = (id: string, body: Record<string, unknown>) => { const up = (arr: WorkshopWithCounts[]) => arr.map((w) => w.id === id ? { ...w, ...body } as WorkshopWithCounts : w); setWs(up); setKnoS(up); fetch('/api/workshops', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) }).catch(() => {}) }

  function printRoster(ids?: Set<string>) {
    const inc = (id: string) => !ids || ids.has(id)
    const sec = (title: string, rows: string[]) => rows.length ? `<h2>${title}</h2><table><tbody>${rows.join('')}</tbody></table>` : ''
    const staffTxt = (s: StaffLite[]) => s.map((x) => `${x.coach_name} (${posOf(x.role).label})`).join(', ') || '—'
    const classRows = [1, 2, 3, 4, 5, 6, 0].filter((d) => byDay[d]?.length).flatMap((d) => byDay[d].filter((c) => inc(c.id)).map((c) => `<tr><td><b>${DAY[d]}</b> ${t12(c.start_time)}</td><td>${c.name}</td><td>${staffTxt(c.staff)}</td></tr>`))
    const wsRows = ws.filter((w) => inc(w.id)).map((w) => `<tr><td>${niceDate(w.date)} ${t12(w.start_time)}–${t12(w.end_time)}</td><td>${w.title}</td><td>${staffTxt(w.staff)}</td></tr>`)
    const knoRows = knoS.filter((w) => inc(w.id)).map((w) => `<tr><td>${niceDate(w.date)} ${t12(w.start_time)}–${t12(w.end_time)}</td><td>${w.title}</td><td>${staffTxt(w.staff)}</td></tr>`)
    const html = `<html><head><title>Big Star Roster</title><style>body{font-family:system-ui,Arial,sans-serif;color:#18181b;padding:24px}h1{color:#D72027}h2{margin-top:24px;border-bottom:2px solid #FFC107;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:6px}td{border-bottom:1px solid #eee;padding:6px 8px;font-size:13px;vertical-align:top}td:first-child{white-space:nowrap;font-weight:600;width:160px}</style></head><body><h1>🎪 Big Star Circus — Staff Roster</h1><p>${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>${sec('Weekly Classes', classRows)}${sec('Holiday Workshops', wsRows)}${sec('Kids Night Out', knoRows)}</body></html>`
    const w = window.open('', '_blank'); if (!w) return; w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2 flex-wrap bg-gradient-to-r from-zinc-50 to-white rounded-2xl border border-zinc-200 p-4">
        <p className="text-sm text-zinc-600">{sel.size > 0 ? <><strong>{sel.size}</strong> selected — print just these, or print the lot.</> : 'Tick the sessions you want, or print one with its 🖨 button.'}</p>
        <div className="flex gap-2 flex-wrap">
          {sel.size > 0 && <button onClick={() => printRoster(sel)} className="inline-flex items-center gap-2 bg-zinc-900 text-white font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-800"><Printer size={15} /> Print selected ({sel.size})</button>}
          {sel.size > 0 && <button onClick={() => setSel(new Set())} className="text-sm font-bold text-zinc-500 px-3 py-2.5 hover:text-zinc-900">Clear</button>}
          <button onClick={() => printRoster()} className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"><Printer size={15} /> Print all</button>
          {canManage && <button onClick={() => setSend(true)} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg hover:bg-[#A0151B]"><Mail size={15} /> Send roster</button>}
        </div>
      </div>

      <section>
        <h2 className="text-base font-extrabold text-zinc-900 mb-3">Weekly classes</h2>
        {cls.length === 0 ? <p className="text-sm text-zinc-400">No classes set up.</p> : (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 0].filter((d) => byDay[d]?.length).map((d) => (
              <div key={d}>
                <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5 px-1">{DAY[d]}</div>
                <div className="space-y-2.5">
                  {byDay[d].map((c) => (
                    <SessionCard key={c.id} title={c.name} sub={c.primary_coach_name ? `lead ${c.primary_coach_name}` : undefined}
                      when={canManage
                        ? <div className="flex items-center gap-1.5">
                            <select value={c.day_of_week} onChange={(e) => patchClass(c.id, { day_of_week: Number(e.target.value) })} className="text-sm font-bold bg-transparent border border-transparent hover:border-zinc-200 rounded px-1 py-0.5">
                              {DAY.map((dn, i) => <option key={i} value={i}>{DAY_SHORT[i]}</option>)}
                            </select>
                            <input type="time" value={hhmm(c.start_time)} onChange={(e) => e.target.value && patchClass(c.id, { start_time: e.target.value })} className="text-sm font-bold bg-transparent border border-transparent hover:border-zinc-200 rounded px-1 py-0.5" />
                          </div>
                        : <span className="text-sm font-bold text-zinc-700">{t12(c.start_time)}</span>}
                      session={c} kind="class" coaches={coaches} canManage={canManage}
                      selected={sel.has(c.id)} onToggleSel={() => toggleSel(c.id)} onPrintOne={() => printRoster(new Set([c.id]))}
                      onAdd={addStaff} onRemove={removeStaff} onRole={setRole} onDrop={onDrop} drag={drag} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <DaysSection title="Holiday workshops" days={ws} coaches={coaches} canManage={canManage} patchWs={patchWs} addStaff={addStaff} removeStaff={removeStaff} setRole={setRole} onDrop={onDrop} drag={drag} sel={sel} toggleSel={toggleSel} printOne={(id) => printRoster(new Set([id]))} />
      <DaysSection title="Kids Night Out" days={knoS} coaches={coaches} canManage={canManage} patchWs={patchWs} addStaff={addStaff} removeStaff={removeStaff} setRole={setRole} onDrop={onDrop} drag={drag} sel={sel} toggleSel={toggleSel} printOne={(id) => printRoster(new Set([id]))} />

      {send && <SendModal coaches={coaches} onClose={() => setSend(false)} />}
    </div>
  )
}

function DaysSection({ title, days, coaches, canManage, patchWs, addStaff, removeStaff, setRole, onDrop, drag, sel, toggleSel, printOne }: {
  title: string; days: WorkshopWithCounts[]; coaches: RosterCoach[]; canManage: boolean
  patchWs: (id: string, body: Record<string, unknown>) => void
  addStaff: (k: Kind, r: string, c: RosterCoach) => void; removeStaff: (k: Kind, r: string, id: string) => void
  setRole: (k: Kind, r: string, id: string, role: string) => void; onDrop: (k: Kind, r: string) => void; drag: React.MutableRefObject<Drag>
  sel: Set<string>; toggleSel: (id: string) => void; printOne: (id: string) => void
}) {
  if (!days.length) return null
  return (
    <section>
      <h2 className="text-base font-extrabold text-zinc-900 mb-3">{title}</h2>
      <div className="space-y-2.5">
        {days.map((w) => (
          <SessionCard key={w.id} title={w.title}
            when={canManage
              ? <div className="flex items-center gap-1.5 flex-wrap">
                  <input type="date" value={w.date} onChange={(e) => e.target.value && patchWs(w.id, { date: e.target.value })} className="text-sm font-bold bg-transparent border border-transparent hover:border-zinc-200 rounded px-1 py-0.5" />
                  <input type="time" value={hhmm(w.start_time)} onChange={(e) => e.target.value && patchWs(w.id, { start_time: e.target.value })} className="text-sm bg-transparent border border-transparent hover:border-zinc-200 rounded px-1 py-0.5" />
                  <span className="text-zinc-300">–</span>
                  <input type="time" value={hhmm(w.end_time)} onChange={(e) => e.target.value && patchWs(w.id, { end_time: e.target.value })} className="text-sm bg-transparent border border-transparent hover:border-zinc-200 rounded px-1 py-0.5" />
                </div>
              : <span className="text-sm font-bold text-zinc-700">{niceDate(w.date)} · {t12(w.start_time)}–{t12(w.end_time)}</span>}
            session={w} kind="ws" coaches={coaches} canManage={canManage}
            selected={sel.has(w.id)} onToggleSel={() => toggleSel(w.id)} onPrintOne={() => printOne(w.id)}
            onAdd={addStaff} onRemove={removeStaff} onRole={setRole} onDrop={onDrop} drag={drag} />
        ))}
      </div>
    </section>
  )
}

function SessionCard({ title, sub, when, session, kind, coaches, canManage, selected, onToggleSel, onPrintOne, onAdd, onRemove, onRole, onDrop, drag }: {
  title: string; sub?: string; when: React.ReactNode; session: SessionLite; kind: Kind; coaches: RosterCoach[]; canManage: boolean
  selected: boolean; onToggleSel: () => void; onPrintOne: () => void
  onAdd: (k: Kind, r: string, c: RosterCoach) => void; onRemove: (k: Kind, r: string, id: string) => void
  onRole: (k: Kind, r: string, id: string, role: string) => void; onDrop: (k: Kind, r: string) => void; drag: React.MutableRefObject<Drag>
}) {
  const [over, setOver] = useState(false)
  const refId = session.id
  const assigned = new Set(session.staff.map((s) => s.coach_id))
  const available = coaches.filter((c) => !assigned.has(c.id))
  return (
    <div className={`bg-white rounded-2xl border-2 p-4 shadow-sm ${selected ? 'border-zinc-900' : 'border-zinc-200'}`}>
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={selected} onChange={onToggleSel} className="w-4 h-4 accent-[#D72027]" />
          <span className="font-bold text-zinc-900">{title}{sub && <span className="text-zinc-400 font-normal text-sm"> · {sub}</span>}</span>
        </label>
        <div className="flex items-center gap-2">
          {when}
          <button onClick={onPrintOne} title="Print this one" className="text-zinc-400 hover:text-zinc-900 p-1"><Printer size={15} /></button>
        </div>
      </div>
      <div
        onDragOver={(e) => { if (canManage && drag.current) { e.preventDefault(); if (!over) setOver(true) } }}
        onDragLeave={() => over && setOver(false)}
        onDrop={() => { setOver(false); onDrop(kind, refId) }}
        className={`flex items-center gap-2 flex-wrap rounded-xl p-2 -m-2 transition-colors ${over ? 'bg-emerald-50 ring-2 ring-emerald-300' : ''}`}
      >
        {session.staff.length === 0 && <span className="text-xs text-zinc-400 italic px-1">Drop a coach here, or add →</span>}
        {session.staff.map((s) => {
          const p = posOf(s.role)
          return (
            <span key={s.id} draggable={canManage}
              onDragStart={(e) => { drag.current = { staffId: s.id, kind, srcRefId: refId, coachId: s.coach_id, coachName: s.coach_name, role: s.role }; e.dataTransfer.effectAllowed = 'move' }}
              onDragEnd={() => { drag.current = null }}
              className={`inline-flex items-center gap-1.5 text-xs font-bold pl-1.5 pr-1 py-1 rounded-lg ${p.cls} ${canManage ? 'cursor-grab active:cursor-grabbing' : ''}`}>
              {canManage && <GripVertical size={12} className="opacity-50" />}
              {s.coach_name}
              {canManage ? (
                <select value={s.role} onChange={(e) => onRole(kind, refId, s.id, e.target.value)} className="bg-white/25 text-current text-[10px] font-bold rounded px-0.5 py-0.5 border-0 cursor-pointer">
                  {POSITIONS.map((pp) => <option key={pp.value} value={pp.value} className="text-zinc-900">{pp.label}</option>)}
                </select>
              ) : <span className="text-[9px] uppercase opacity-80">{p.label}</span>}
              {canManage && <button onClick={() => onRemove(kind, refId, s.id)} className="hover:text-red-700 ml-0.5"><X size={12} /></button>}
            </span>
          )
        })}
        {canManage && available.length > 0 && (
          <select onChange={(e) => { const c = coaches.find((x) => x.id === e.target.value); if (c) onAdd(kind, refId, c); e.target.value = '' }} defaultValue="" className="inline-flex items-center text-xs font-bold border border-dashed border-zinc-300 rounded-lg px-2 py-1.5 text-[#D72027] bg-white cursor-pointer">
            <option value="">+ Add</option>
            {available.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.trainee_level ? ' (trainee)' : ''}</option>)}
          </select>
        )}
      </div>
    </div>
  )
}

function SendModal({ coaches, onClose }: { coaches: RosterCoach[]; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(coaches.map((c) => c.id)))
  const [channel, setChannel] = useState<'both' | 'email' | 'sms'>('email')
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [intro, setIntro] = useState("Here's your upcoming Big Star roster:")
  const [subject, setSubject] = useState('Your Big Star roster')
  const [message, setMessage] = useState("Hi {name},\n\nHere's your roster for the coming weeks:\n\n• \n• \n\nLet me know if anything clashes.\n\nThanks,\nRhett")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Array<{ name: string; items?: number; email: string; sms: string }> | null>(null)
  function toggle(id: string) { setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  async function send() {
    if (!selected.size) return
    if (mode === 'manual' && !message.trim()) { alert('Write a message first'); return }
    setBusy(true)
    const url = mode === 'auto' ? '/api/roster/send' : '/api/coaches/notify'
    const body = mode === 'auto'
      ? { coach_ids: [...selected], channel, intro }
      : { coach_ids: [...selected], channel, subject, message }
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json(); setBusy(false)
    if (j.ok) setDone(j.results); else alert(j.error || 'Could not send')
  }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900 text-lg">Send to coaches</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        {done ? (
          <div className="p-5">
            <p className="font-bold text-zinc-900 mb-2">Sent ✓</p>
            <ul className="text-sm space-y-1">{done.map((r, i) => <li key={i} className="flex justify-between gap-2 border-b border-zinc-50 py-1"><span className="font-semibold">{r.name}{r.items != null && <span className="text-zinc-400 font-normal"> · {r.items} shift{r.items === 1 ? '' : 's'}</span>}</span><span className={`text-xs ${r.email === 'sent' ? 'text-emerald-600' : 'text-zinc-500'}`}>✉️ {r.email} · 📱 {r.sms}</span></li>)}</ul>
            <button onClick={onClose} className="mt-4 bg-zinc-900 text-white text-sm font-bold px-4 py-2 rounded-lg">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* plain-English summary of exactly what will go out */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-zinc-700 leading-relaxed">
              {mode === 'auto'
                ? <>You're sending <strong>each of the {selected.size} selected coach{selected.size === 1 ? '' : 'es'}</strong> their <strong>own personal roster</strong> — every coach only sees their own shifts. </>
                : <>You're sending <strong>the same written message</strong> to <strong>{selected.size} selected coach{selected.size === 1 ? '' : 'es'}</strong>. </>}
              Going out by <strong>{channel === 'both' ? 'email and text' : channel === 'email' ? 'email' : 'text message'}</strong>. Replies come back into your CRM and your Hotmail.
            </div>

            {/* mode toggle */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">What to send</div>
              <div className="inline-flex bg-zinc-100 rounded-full p-1 text-sm font-bold">
                <button onClick={() => setMode('auto')} className={`px-4 py-2 rounded-full ${mode === 'auto' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}>📋 Auto roster</button>
                <button onClick={() => setMode('manual')} className={`px-4 py-2 rounded-full ${mode === 'manual' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}>✍️ Write my own</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Who to send to <span className="text-zinc-400 font-semibold normal-case">· tap to add or remove</span></div>
              <div className="flex flex-wrap gap-2">
                {coaches.map((c) => <button key={c.id} onClick={() => toggle(c.id)} className={`text-sm font-semibold px-3.5 py-2 rounded-lg border transition-colors ${selected.has(c.id) ? 'bg-[#D72027] text-white border-[#D72027]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'} ${!c.email && (channel !== 'sms') ? 'opacity-50' : ''}`} title={!c.email ? 'No email on file' : ''}>{c.full_name}{!c.email ? ' ⚠️' : ''}</button>)}
              </div>
              <p className="text-xs text-zinc-400 mt-2">⚠️ = no email on file (add it on the Team page so they receive it).</p>
            </div>
            {mode === 'auto' ? (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Intro line <span className="text-zinc-400 font-semibold normal-case">· their shifts are added automatically below this</span></div>
                <input value={intro} onChange={(e) => setIntro(e.target.value)} className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
              </div>
            ) : (
              <>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Subject</div>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Your message</div>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none leading-relaxed" />
                  <p className="text-xs text-zinc-400 mt-2">Tip: type <strong>{'{name}'}</strong> and it fills in each coach’s first name.</p>
                </div>
              </>
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Send by</div>
              <div className="inline-flex bg-zinc-100 rounded-full p-1 text-sm font-bold">
                {(['both', 'email', 'sms'] as const).map((ch) => <button key={ch} onClick={() => setChannel(ch)} className={`px-4 py-2 rounded-full ${channel === ch ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}>{ch === 'both' ? '✉️+📱 Both' : ch === 'email' ? '✉️ Email' : '📱 Text'}</button>)}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100">
              <button onClick={onClose} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 px-3 py-2.5">Cancel</button>
              <button onClick={send} disabled={busy || !selected.size} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-extrabold text-sm px-6 py-3 rounded-xl disabled:opacity-50"><Send size={15} /> {busy ? 'Sending…' : `Send to ${selected.size} coach${selected.size === 1 ? '' : 'es'}`}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
