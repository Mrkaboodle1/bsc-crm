'use client'
import { useState } from 'react'
import { WaiverConsent, emptyWaiver, waiverError, type WaiverState } from './waiver-consent'

const TIERS = [
  { id: 'star-leaders', label: 'Star Leaders — ages 11–14 · $195' },
  { id: 'junior-coach', label: 'Junior Coach Certificate — ages 14–17 · $395' },
  { id: 'coach-conversion', label: 'Coach Conversion — adults 18+ · $1,195' },
]

// Coach Academy application. Lead → /api/forms/submit (lands in the CRM as a
// lead tagged 'coach-academy'); parent/guardian consent + drawn signature →
// /api/public-waiver so it files with the other signed waivers.
export function CoachAcademyForm() {
  const [f, setF] = useState({
    tier: 'junior-coach', firstName: '', lastName: '', dob: '', age: '',
    email: '', phone: '', parentName: '', parentPhone: '',
    school: '', experience: '', why: '',
  })
  const [waiver, setWaiver] = useState<WaiverState>(emptyWaiver)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState<string | null>(null)

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))
  const under18 = Number(f.age) > 0 && Number(f.age) < 18
  const inp = 'w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'
  const lbl = 'text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1 block'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!f.firstName.trim() || !f.lastName.trim()) return setErr('Please add your first and last name.')
    if (!f.age.trim()) return setErr('Please add your age — it decides which tier suits you.')
    if (!f.email.trim() || !f.phone.trim()) return setErr('Please add an email and a phone number.')
    if (under18 && (!f.parentName.trim() || !f.parentPhone.trim())) return setErr('Under 18s need a parent or guardian name and contact number.')
    if (!f.why.trim()) return setErr('Tell us briefly why you want to coach.')
    const we = waiverError(waiver)
    if (we) return setErr(we)

    setState('sending')
    const name = `${f.firstName.trim()} ${f.lastName.trim()}`
    const tierLabel = TIERS.find((t) => t.id === f.tier)?.label ?? f.tier
    const answers = [
      { label: 'Tier applied for', value: tierLabel },
      { label: 'Age', value: f.age },
      { label: 'Date of birth', value: f.dob },
      { label: 'Parent / guardian', value: under18 ? `${f.parentName} — ${f.parentPhone}` : 'n/a (18+)' },
      { label: 'Trains at (school / club)', value: f.school },
      { label: 'Experience', value: f.experience },
      { label: 'Why they want to coach', value: f.why },
      { label: 'Photo/media consent', value: waiver.consentPhoto },
      { label: 'Consent signed by', value: waiver.signerName },
    ].filter((a) => a.value)

    try {
      await fetch('/api/forms/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug: 'coach-academy', name, email: f.email.trim(), phone: f.phone.trim(),
          childAge: f.age,
          message: `COACH ACADEMY APPLICATION — ${tierLabel}\nTrains at: ${f.school || 'not given'}\nExperience: ${f.experience || 'none given'}\nWhy: ${f.why}`,
          answers,
        }),
      })
      await fetch('/api/public-waiver', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'coach-academy', parentName: waiver.signerName || f.parentName || name,
          email: f.email.trim(), phone: f.phone.trim(), children: name,
          consentPhoto: waiver.consentPhoto, termsAgreed: waiver.termsAgreed,
          signature: waiver.signature,
          answers: { tier: f.tier, age: f.age, school: f.school, under18 },
        }),
      })
      setState('done')
    } catch {
      setState('idle'); setErr('Something went wrong sending your application — please try again, or call 0489 188 179.')
    }
  }

  if (state === 'done') {
    return (
      <div className="text-center py-14 px-6">
        <div className="text-6xl mb-3">🌟</div>
        <h2 className="text-2xl font-black text-zinc-900">Application received!</h2>
        <p className="text-zinc-600 mt-2 max-w-md mx-auto">
          Thanks {f.firstName} — we&apos;ve got it. We&apos;ll be in touch within a few days about the next intake, and let you know how to secure your place.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={lbl}>Which one are you applying for? *</label>
        <select className={inp} value={f.tier} onChange={(e) => set('tier', e.target.value)}>
          {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={lbl}>First name *</label><input className={inp} value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
        <div><label className={lbl}>Last name *</label><input className={inp} value={f.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
        <div><label className={lbl}>Date of birth</label><input type="date" className={inp} value={f.dob} onChange={(e) => set('dob', e.target.value)} /></div>
        <div><label className={lbl}>Age *</label><input className={inp} value={f.age} onChange={(e) => set('age', e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g. 15" /></div>
        <div><label className={lbl}>Email *</label><input type="email" className={inp} value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div><label className={lbl}>Phone *</label><input type="tel" className={inp} value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
      </div>

      {under18 && (
        <div className="grid sm:grid-cols-2 gap-3 border-2 border-[#D72027]/20 rounded-xl p-3 bg-red-50/30">
          <div className="sm:col-span-2 text-xs font-black uppercase tracking-wide text-[#D72027]">Parent / guardian (required under 18)</div>
          <div><label className={lbl}>Parent / guardian name *</label><input className={inp} value={f.parentName} onChange={(e) => set('parentName', e.target.value)} /></div>
          <div><label className={lbl}>Their phone *</label><input type="tel" className={inp} value={f.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} /></div>
        </div>
      )}

      <div>
        <label className={lbl}>Where do you train now? <span className="normal-case font-normal text-zinc-400">(dance, gym, cheer, circus — any school welcome)</span></label>
        <input className={inp} value={f.school} onChange={(e) => set('school', e.target.value)} placeholder="e.g. BigStar Circus, or another school / club" />
      </div>

      <div>
        <label className={lbl}>Your experience</label>
        <textarea rows={3} className={inp} value={f.experience} onChange={(e) => set('experience', e.target.value)} placeholder="What have you trained in, and for how long? Any helping or coaching you've already done?" />
      </div>

      <div>
        <label className={lbl}>Why do you want to coach? *</label>
        <textarea rows={3} className={inp} value={f.why} onChange={(e) => set('why', e.target.value)} placeholder="A few sentences is plenty." />
      </div>

      <WaiverConsent value={waiver} onChange={setWaiver} showHolidays={false} />

      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}

      <button type="submit" disabled={state === 'sending'}
        className="w-full bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white font-black py-3.5 rounded-xl hover:from-[#A0151B] hover:to-[#7d1015] disabled:opacity-60">
        {state === 'sending' ? 'Sending…' : 'Apply for the Coach Academy'}
      </button>
      <p className="text-center text-[11px] text-zinc-400">No payment now — we&apos;ll confirm your place first.</p>
    </form>
  )
}
