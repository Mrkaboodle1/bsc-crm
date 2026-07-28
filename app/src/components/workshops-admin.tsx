'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Users, Clock, Trash2, Star, Pencil, Download, UserPlus, Palette, MessageSquare, Send } from 'lucide-react'
import type { WorkshopWithCounts, RosterCoach, Booking } from '@/lib/workshops'

const ROLE_CHIP: Record<string, string> = { lead: 'bg-[#D72027] text-white', coach: 'bg-blue-100 text-blue-800', trainee: 'bg-amber-100 text-amber-800' }

const input = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'
const money = (n: number) => `$${Number(n).toFixed(0)}`
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

// Circus arts & craft activity ideas — one per day. Rhett can edit per day.
const ACTIVITY_IDEAS = [
  'Paper-plate clown faces 🤡', 'Juggling scarves from old fabric 🧣', 'Decorate your own circus poster 🎪',
  'Make a mini-poi from socks & rice', 'Ringmaster top hats from card 🎩', 'Tightrope balance beam art',
  'Circus animal masks 🦁', 'Glittery star wands ⭐', 'Painted juggling balls (balloons + flour)',
  'Big-top tent diorama in a box', 'Acrobat paper puppets', 'Carnival bunting to take home 🎉',
]

export function WorkshopsAdmin({ workshops, coaches = [], canManage }: { workshops: WorkshopWithCounts[]; coaches?: RosterCoach[]; canManage: boolean }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<WorkshopWithCounts | null>(null)
  const [booking, setBooking] = useState<WorkshopWithCounts | null>(null)
  const [msgDay, setMsgDay] = useState<WorkshopWithCounts | null>(null)
  const [parentMsg, setParentMsg] = useState<WorkshopWithCounts | null>(null)
  const [editBooking, setEditBooking] = useState<Booking | null>(null)
  const upcoming = workshops.filter((w) => w.status !== 'cancelled')

  const totalKids = upcoming.reduce((n, w) => n + w.kids, 0)
  const totalCollected = upcoming.reduce((n, w) => n + w.collected, 0)

  async function cancelDay(id: string) {
    if (!window.confirm('Cancel this workshop day? (Removes it from the public list.)')) return
    await fetch(`/api/workshops?id=${id}`, { method: 'DELETE' }); router.refresh()
  }
  async function delBooking(id: string) {
    if (!window.confirm('Remove this booking?')) return
    await fetch(`/api/workshops/bookings?id=${id}`, { method: 'DELETE' }); router.refresh()
  }
  function exportCsv() {
    const rows: string[][] = [['Date', 'Title', 'Activity', 'Kids booked', 'Capacity', 'Waitlist', '$ collected', 'Parents']]
    for (const w of upcoming) {
      const parents = w.bookings.filter((b) => b.status === 'booked').map((b) => `${b.parent_name} (${b.child_count})`).join('; ')
      rows.push([w.date, w.title, w.activity || '', String(w.kids), String(w.capacity), String(w.waitlist), w.collected.toFixed(2), parents])
    }
    rows.push(['', '', 'TOTAL', String(totalKids), '', '', totalCollected.toFixed(2), ''])
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `workshop-bookings-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <p className="text-sm text-zinc-500">Log each booking as parents pay. The sheet below tallies kids &amp; money per day.</p>
        <div className="flex items-center gap-2">
          {upcoming.length > 0 && <button onClick={exportCsv} className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-zinc-50"><Download size={15} /> Export to Excel</button>}
          {canManage && <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 bg-zinc-900 text-white font-semibold text-sm px-4 py-2 rounded-lg"><Plus size={15} /> Add workshop day</button>}
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">No workshop days yet. Add one to start taking bookings.</div>
      ) : (
        <>
          {/* ── Day-by-day SUMMARY SHEET ── */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden mb-5">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">📋 Headcount sheet — kids per day</div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] font-bold uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                <th className="px-4 py-2">Day</th><th className="px-3 py-2">Activity</th>
                <th className="px-3 py-2 text-center">Kids</th><th className="px-3 py-2 text-center">Cap</th>
                <th className="px-3 py-2 text-center">Wait</th><th className="px-3 py-2 text-right">$ in</th>
              </tr></thead>
              <tbody>
                {upcoming.map((w) => {
                  const full = w.kids >= w.capacity
                  return (
                    <tr key={w.id} className="border-b border-zinc-50 hover:bg-zinc-50/60">
                      <td className="px-4 py-2.5 font-semibold text-zinc-900 whitespace-nowrap">{fmtDate(w.date)}</td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs">{w.activity || <span className="text-zinc-300 italic">— add an activity —</span>}</td>
                      <td className={`px-3 py-2.5 text-center font-extrabold ${full ? 'text-red-600' : 'text-emerald-600'}`}>{w.kids}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-400">{w.capacity}</td>
                      <td className="px-3 py-2.5 text-center text-amber-600">{w.waitlist || ''}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-zinc-700">{w.collected ? money(w.collected) : '—'}</td>
                    </tr>
                  )
                })}
                <tr className="bg-zinc-50 font-extrabold text-zinc-900">
                  <td className="px-4 py-2.5" colSpan={2}>TOTAL across all days</td>
                  <td className="px-3 py-2.5 text-center text-[#D72027]">{totalKids}</td>
                  <td className="px-3 py-2.5"></td><td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5 text-right text-[#D72027]">{money(totalCollected)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Per-day detail cards ── */}
          <div className="space-y-3">
            {upcoming.map((w) => {
              const full = w.kids >= w.capacity
              return (
                <div key={w.id} className="bg-white rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-extrabold text-zinc-900">{fmtDate(w.date)} · {w.title}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1"><Clock size={12} /> {w.start_time?.slice(0, 5)}–{w.end_time?.slice(0, 5)}</span>
                        <span>Member {money(w.member_price)} · Public {money(w.public_price)}</span>
                        {w.public_opens_at && <span className="text-amber-700 font-semibold">Members-only until {fmtDate(w.public_opens_at)}</span>}
                      </div>
                      {w.activity && <div className="text-xs text-violet-700 mt-1 inline-flex items-center gap-1"><Palette size={12} /> {w.activity}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-extrabold px-2.5 py-1 rounded-lg ${full ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}><Users size={13} className="inline -mt-0.5" /> {w.kids}/{w.capacity} kids{full ? ' FULL' : ''}</span>
                      {w.waitlist > 0 && <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700">Waitlist {w.waitlist}</span>}
                      {canManage && <button onClick={() => setBooking(w)} className="inline-flex items-center gap-1 bg-[#D72027] text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-[#A0151B]"><UserPlus size={13} /> Add booking</button>}
                      {canManage && <button onClick={() => setEditing(w)} className="text-zinc-400 hover:text-[#D72027] p-1.5" title="Edit day"><Pencil size={15} /></button>}
                      {canManage && <button onClick={() => cancelDay(w.id)} className="text-zinc-400 hover:text-red-600 p-1.5" title="Cancel day"><Trash2 size={15} /></button>}
                    </div>
                  </div>
                  {w.bookings.filter((b) => b.status !== 'cancelled').length > 0 && (
                    <ul className="mt-3 divide-y divide-zinc-100 border-t border-zinc-100">
                      {w.bookings.filter((b) => b.status !== 'cancelled').map((b) => (
                        <li key={b.id} className="flex items-center gap-2 py-1.5 text-sm">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${b.status === 'booked' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{b.status}</span>
                          {b.is_member && <span title="Member"><Star size={12} className="text-amber-500 fill-amber-500" /></span>}
                          {canManage
                            ? <button onClick={() => setEditBooking(b)} className="font-semibold text-zinc-800 hover:text-[#D72027] hover:underline">{b.parent_name}</button>
                            : <span className="font-semibold text-zinc-800">{b.parent_name}</span>}
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5">{b.child_count} {b.child_count === 1 ? 'kid' : 'kids'}</span>
                          <span className="text-zinc-500 truncate">{b.child_names || ''}</span>
                          <span className="text-zinc-400 text-xs ml-auto whitespace-nowrap">{b.amount_paid != null ? money(b.amount_paid) : (b.paid ? '' : 'UNPAID')}</span>
                          {canManage && <button onClick={() => setEditBooking(b)} className="p-1 text-zinc-300 hover:text-[#D72027]" title="Edit parent details"><Pencil size={13} /></button>}
                          {canManage && <button onClick={() => delBooking(b.id)} className="p-1 text-zinc-300 hover:text-red-600"><Trash2 size={13} /></button>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Coach / trainee roster */}
                  {canManage && <RosterBlock day={w} coaches={coaches} onMessage={() => setMsgDay(w)} onMessageParents={() => setParentMsg(w)} />}
                </div>
              )
            })}
          </div>
        </>
      )}

      {adding && <DayModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); router.refresh() }} />}
      {editing && <DayModal existing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh() }} />}
      {booking && <BookingModal day={booking} onClose={() => setBooking(null)} onSaved={() => { setBooking(null); router.refresh() }} />}
      {msgDay && <MessageModal day={msgDay} coaches={coaches} onClose={() => setMsgDay(null)} />}
      {parentMsg && <ParentMessageModal day={parentMsg} onClose={() => setParentMsg(null)} />}
      {editBooking && <BookingEditModal booking={editBooking} onClose={() => setEditBooking(null)} onSaved={() => { setEditBooking(null); router.refresh() }} />}
    </div>
  )
}

function RosterBlock({ day, coaches, onMessage, onMessageParents }: { day: WorkshopWithCounts; coaches: RosterCoach[]; onMessage: () => void; onMessageParents: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const fmtNice = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  const assignedIds = new Set(day.staff.map((s) => s.coach_id))
  const available = coaches.filter((c) => !assignedIds.has(c.id))
  async function add(coachId: string) {
    const c = coaches.find((x) => x.id === coachId); if (!c) return
    setBusy(true)
    const role = (c.role === 'trainee' || c.trainee_level) ? 'trainee' : 'coach'
    await fetch('/api/workshops/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workshop_id: day.id, coach_id: c.id, coach_name: c.full_name, role }) })
    setBusy(false); router.refresh()
  }
  async function remove(id: string) { setBusy(true); await fetch(`/api/workshops/staff?id=${id}`, { method: 'DELETE' }); setBusy(false); router.refresh() }
  async function cycleRole(id: string, current: string) {
    const next = current === 'coach' ? 'lead' : current === 'lead' ? 'trainee' : 'coach'
    setBusy(true); await fetch('/api/workshops/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role: next }) }); setBusy(false); router.refresh()
  }
  return (
    <div className="mt-3 border-t border-zinc-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500">👥 Coaches &amp; trainees on {fmtNice(day.date)}</div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={onMessage} className="inline-flex items-center gap-1 text-xs font-bold text-[#D72027] hover:underline"><MessageSquare size={12} /> Text / email coaches</button>
          <button onClick={onMessageParents} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"><MessageSquare size={12} /> Text / email parents</button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {day.staff.length === 0 && <span className="text-xs text-zinc-400 italic">No one rostered yet.</span>}
        {day.staff.map((s) => (
          <span key={s.id} className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${ROLE_CHIP[s.role] || 'bg-zinc-100'}`}>
            <button onClick={() => cycleRole(s.id, s.role)} title="Tap to change role (coach → lead → trainee)" className="hover:opacity-70">{s.coach_name}</button>
            <span className="opacity-70 text-[9px] uppercase">{s.role}</span>
            <button onClick={() => remove(s.id)} disabled={busy} className="hover:text-red-600"><X size={11} /></button>
          </span>
        ))}
        {available.length > 0 && (
          <select onChange={(e) => { if (e.target.value) add(e.target.value); e.target.value = '' }} disabled={busy} defaultValue="" className="text-xs border border-dashed border-zinc-300 rounded-lg px-2 py-1 text-zinc-600 bg-white">
            <option value="">+ Add coach…</option>
            {available.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.trainee_level ? ' (trainee)' : ''}</option>)}
          </select>
        )}
      </div>
    </div>
  )
}

