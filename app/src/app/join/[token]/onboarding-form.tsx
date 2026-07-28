'use client'

import { useRef, useState } from 'react'
import type { WelcomeSection } from '@/lib/coach-welcome-sections'

const inp = 'w-full px-3 py-2.5 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'
const lbl = 'text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1 block'

const CREDS: Array<{ key: string; label: string; expiry: boolean; hint?: string }> = [
  { key: 'blue_card', label: 'Blue Card (Working with Children)', expiry: true },
  { key: 'first_aid', label: 'First Aid + CPR certificate', expiry: true },
  { key: 'public_liability', label: 'Public Liability Insurance', expiry: true },
  { key: 'drivers_licence', label: "Driver's Licence", expiry: true },
  { key: 'gymnastics', label: 'Gymnastics / coaching accreditation', expiry: false, hint: 'e.g. Gymnastics Australia, cheer, acro' },
]

type Other = { id: number; label: string; expiry: string; file: File | null }
type Fields = Record<string, string>

function FileField({ file, onPick }: { file: File | null; onPick: (f: File | null) => void }) {
  const chooseRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => chooseRef.current?.click()} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-sm px-3 py-2 rounded-lg">📎 Choose file</button>
        <button type="button" onClick={() => camRef.current?.click()} className="bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-3 py-2 rounded-lg">📷 Take a photo</button>
      </div>
      {file && <div className="mt-1.5 text-xs text-emerald-700 font-bold">✓ {file.name.length > 28 ? file.name.slice(0, 28) + '…' : file.name} <button type="button" onClick={() => onPick(null)} className="text-zinc-400 hover:text-red-500 font-normal underline ml-1">remove</button></div>}
      <input ref={chooseRef} type="file" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </div>
  )
}

function SignaturePad({ canvasRef, onDraw }: { canvasRef: React.RefObject<HTMLCanvasElement | null>; onDraw: () => void }) {
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!; const r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }
  function down(e: React.PointerEvent) { drawing.current = true; last.current = pos(e); (e.target as Element).setPointerCapture(e.pointerId) }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return
    const c = canvasRef.current!; const ctx = c.getContext('2d')!; const p = pos(e)
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    last.current = p; onDraw()
  }
  function up() { drawing.current = false; last.current = null }
  function clear() { const c = canvasRef.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height) }
  return (
    <div>
      <canvas ref={canvasRef} width={600} height={200} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className="w-full h-40 bg-white border-2 border-dashed border-zinc-300 rounded-xl touch-none cursor-crosshair" />
      <button type="button" onClick={clear} className="mt-1 text-xs font-bold text-zinc-500 hover:text-zinc-800">Clear signature</button>
    </div>
  )
}

function Confetti() {
  const colors = ['#D72027', '#FFC107', '#22c55e', '#3b82f6', '#ec4899', '#f97316']
  const bits = Array.from({ length: 90 }, (_, i) => i)
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      <style>{`@keyframes bsc-fall{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:1}}`}</style>
      {bits.map((i) => {
        const left = (i * 37) % 100, delay = (i % 10) * 0.15, dur = 2.4 + (i % 5) * 0.5, size = 6 + (i % 4) * 3
        return <div key={i} style={{ position: 'absolute', top: 0, left: `${left}%`, width: size, height: size * 1.6, background: colors[i % colors.length], animation: `bsc-fall ${dur}s linear ${delay}s forwards`, borderRadius: 2 }} />
      })}
    </div>
  )
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const [head, b64] = dataurl.split(','); const mime = head.match(/:(.*?);/)?.[1] || 'image/png'
  const bin = atob(b64); const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new File([arr], filename, { type: mime })
}

