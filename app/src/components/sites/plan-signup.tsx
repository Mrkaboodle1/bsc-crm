'use client'

// The website signup popup — BigStar's answer to Tectonic's checkout modal,
// wired to our own Stripe Payment Links. Three steps, exactly as Rhett wants:
//   1. Who's coming — pick the plan (kids × classes, price per week)
//   2. Pick the classes — the real weekly timetable, live from the CRM
//   3. Your details & signature — parent, kids, waiver, drawn signature
// then straight to Stripe's own secure page for the card. Card numbers never
// touch our site.

import { useEffect, useMemo, useState } from 'react'
import { SignaturePad } from '@/components/public/signature-pad'
import { WaiverConsent, emptyWaiver, waiverError, type WaiverState } from '@/components/public/waiver-consent'

export type PlanItem = {
  eyebrow?: string
  price: string
  per?: string
  sub?: string
  btnText?: string
  href?: string
  classesPerWeek?: number
  kids?: number
}

type PublicClass = { id: string; name: string; day: string; time: string; minutes: number }

function planLabel(p: PlanItem): string {
  return [p.eyebrow, p.price, p.per].filter(Boolean).join(' ')
}

export function PlanSignupButton({ plan, allPlans }: { plan: PlanItem; allPlans: PlanItem[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-center bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white font-black text-sm px-4 py-3.5 rounded-xl hover:from-[#A0151B] hover:to-[#7d1015] shadow cursor-pointer"
      >
        {plan.btnText || 'Enrol now'}
      </button>
      <div className="text-center text-[10px] text-zinc-400 mt-2">🔒 Secure payment by Stripe · No contracts — cancel anytime</div>
      {open && <SignupModal initial={plan} plans={allPlans} onClose={() => setOpen(false)} />}
    </>
  )
}

function SignupModal({ initial, plans, onClose }: { initial: PlanItem; plans: PlanItem[]; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [plan, setPlan] = useState<PlanItem>(initial)
  const [classes, setClasses] = useState<PublicClass[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [picked, setPicked] = useState<string[]>([])
  const [parentName, setParentName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [kidNames, setKidNames] = useState<string[]>([''])
  const [medical, setMedical] = useState('')
  const [waiver, setWaiver] = useState<WaiverState>(emptyWaiver)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const kidsNeeded = plan.kids ?? 1
  const classesNeeded = plan.classesPerWeek ?? 1

  useEffect(() => {
    fetch('/api/public-classes')
      .then((r) => r.json())
      .then((d) => setClasses(d.classes ?? []))
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false))
  }, [])

  // keep the kid-name inputs in step with the chosen plan
  useEffect(() => {
    setKidNames((names) => {
      const n = [...names]
      while (n.length < kidsNeeded) n.push('')
      return n.slice(0, Math.max(kidsNeeded, n.filter(Boolean).length || 1))
    })
  }, [kidsNeeded])

  const byDay = useMemo(() => {
    const m = new Map<string, PublicClass[]>()
    for (const c of classes) {
      if (!m.has(c.day)) m.set(c.day, [])
      m.get(c.day)!.push(c)
    }
    return m
  }, [classes])

  function togglePicked(id: string) {
    setError(null)
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  function next() {
    setError(null)
    if (step === 2 && picked.length === 0) { setError('Pick at least one class so we know where to expect you.'); return }
    setStep((s) => s + 1)
  }

  async function submit() {
    setError(null)
    if (!parentName.trim() || !email.trim() || !phone.trim()) { setError('Please fill in your name, email and phone.'); return }
    const kids = kidNames.map((k) => k.trim()).filter(Boolean)
    if (kids.length === 0) { setError("Please add your child's name."); return }
    const wErr = waiverError(waiver, { requireHolidays: true })
    if (wErr) { setError(wErr); return }
    if (!plan.href) { setError('This plan has no payment link yet — please call us on 0489 188 179.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/public-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: waiver.signerName || parentName,
          email, phone,
          kids: kids.map((name) => ({ name })),
          classIds: picked,
          planLabel: planLabel(plan),
          medical,
          consentPhoto: waiver.consentPhoto,
          termsAgreed: waiver.termsAgreed,
          signature: waiver.signature,
        }),
      })
      const d = await res.json()
      if (!d.ok) { setError(d.error || 'Something went wrong — please call us on 0489 188 179.'); setBusy(false); return }
      // Saved. Now Stripe's secure page takes the payment.
      window.location.href = plan.href
    } catch {
      setError('Something went wrong — please call us on 0489 188 179.')
      setBusy(false)
    }
  }

  const stepTitle = step === 1 ? "Who's coming?" : step === 2 ? 'Pick your classes' : 'Your details & signature'

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full my-4" onClick={(e) => e.stopPropagation()}>
        {/* header + steps */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div className="text-xl font-black text-zinc-900">Let&apos;s get started 🎪</div>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 font-black text-zinc-500">✕</button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? 'bg-[#D72027]' : 'bg-zinc-200'}`} />
            ))}
          </div>
          <div className="text-xs font-bold text-zinc-500 mt-2">Step {step} of 3 — {stepTitle}</div>
        </div>

        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-2.5">
              {plans.map((p, i) => {
                const active = planLabel(p) === planLabel(plan)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setPlan(p); setError(null) }}
                    className={`w-full text-left rounded-2xl border-2 px-4 py-3 flex items-center justify-between gap-3 transition ${active ? 'border-[#D72027] bg-red-50/60 shadow' : 'border-zinc-200 hover:border-zinc-300 bg-white'}`}
                  >
                    <div>
                      <div className="font-extrabold text-zinc-900 text-sm">{p.eyebrow || 'Plan'}</div>
                      {p.sub && <div className="text-[11px] text-zinc-500 font-bold mt-0.5">{p.sub}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-black text-[#14213d]">{p.price}</span>
                      <span className="text-[11px] font-bold text-zinc-400 block">{p.per || 'per week'}</span>
                    </div>
                  </button>
                )
              })}
              <p className="text-[11px] text-zinc-400 pt-1">Billed weekly. No contracts — cancel anytime with two weeks&apos; notice.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 font-bold">
                Tick the {classesNeeded > 1 ? `${classesNeeded} classes` : 'class'} {kidsNeeded > 1 ? 'your kids' : 'your child'} will attend each week.
              </p>
              {loadingClasses && <div className="text-sm text-zinc-400">Loading this term&apos;s timetable…</div>}
              {!loadingClasses && [...byDay.entries()].map(([day, list]) => (
                <div key={day}>
                  <div className="text-[11px] uppercase tracking-wider font-black text-[#D72027] mb-1.5">{day}</div>
                  <div className="space-y-1.5">
                    {list.map((c) => (
                      <label key={c.id} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 cursor-pointer transition ${picked.includes(c.id) ? 'border-[#D72027] bg-red-50/60' : 'border-zinc-200 hover:border-zinc-300'}`}>
                        <input type="checkbox" checked={picked.includes(c.id)} onChange={() => togglePicked(c.id)} className="w-4 h-4 accent-[#D72027] shrink-0" />
                        <span className="text-sm font-bold text-zinc-800">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {picked.length > classesNeeded * Math.max(1, kidsNeeded) && (
                <p className="text-[11px] text-amber-600 font-bold">That&apos;s more classes than your plan covers — all good if kids attend different classes, we&apos;ll sort the details with you.</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Parent / guardian full name…" className="w-full px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email address…" className="w-full px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="Phone number…" className="w-full px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none" />
              {kidNames.map((k, i) => (
                <input key={i} value={k} onChange={(e) => setKidNames((ns) => ns.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Child ${kidNames.length > 1 ? i + 1 : ''} full name…`.replace('  ', ' ')} className="w-full px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none" />
              ))}
              {kidNames.length < 4 && (
                <button type="button" onClick={() => setKidNames((ns) => [...ns, ''])} className="text-xs font-extrabold text-[#D72027] hover:underline">＋ Add another child</button>
              )}
              <textarea value={medical} onChange={(e) => setMedical(e.target.value)} rows={2} placeholder="Medical conditions, allergies or additional needs (optional)…" className="w-full px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none resize-none" />
              <div className="pt-1">
                <WaiverConsent value={waiver} onChange={setWaiver} showHolidays />
              </div>
              {!waiver.signature && (
                <div className="pt-1">
                  <SignaturePad value={waiver.signature} onChange={(sig) => setWaiver((w) => ({ ...w, signature: sig }))} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-zinc-100">
          {error && <div className="mb-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg px-3 py-2 text-sm text-red-800 font-bold">{error}</div>}
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-black text-[#14213d]">{plan.price}</span>
              <span className="text-zinc-400 font-bold text-xs"> {plan.per || 'per week'}</span>
              <div className="text-[10px] text-zinc-400">{plan.eyebrow}</div>
            </div>
            <div className="flex gap-2">
              {step > 1 && (
                <button type="button" onClick={() => { setStep((s) => s - 1); setError(null) }} className="px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-sm font-extrabold text-zinc-600 hover:bg-zinc-50">← Back</button>
              )}
              {step < 3 ? (
                <button type="button" onClick={next} className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white text-sm font-black shadow hover:from-[#A0151B] hover:to-[#7d1015]">Next →</button>
              ) : (
                <button type="button" onClick={submit} disabled={busy} className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white text-sm font-black shadow hover:from-[#A0151B] hover:to-[#7d1015] disabled:opacity-60">
                  {busy ? 'Saving…' : 'Sign & pay securely →'}
                </button>
              )}
            </div>
          </div>
          {step === 3 && <div className="text-center text-[10px] text-zinc-400 mt-2">🔒 Card details are entered on Stripe&apos;s secure page — never on this site.</div>}
        </div>
      </div>
    </div>
  )
}
