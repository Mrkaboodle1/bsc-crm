'use client'

import { useState } from 'react'

type PublicWorkshop = {
  id: string; date: string; title: string; start_time: string; end_time: string
  member_price: number; public_price: number; spotsLeft: number; membersOnly: boolean
}
type Kind = 'workshop' | 'kno'
type Waiver = { liability: string; media: string; medical: string }
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

export function WorkshopBooking({ workshops, paymentUrl, kind = 'workshop', waiver }: { workshops: PublicWorkshop[]; paymentUrl?: string; kind?: Kind; waiver?: Waiver }) {
  const [sel, setSel] = useState<PublicWorkshop | null>(null)
  if (workshops.length === 0) return <p className="text-center text-zinc-500">Nothing is open for booking right now — check back soon!</p>
  return (
    <div className="space-y-3">
      {workshops.map((w) => (
        <div key={w.id} className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-extrabold text-zinc-900">{fmtDate(w.date)}</div>
            <div className="text-sm text-zinc-500">{w.start_time?.slice(0, 5)}–{w.end_time?.slice(0, 5)} · ${Number(w.public_price).toFixed(0)} per child{Number(w.member_price) === 0 ? ' · FREE for members' : ` · members $${Number(w.member_price).toFixed(0)}`}</div>
            {w.membersOnly && <div className="text-xs text-amber-700 font-semibold mt-0.5">Members book first — join the waitlist and we'll confirm when public booking opens.</div>}
            {!w.membersOnly && <div className={`text-xs font-semibold mt-0.5 ${w.spotsLeft > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{w.spotsLeft > 0 ? `${w.spotsLeft} spots left` : 'Full — join the waitlist'}</div>}
          </div>
          <button onClick={() => setSel(w)} className="bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-5 py-2.5 rounded-lg">Book</button>
        </div>
      ))}
      {sel && <BookModal w={sel} kind={kind} paymentUrl={paymentUrl} waiver={waiver} onClose={() => setSel(null)} />}
    </div>
  )
}

function BookModal({ w, kind, paymentUrl, waiver, onClose }: { w: PublicWorkshop; kind: Kind; paymentUrl?: string; waiver?: Waiver; onClose: () => void }) {
  const [f, setF] = useState({ parent_name: '', email: '', phone: '', emergency: '', child_names: '', allergies: '', pizza: '', agree: false, signature: '', media: 'yes' })
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [result, setResult] = useState<{ status: string; message: string } | null>(null)
  const [showWaiver, setShowWaiver] = useState(false)
  const inp = 'w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-900'
  const emoji = kind === 'kno' ? '🌙' : '🏕️'
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.parent_name || (!f.email && !f.phone) || !f.agree || !f.signature.trim() || !f.child_names.trim() || (kind === 'workshop' && !f.emergency.trim())) return
    setState('sending')
    const extras = [f.allergies ? `Allergies: ${f.allergies}` : '', f.pizza ? `Pizza: ${f.pizza}` : ''].filter(Boolean).join(' · ')
    const child_names = extras ? `${f.child_names} (${extras})` : f.child_names
    const notes = [f.emergency ? `Emergency: ${f.emergency}` : '', `Waiver agreed · signed: ${f.signature.trim()} · photos: ${f.media === 'yes' ? 'YES' : 'NO'}`].filter(Boolean).join(' · ')
    try {
      const r = await fetch('/api/workshops/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workshop_id: w.id, parent_name: f.parent_name, email: f.email, phone: f.phone, child_names, notes }) })
      const j = await r.json()
      setResult({ status: j.status || 'error', message: j.message || j.error || 'Something went wrong.' })
    } catch { setResult({ status: 'error', message: 'Something went wrong — please call us on 0489 188 179.' }) }
    setState('done')
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white px-5 py-4 rounded-t-2xl">
          <div className="text-2xl">{emoji}</div>
          <h3 className="font-extrabold">{fmtDate(w.date)}</h3>
          <p className="text-xs text-amber-100">{w.start_time?.slice(0, 5)}–{w.end_time?.slice(0, 5)} · ${Number(w.public_price).toFixed(0)} per child</p>
        </div>
        {state === 'done' && result ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-2">{result.status === 'booked' ? '🎉' : result.status === 'waitlist' ? '📋' : '⚠️'}</div>
            <p className="font-bold text-zinc-900">{result.status === 'booked' ? "You're booked in!" : result.status === 'waitlist' ? "You're on the waitlist" : 'Hmm'}</p>
            <p className="text-sm text-zinc-600 mt-1">{result.message}</p>
            {result.status === 'booked' && paymentUrl && (
              <a href={paymentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm px-4 py-3 rounded-xl">
                💳 Make Payment — ${Number(w.public_price).toFixed(0)} per child
              </a>
            )}
            <button onClick={onClose} className="mt-3 block w-full text-sm font-semibold text-zinc-500">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-3">
            <input className={inp} placeholder="Parent name" value={f.parent_name} onChange={(e) => setF({ ...f, parent_name: e.target.value })} required />
            <input className={inp} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={inp} placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <input className={inp} placeholder={kind === 'workshop' ? 'Emergency contact name & phone *' : 'Emergency contact name & phone'} value={f.emergency} onChange={(e) => setF({ ...f, emergency: e.target.value })} required={kind === 'workshop'} />
            <input className={inp} placeholder="Child name(s) & age" value={f.child_names} onChange={(e) => setF({ ...f, child_names: e.target.value })} />
            <input className={inp} placeholder="Allergies / dietary / medical" value={f.allergies} onChange={(e) => setF({ ...f, allergies: e.target.value })} />
            {kind === 'kno' && (
              <select className={inp} value={f.pizza} onChange={(e) => setF({ ...f, pizza: e.target.value })}>
                <option value="">Pizza preference…</option>
                <option>Cheese</option><option>Pepperoni</option><option>Hawaiian</option><option>Gluten-free</option>
              </select>
            )}
            {/* Waiver */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
              <button type="button" onClick={() => setShowWaiver((s) => !s)} className="text-[11px] font-bold text-zinc-600 underline">{showWaiver ? 'Hide' : 'Read'} the full waiver</button>
              {showWaiver && waiver && (
                <div className="text-[11px] text-zinc-600 space-y-1.5 max-h-40 overflow-y-auto border border-zinc-200 rounded-lg p-2 bg-white">
                  <p><strong>Liability:</strong> {waiver.liability}</p>
                  <p><strong>Emergency medical:</strong> {waiver.medical}</p>
                </div>
              )}
              <label className="flex items-start gap-2 text-[11px] text-zinc-700">
                <input type="checkbox" className="mt-0.5" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />
                <span>I have read and agree to the Big Star Circus liability waiver{kind === 'kno' ? ' and pickup terms' : ''}, and the emergency medical consent above. *</span>
              </label>
              <div className="text-[11px] text-zinc-700">
                <span className="block mb-1">📸 Photos &amp; social media: {waiver?.media || 'May we photograph your child for social media & marketing?'}</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1"><input type="radio" name="media" checked={f.media === 'yes'} onChange={() => setF({ ...f, media: 'yes' })} /> Yes</label>
                  <label className="flex items-center gap-1"><input type="radio" name="media" checked={f.media === 'no'} onChange={() => setF({ ...f, media: 'no' })} /> No</label>
                </div>
              </div>
              <input className={inp} placeholder="Type your full name to sign *" value={f.signature} onChange={(e) => setF({ ...f, signature: e.target.value })} />
            </div>
            <button disabled={state === 'sending' || !f.agree || !f.signature.trim() || !f.child_names.trim() || (kind === 'workshop' && !f.emergency.trim())} className="w-full bg-[#D72027] text-white font-bold text-sm px-4 py-3 rounded-xl disabled:opacity-50">{state === 'sending' ? 'Booking…' : 'Book my spot'}</button>
            <p className="text-[11px] text-zinc-400 text-center">{Number(w.member_price) === 0 ? 'FREE for members. ' : 'Members get priority + their member price. '}You'll pay after booking. Questions? 0489 188 179.</p>
          </form>
        )}
      </div>
    </div>
  )
}