function MessageModal({ day, coaches, onClose }: { day: WorkshopWithCounts; coaches: RosterCoach[]; onClose: () => void }) {
  const fmtNice = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const niceDay = fmtNice(day.date)
  // default recipients = coaches rostered on this day; fall back to all
  const rosteredIds = day.staff.map((s) => s.coach_id).filter(Boolean) as string[]
  const [selected, setSelected] = useState<Set<string>>(new Set(rosteredIds))
  const [channel, setChannel] = useState<'both' | 'email' | 'sms'>('both')
  const [subject, setSubject] = useState(`Big Star — ${niceDay}`)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Array<{ name: string; email: string; sms: string }> | null>(null)
  const TEMPLATES: Record<string, string> = {
    'Ask availability': `Hi {name}, are you available to coach our holiday workshop on ${niceDay}, 9am–3pm? Let me know — thanks! Rhett, Big Star Circus.`,
    'You\'re rostered': `Hi {name}, you're rostered on for ${niceDay}, 9am–3pm at Big Star. Let me know if any issues. Thanks!`,
    'Switching you': `Hi {name}, quick change — I'm moving you to ${niceDay}, 9am–3pm. Does that still work for you? Thanks! Rhett.`,
  }
  function toggle(id: string) { setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  async function send() {
    if (!selected.size || !message.trim()) return
    setBusy(true)
    const r = await fetch('/api/coaches/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coach_ids: [...selected], channel, subject, message }) })
    const j = await r.json(); setBusy(false)
    if (j.ok) setDone(j.results); else alert(j.error || 'Could not send')
  }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">Message coaches · {niceDay}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        {done ? (
          <div className="p-5">
            <p className="font-bold text-zinc-900 mb-2">Sent ✓</p>
            <ul className="text-sm space-y-1">
              {done.map((r, i) => <li key={i} className="flex justify-between gap-2 border-b border-zinc-50 py-1"><span className="font-semibold">{r.name}</span><span className="text-xs text-zinc-500">✉️ {r.email} · 📱 {r.sms}</span></li>)}
            </ul>
            <button onClick={onClose} className="mt-4 bg-zinc-900 text-white text-sm font-bold px-4 py-2 rounded-lg">Done</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5">Who to message</div>
              <div className="flex flex-wrap gap-1.5">
                {coaches.map((c) => (
                  <button key={c.id} onClick={() => toggle(c.id)} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${selected.has(c.id) ? 'bg-[#D72027] text-white border-[#D72027]' : 'bg-white text-zinc-600 border-zinc-200'}`}>
                    {c.full_name}{c.trainee_level ? ' 🎓' : ''}
                  </button>
                ))}
              </div>
              {coaches.length === 0 && <p className="text-xs text-zinc-400">No coaches found — add them under Team first.</p>}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5">Quick message</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Object.keys(TEMPLATES).map((t) => <button key={t} onClick={() => setMessage(TEMPLATES[t])} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200">{t}</button>)}
              </div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Write your message… ({name} becomes their first name)" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex bg-zinc-100 rounded-full p-1 text-xs font-bold">
                {(['both', 'email', 'sms'] as const).map((ch) => <button key={ch} onClick={() => setChannel(ch)} className={`px-3 py-1.5 rounded-full ${channel === ch ? 'bg-white shadow' : 'opacity-70'}`}>{ch === 'both' ? '✉️+📱 Both' : ch === 'email' ? '✉️ Email' : '📱 Text'}</button>)}
              </div>
              {(channel !== 'sms') && <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" className="flex-1 min-w-[140px] text-xs border border-zinc-200 rounded-lg px-2 py-1.5" />}
            </div>
            <button onClick={send} disabled={busy || !selected.size || !message.trim()} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">
              <Send size={14} /> {busy ? 'Sending…' : `Send to ${selected.size} coach${selected.size === 1 ? '' : 'es'}`}
            </button>
            <p className="text-[11px] text-zinc-400">Texts use ClickSend (needs credit); emails use your Big Star email. {`{name}`} fills in each coach's first name.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function BookingModal({ day, onClose, onSaved }: { day: WorkshopWithCounts; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ parent_name: '', child_names: '', child_count: '1', is_member: false, amount_paid: String(day.public_price || 85), status: 'booked' as 'booked' | 'waitlist' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  async function save() {
    if (!f.parent_name.trim()) { setErr('Add the parent name'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/workshops/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshop_id: day.id, ...f, child_count: Number(f.child_count) || 1, amount_paid: f.amount_paid === '' ? null : Number(f.amount_paid), paid: true }),
      })
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Could not save') }
      onSaved()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">Add booking · {fmtDate(day.date)}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-4">
          <L label="Parent name"><input className={input} value={f.parent_name} onChange={(e) => set('parent_name', e.target.value)} placeholder="e.g. Sarah Brennan" autoFocus /></L>
          <L label="Child name(s)"><input className={input} value={f.child_names} onChange={(e) => set('child_names', e.target.value)} placeholder="e.g. Aidyn, Mia" /></L>
          <div className="grid grid-cols-2 gap-4">
            <L label="How many kids"><input type="number" min="1" className={input} value={f.child_count} onChange={(e) => set('child_count', e.target.value)} /></L>
            <L label="$ paid"><input type="number" className={input} value={f.amount_paid} onChange={(e) => set('amount_paid', e.target.value)} /></L>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" checked={f.is_member} onChange={(e) => set('is_member', e.target.checked)} /> This family is a Big Star member
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" checked={f.status === 'waitlist'} onChange={(e) => set('status', e.target.checked ? 'waitlist' : 'booked')} /> Put on the waitlist (day is full)
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2"><button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Add booking'}</button><button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-4">Cancel</button></div>
        </div>
      </div>
    </div>
  )
}

function DayModal({ existing, onClose, onSaved }: { existing?: WorkshopWithCounts; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!existing
  const [f, setF] = useState({
    date: existing?.date ?? '',
    title: existing?.title ?? 'School Holiday Workshop',
    start_time: existing?.start_time?.slice(0, 5) ?? '09:00',
    end_time: existing?.end_time?.slice(0, 5) ?? '15:00',
    capacity: String(existing?.capacity ?? '24'),
    member_price: String(existing?.member_price ?? '85'),
    public_price: String(existing?.public_price ?? '85'),
    public_opens_at: existing?.public_opens_at ?? '',
    activity: existing?.activity ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function save() {
    if (!f.date) { setErr('Pick a date'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/workshops', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: existing!.id, ...f } : f),
      })
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Could not save') }
      onSaved()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">{isEdit ? 'Edit workshop day' : 'Add workshop day'}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <L label="Date"><input type="date" className={input} value={f.date} onChange={(e) => set('date', e.target.value)} /></L>
            <L label="Capacity"><input type="number" className={input} value={f.capacity} onChange={(e) => set('capacity', e.target.value)} /></L>
            <L label="Start"><input type="time" className={input} value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></L>
            <L label="Finish"><input type="time" className={input} value={f.end_time} onChange={(e) => set('end_time', e.target.value)} /></L>
            <L label="Member price ($)"><input type="number" className={input} value={f.member_price} onChange={(e) => set('member_price', e.target.value)} /></L>
            <L label="Public price ($)"><input type="number" className={input} value={f.public_price} onChange={(e) => set('public_price', e.target.value)} /></L>
          </div>
          <L label="Circus arts & craft activity (the kids make this)">
            <input className={input} value={f.activity} onChange={(e) => set('activity', e.target.value)} placeholder="e.g. Paper-plate clown faces" list="activity-ideas" />
            <datalist id="activity-ideas">{ACTIVITY_IDEAS.map((a) => <option key={a} value={a} />)}</datalist>
          </L>
          <L label="Members-only until (optional)"><input type="date" className={input} value={f.public_opens_at} onChange={(e) => set('public_opens_at', e.target.value)} /></L>
          <p className="text-[11px] text-zinc-400 -mt-2">Before this date only members can book; the public goes on the waitlist until it opens.</p>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2"><button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add day'}</button><button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-4">Cancel</button></div>
        </div>
      </div>
    </div>
  )
}
function BookingEditModal({ booking, onClose, onSaved }: { booking: Booking; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    parent_name: booking.parent_name ?? '', child_names: booking.child_names ?? '',
    child_count: String(booking.child_count ?? 1), email: booking.email ?? '', phone: booking.phone ?? '',
  })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function save() {
    if (!f.parent_name.trim()) { setErr('Parent name is needed'); return }
    setBusy(true); setErr('')
    const r = await fetch('/api/workshops/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: booking.id, ...f, child_count: Number(f.child_count) || 1 }) })
    if (r.ok) onSaved(); else { const j = await r.json().catch(() => ({})); setErr(j.error || 'Could not save'); setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">Edit parent details</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-4">
          <L label="Parent name"><input className={input} value={f.parent_name} onChange={(e) => set('parent_name', e.target.value)} autoFocus /></L>
          <L label="Child name(s)"><input className={input} value={f.child_names} onChange={(e) => set('child_names', e.target.value)} placeholder="e.g. Aidyn, Mia" /></L>
          <L label="How many kids"><input type="number" min="1" className={input} value={f.child_count} onChange={(e) => set('child_count', e.target.value)} /></L>
          <L label="Email"><input className={input} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@email.com" /></L>
          <L label="Phone"><input className={input} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0400 000 000" /></L>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2"><button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button><button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-4">Cancel</button></div>
        </div>
      </div>
    </div>
  )
}

function ParentMessageModal({ day, onClose }: { day: WorkshopWithCounts; onClose: () => void }) {
  const niceDay = new Date(day.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const t12 = (t: string | null | undefined) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h, 10); return `${((hr + 11) % 12) + 1}:${m}${hr >= 12 ? 'pm' : 'am'}` }
  const drop = t12(day.start_time), pick = t12(day.end_time)
  const isKnoDay = /^Kids Night Out/i.test(day.title)
  const defaultMsg = isKnoDay
    ? `Hi {name}, just a reminder that Kids Night Out is on ${niceDay}! Drop-off ${drop}, pick-up ${pick}. Please send your child with a water bottle. See you there! 🎪`
    : `Hi {name}, just a reminder that the Big Star Holiday Workshop is on ${niceDay}! Drop-off ${drop}, pick-up ${pick}. Please pack lunch, morning tea and a water bottle. See you there! 🎪`
  const [channel, setChannel] = useState<'both' | 'email' | 'sms'>('email')
  const [subject, setSubject] = useState(isKnoDay ? 'Reminder: Kids Night Out' : 'Reminder: Big Star Holiday Workshop')
  const [message, setMessage] = useState(defaultMsg)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ emailed: number; texted: number; skipped: number; total: number } | null>(null)
  async function send() {
    if (!message.trim()) return
    setBusy(true)
    const r = await fetch('/api/workshops/notify-parents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workshop_id: day.id, channel, subject, message }) })
    const j = await r.json(); setBusy(false)
    if (j.ok) setDone(j); else alert(j.error || 'Could not send')
  }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">Message parents · {niceDay}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        {done ? (
          <div className="p-5">
            <p className="font-bold text-zinc-900 mb-2">Sent ✓</p>
            <p className="text-sm text-zinc-600">✉️ {done.emailed} emailed · 📱 {done.texted} texted{done.skipped ? ` · ${done.skipped} had no contact / text credit` : ''} (of {done.total} families).</p>
            <button onClick={onClose} className="mt-4 bg-zinc-900 text-white text-sm font-bold px-4 py-2 rounded-lg">Done</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-zinc-700">This sends to <strong>every booked family</strong> on {niceDay}. Replies come back into your CRM. <span className="text-zinc-500">(Texts need ClickSend credit.)</span></div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Email subject</div>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Message</div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className={input + ' leading-relaxed'} />
              <p className="text-[11px] text-zinc-400 mt-1">Tip: <strong>{'{name}'}</strong> fills in each parent&apos;s first name.</p>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Send by</div>
              <div className="inline-flex bg-zinc-100 rounded-full p-1 text-sm font-bold">
                {(['both', 'email', 'sms'] as const).map((ch) => <button key={ch} onClick={() => setChannel(ch)} className={`px-4 py-2 rounded-full ${channel === ch ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}>{ch === 'both' ? '✉️+📱 Both' : ch === 'email' ? '✉️ Email' : '📱 Text'}</button>)}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-3 py-2.5">Cancel</button>
              <button onClick={send} disabled={busy || !message.trim()} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-extrabold text-sm px-6 py-3 rounded-xl disabled:opacity-50"><Send size={15} /> {busy ? 'Sending…' : 'Send to parents'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-semibold text-zinc-600 mb-1">{label}</span>{children}</label>
}