export function OnboardingForm({ token, sections }: { token: string; sections: WelcomeSection[] }) {
  const N = sections.length
  const CARDS = 2, SLIDE0 = 3, CONFIRM = 3 + N, SIGN = 4 + N
  const [step, setStep] = useState(0)
  const [f, setF] = useState<Fields>({})
  const [creds, setCreds] = useState<Record<string, { file: File | null; expiry: string }>>({})
  const [others, setOthers] = useState<Other[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const sigRef = useRef<HTMLCanvasElement>(null)
  const [signed, setSigned] = useState(false)

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const setCred = (k: string, patch: Partial<{ file: File | null; expiry: string }>) =>
    setCreds((c) => { const prev = c[k] ?? { file: null, expiry: '' }; return { ...c, [k]: { ...prev, ...patch } } })

  function next() {
    setError(null)
    if (step === 0) {
      if (!f.fullName?.trim()) return setError('Please enter your full name.')
      if (!f.email?.trim()) return setError('Please enter your email.')
      if (!f.phone?.trim()) return setError('Please enter your mobile.')
    }
    if (step === SIGN) return submit()
    setStep((s) => s + 1)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function back() { setError(null); setStep((s) => Math.max(0, s - 1)); window.scrollTo({ top: 0 }) }

  async function uploadOne(type: string, file: File): Promise<string | null> {
    const fd = new FormData(); fd.set('token', token); fd.set('type', type); fd.set('file', file)
    const res = await fetch('/api/coach-onboarding/upload', { method: 'POST', body: fd })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'A file failed to upload')
    return j.path
  }

  async function submit() {
    if (!signed && !f.agreementName?.trim()) return setError('Please sign, or type your name to sign.')
    setBusy(true); setError(null)
    try {
      const docs: Array<{ docType: string; label?: string; path?: string; expiry?: string }> = []
      for (const c of CREDS) {
        const cur = creds[c.key]
        if (cur?.file) { setProgress(`Uploading ${c.label}…`); const p = await uploadOne(c.key, cur.file); docs.push({ docType: c.key, path: p || undefined, expiry: cur.expiry || undefined }) }
      }
      for (const o of others) {
        if (o.file) { setProgress(`Uploading ${o.label || 'certificate'}…`); const p = await uploadOne('other', o.file); docs.push({ docType: 'other', label: o.label || 'Other document', path: p || undefined, expiry: o.expiry || undefined }) }
      }
      if (signed && sigRef.current) {
        setProgress('Saving your signature…')
        const p = await uploadOne('signature', dataURLtoFile(sigRef.current.toDataURL('image/png'), 'signature.png'))
        docs.push({ docType: 'signature', path: p || undefined })
      }
      setProgress('Setting you up…')
      const payload = { token, agreementName: f.agreementName || f.fullName, docs, ...f }
      const res = await fetch('/api/coach-onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json().catch(() => ({}))
      setBusy(false); setProgress('')
      if (!res.ok) return setError(j.error || 'Something went wrong saving your sign-up.')
      setDone(j.coachName || f.fullName || 'there')
    } catch (err) { setBusy(false); setProgress(''); setError((err as Error).message || 'Could not submit — try again.') }
  }

  if (done) {
    return (
      <>
        <Confetti />
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center relative">
          <div className="text-6xl mb-3">🎉🎪</div>
          <h2 className="text-3xl font-black text-zinc-900">Congratulations, {done.split(' ')[0]}!</h2>
          <p className="text-lg text-[#D72027] font-black mt-1">You&apos;re now a BigStar Circus coach.</p>
          <p className="text-zinc-600 mt-3">Welcome to the family. You&apos;re all set up in our system — we&apos;ll be in touch about your first shift, and we&apos;ll nudge you before any of your cards expire. 🌟</p>
        </div>
      </>
    )
  }

  const total = SIGN + 1
  const pct = Math.round((step / SIGN) * 100)

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      {/* progress */}
      <div className="mb-5">
        <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1"><span>Step {step + 1} of {total}</span><span>{pct}%</span></div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#D72027] to-[#FFC107] rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
      </div>

      {error && <div className="mb-4 bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3 text-sm text-red-800 font-semibold">⚠️ {error}</div>}

      {/* STEP 0 — details */}
      {step === 0 && (
        <section>
          <h3 className="text-xl font-black text-zinc-900 mb-3">👋 Your details</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={lbl}>Full name *</label><input className={inp} value={f.fullName || ''} onChange={(e) => set('fullName', e.target.value)} /></div>
            <div><label className={lbl}>Date of birth 🎂</label><input type="date" className={inp} value={f.dob || ''} onChange={(e) => set('dob', e.target.value)} /></div>
            <div><label className={lbl}>Email *</label><input type="email" className={inp} value={f.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
            <div><label className={lbl}>Mobile *</label><input className={inp} value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={lbl}>Home address</label><input className={inp} value={f.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
          </div>
          <p className="text-xs text-zinc-400 mt-2">We celebrate every coach&apos;s birthday 🎂 — that&apos;s why we ask.</p>
        </section>
      )}

      {/* STEP 1 — pay */}
      {step === 1 && (
        <section>
          <h3 className="text-xl font-black text-zinc-900 mb-1">💼 Getting you paid</h3>
          <p className="text-sm text-zinc-500 mb-3">Contractor, paid fortnightly with super on top. No ABN yet? Free at <a className="text-[#D72027] font-bold underline" href="https://register.business.gov.au/" target="_blank" rel="noreferrer">business.gov.au</a>.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={lbl}>ABN</label><input className={inp} value={f.abn || ''} onChange={(e) => set('abn', e.target.value)} /></div>
            <div><label className={lbl}>Tax File Number</label><input className={inp} value={f.tfn || ''} onChange={(e) => set('tfn', e.target.value)} /><p className="text-[11px] text-amber-700 mt-1">🔒 Sent to Rhett for the accountant — not stored in our system.</p></div>
          </div>
          <div className="mt-3 bg-zinc-50 rounded-xl p-3">
            <div className="text-sm font-black text-zinc-700 mb-2">Bank account (for pay)</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className={lbl}>Account name</label><input className={inp} value={f.bankAccountName || ''} onChange={(e) => set('bankAccountName', e.target.value)} /></div>
              <div><label className={lbl}>BSB</label><input className={inp} value={f.bankBsb || ''} onChange={(e) => set('bankBsb', e.target.value)} /></div>
              <div><label className={lbl}>Account number</label><input className={inp} value={f.bankAccountNumber || ''} onChange={(e) => set('bankAccountNumber', e.target.value)} /></div>
            </div>
          </div>
          <div className="mt-3 bg-zinc-50 rounded-xl p-3">
            <div className="text-sm font-black text-zinc-700 mb-2">Superannuation fund</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={lbl}>Fund name</label><input className={inp} value={f.superFundName || ''} onChange={(e) => set('superFundName', e.target.value)} /></div>
              <div><label className={lbl}>Member number</label><input className={inp} value={f.superMemberNumber || ''} onChange={(e) => set('superMemberNumber', e.target.value)} /></div>
              <div><label className={lbl}>Fund ABN</label><input className={inp} value={f.superFundAbn || ''} onChange={(e) => set('superFundAbn', e.target.value)} /></div>
              <div><label className={lbl}>Fund USI</label><input className={inp} value={f.superFundUsi || ''} onChange={(e) => set('superFundUsi', e.target.value)} /></div>
            </div>
          </div>
        </section>
      )}

      {/* STEP 2 — cards */}
      {step === CARDS && (
        <section>
          <h3 className="text-xl font-black text-zinc-900 mb-1">📎 Your cards & certificates</h3>
          <p className="text-sm text-zinc-500 mb-3">Snap a photo with your phone or upload any file. Add the expiry so we can remind you before it runs out.</p>
          <div className="space-y-3">
            {CREDS.map((c) => (
              <div key={c.key} className="border border-zinc-200 rounded-xl p-3">
                <div className="font-bold text-zinc-800 text-sm">{c.label}</div>
                {c.hint && <div className="text-xs text-zinc-400 mb-1">{c.hint}</div>}
                <div className="grid sm:grid-cols-2 gap-3 mt-1.5 items-start">
                  <FileField file={creds[c.key]?.file ?? null} onPick={(file) => setCred(c.key, { file })} />
                  {c.expiry && <div><label className={lbl}>Expiry date</label><input type="date" value={creds[c.key]?.expiry ?? ''} onChange={(e) => setCred(c.key, { expiry: e.target.value })} className={inp} /></div>}
                </div>
              </div>
            ))}
            {others.map((o) => (
              <div key={o.id} className="border border-zinc-200 rounded-xl p-3 bg-amber-50/40">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><label className={lbl}>Certificate name</label><input value={o.label} onChange={(e) => setOthers((a) => a.map((x) => x.id === o.id ? { ...x, label: e.target.value } : x))} className={inp} /></div>
                  <div><label className={lbl}>Expiry (if any)</label><input type="date" value={o.expiry} onChange={(e) => setOthers((a) => a.map((x) => x.id === o.id ? { ...x, expiry: e.target.value } : x))} className={inp} /></div>
                </div>
                <div className="mt-2"><FileField file={o.file} onPick={(file) => setOthers((a) => a.map((x) => x.id === o.id ? { ...x, file } : x))} /></div>
              </div>
            ))}
            <button type="button" onClick={() => setOthers((a) => [...a, { id: (a[a.length - 1]?.id ?? 0) + 1, label: '', expiry: '', file: null }])} className="text-sm font-bold text-[#D72027] hover:underline">+ Add another certificate</button>
          </div>
        </section>
      )}

      {/* WELCOME SLIDES */}
      {step >= SLIDE0 && step < CONFIRM && sections[step - SLIDE0] && (
        <section className="min-h-[300px]">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#D72027] mb-1">A little about us · {step - SLIDE0 + 1}/{N}</div>
          <h3 className="text-2xl font-black text-zinc-900 mb-3">{sections[step - SLIDE0]!.title}</h3>
          <div className="text-[15px] leading-relaxed text-zinc-700 whitespace-pre-line">{sections[step - SLIDE0]!.body}</div>
        </section>
      )}

      {/* CONFIRM */}
      {step === CONFIRM && (
        <section className="text-center py-4">
          <div className="text-4xl mb-2">🙌</div>
          <h3 className="text-2xl font-black text-zinc-900">You&apos;ve read everything!</h3>
          <p className="text-zinc-600 mt-2 max-w-md mx-auto">Before we finish — please double-check the details you entered are correct (name, email, super &amp; bank). You can tap <strong>Back</strong> to fix anything. When you&apos;re happy, hit Next to sign.</p>
        </section>
      )}

      {/* SIGN */}
      {step === SIGN && (
        <section>
          <h3 className="text-xl font-black text-zinc-900 mb-1">✍️ The BigStar Promise</h3>
          <div className="bg-[#FFF9E6] border border-[#FFC107]/50 rounded-xl p-4 text-sm text-zinc-800 italic mb-4">
            &quot;I promise to always put children first. I promise to create confidence. I promise to protect every child. I promise to keep learning. I promise to represent BigStar Circus with pride.&quot;
          </div>
          <label className={lbl}>Sign here</label>
          <SignaturePad canvasRef={sigRef} onDraw={() => setSigned(true)} />
          <div className="mt-3"><label className={lbl}>Type your full name to confirm</label><input className={inp} value={f.agreementName || ''} onChange={(e) => set('agreementName', e.target.value)} placeholder="Your full name" /></div>
          {busy && progress && <div className="mt-3 text-sm text-zinc-500 font-semibold">{progress}</div>}
        </section>
      )}

      {/* nav */}
      <div className="mt-7 flex items-center justify-between gap-2">
        {step > 0 ? <button type="button" onClick={back} disabled={busy} className="text-sm font-bold text-zinc-500 px-4 py-2.5 rounded-lg hover:bg-zinc-100">← Back</button> : <span />}
        <button type="button" onClick={next} disabled={busy} className="bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white font-black text-base px-6 py-3 rounded-xl shadow-md hover:from-[#A0151B] hover:to-[#8a1218] disabled:opacity-60">
          {busy ? (progress || 'Working…') : step === SIGN ? '🎪 Finish & join BigStar' : step === CONFIRM ? 'Next — sign →' : step >= SLIDE0 ? 'Next →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
