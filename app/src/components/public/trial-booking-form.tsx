'use client'
import { useState } from 'react'
import { WaiverConsent, emptyWaiver, waiverError, type WaiverState } from './waiver-consent'

export type ClassOption = { id: string; label: string }

// The full Free Trial Booking form — everything the old Tectonic form asked
// for, plus a real signed waiver. Lead goes to /api/forms/submit; the waiver
// and drawn signature go to /api/public-waiver (Compliance → Signed Waivers).
export function TrialBookingForm({ classOptions, formSlug = 'trial' }: { classOptions: ClassOption[]; formSlug?: string }) {
  const [f, setF] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    street: '', city: '', state: 'QLD', postcode: '',
    child1: '', age1: '', child2: '', age2: '',
    details: '', heard: '',
  })
  const [classes, setClasses] = useState<string[]>([])
  const [waiver, setWaiver] = useState<WaiverState>(emptyWaiver)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState<string | null>(null)

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))
  const toggleClass = (label: string) => setClasses((c) => c.includes(label) ? c.filter((x) => x !== label) : [...c, label])

  const inp = 'w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'
  const lbl = 'text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1 block'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!f.firstName.trim() || !f.lastName.trim()) return setErr('Please add your first and last name.')
    if (!f.phone.trim() || !f.email.trim()) return setErr('Please add both a phone number and an email.')
    if (!f.child1.trim() || !f.age1.trim()) return setErr("Please add your child's name and age.")
    if (!classes.length) return setErr('Please choose at least one class you would like to try.')
    const we = waiverError(waiver, { requireHolidays: true })
    if (we) return setErr(we)

    setState('sending')
    const name = `${f.firstName.trim()} ${f.lastName.trim()}`
    const kids = [f.child1 && `${f.child1} (${f.age1})`, f.child2 && `${f.child2}${f.age2 ? ` (${f.age2})` : ''}`].filter(Boolean).join(', ')
    const address = [f.street, f.city, f.state, f.postcode].filter(Boolean).join(', ')
    const answers = [
      { label: 'Address', value: address },
      { label: 'Children', value: kids },
      { label: 'Classes wanted', value: classes.join(' · ') },
      { label: 'How did you hear about us?', value: f.heard },
      { label: 'Additional details', value: f.details },
      { label: 'Photo/media consent', value: waiver.consentPhoto },
      { label: 'Public holidays acknowledged', value: waiver.publicHolidays ? 'Yes' : 'No' },
      { label: 'Waiver signed by', value: waiver.signerName },
    ].filter((a) => a.value)

    try {
      await fetch('/api/forms/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug, name, email: f.email.trim(), phone: f.phone.trim(),
          childAge: f.age1, message: [kids && `Children: ${kids}`, `Classes: ${classes.join(' · ')}`, f.details].filter(Boolean).join('\n'),
          answers,
        }),
      })
      await fetch('/api/public-waiver', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'free-trial', parentName: waiver.signerName || name,
          email: f.email.trim(), phone: f.phone.trim(), children: kids,
          medical: f.details, consentPhoto: waiver.consentPhoto,
          termsAgreed: waiver.termsAgreed, signature: waiver.signature,
          answers: { address, classes, heard: f.heard, publicHolidays: waiver.publicHolidays },
        }),
      })
      setState('done')
    } catch {
      setState('idle'); setErr('Something went wrong sending your booking — please try again.')
    }
  }

  if (state === 'done') {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-3">🎪</div>
        <h2 className="text-2xl font-black text-zinc-900">You&apos;re booked in!</h2>
        <p className="text-zinc-600 mt-2 max-w-sm mx-auto">Thanks {f.firstName} — we&apos;ve got your free trial request and your signed waiver. The BigStar team will confirm your class time very soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={lbl}>First name *</label><input className={inp} value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
        <div><label className={lbl}>Last name *</label><input className={inp} value={f.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
        <div><label className={lbl}>Phone *</label><input type="tel" className={inp} value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
        <div><label className={lbl}>Email *</label><input type="email" className={inp} value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
      </div>

      <div>
        <label className={lbl}>Address</label>
        <input className={inp + ' mb-2'} placeholder="Street address" value={f.street} onChange={(e) => set('street', e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <input className={inp} placeholder="Suburb" value={f.city} onChange={(e) => set('city', e.target.value)} />
          <input className={inp} placeholder="State" value={f.state} onChange={(e) => set('state', e.target.value)} />
          <input className={inp} placeholder="Postcode" value={f.postcode} onChange={(e) => set('postcode', e.target.value)} />
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-3">
        <div className="text-sm font-black text-[#D72027] uppercase tracking-wide mb-2">Child details</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={lbl}>Child&apos;s name *</label><input className={inp} value={f.child1} onChange={(e) => set('child1', e.target.value)} /></div>
          <div><label className={lbl}>Age of child *</label><input className={inp} value={f.age1} onChange={(e) => set('age1', e.target.value)} /></div>
          <div><label className={lbl}>Second child (optional)</label><input className={inp} value={f.child2} onChange={(e) => set('child2', e.target.value)} /></div>
          <div><label className={lbl}>Age of second child</label><input className={inp} value={f.age2} onChange={(e) => set('age2', e.target.value)} /></div>
        </div>
      </div>

      <div>
        <label className={lbl}>What class would you like to try? * <span className="normal-case font-normal text-zinc-400">(tick all that suit)</span></label>
        <div className="max-h-64 overflow-y-auto border border-zinc-200 rounded-xl p-3 space-y-1.5 bg-zinc-50/60">
          {classOptions.length === 0 && <p className="text-xs text-zinc-400">Class list loading — tell us your preferred day and time in the details box below.</p>}
          {classOptions.map((c) => (
            <label key={c.id} className="flex gap-2 items-start text-[13px] text-zinc-700">
              <input type="checkbox" checked={classes.includes(c.label)} onChange={() => toggleClass(c.label)} className="mt-0.5 w-4 h-4 accent-[#D72027] shrink-0" />
              <span>{c.label}</span>
            </label>
          ))}
          <label className="flex gap-2 items-start text-[13px] text-zinc-700 border-t border-zinc-200 pt-1.5 mt-1.5">
            <input type="checkbox" checked={classes.includes('Other — private lessons, group enquiry, school holiday workshops')} onChange={() => toggleClass('Other — private lessons, group enquiry, school holiday workshops')} className="mt-0.5 w-4 h-4 accent-[#D72027] shrink-0" />
            <span>Other (private lessons, group enquiry, school holiday workshops)</span>
          </label>
        </div>
      </div>

      <div>
        <label className={lbl}>Anything else we should know? <span className="normal-case font-normal text-zinc-400">(medical, allergies, additional needs)</span></label>
        <textarea rows={3} className={inp} value={f.details} onChange={(e) => set('details', e.target.value)} />
      </div>

      <div>
        <label className={lbl}>How did you hear about us?</label>
        <div className="flex gap-4 flex-wrap">
          {['Walk in / Friend', 'Google', 'Facebook', 'Other'].map((h) => (
            <label key={h} className="flex items-center gap-1.5 text-sm text-zinc-700">
              <input type="radio" name="heard" checked={f.heard === h} onChange={() => set('heard', h)} className="w-4 h-4 accent-[#D72027]" />{h}
            </label>
          ))}
        </div>
      </div>

      <WaiverConsent value={waiver} onChange={setWaiver} />

      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}

      <button type="submit" disabled={state === 'sending'}
        className="w-full bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white font-black py-3.5 rounded-xl hover:from-[#A0151B] hover:to-[#7d1015] disabled:opacity-60">
        {state === 'sending' ? 'Sending…' : 'Book my free trial'}
      </button>
      <p className="text-center text-[11px] text-zinc-400">Your details are private and used only to set up your child&apos;s classes.</p>
    </form>
  )
}
