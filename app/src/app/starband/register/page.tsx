'use client'

// /starband/register — admin pairs a fresh NFC wristband to a student.
// Workflow: tap the new band → UID captured → enter student name (or pick
// existing) → save. Web NFC on Android Chrome; manual UID entry otherwise.

import { useEffect, useState, useCallback } from 'react'

declare global {
  interface Window { NDEFReader?: new () => { scan: () => Promise<void>; addEventListener: (ev: string, fn: (e: { serialNumber?: string }) => void) => void } }
}

type Student = { id: string; first_name: string; last_name: string; nfc_uid: string | null }

export default function StarBandRegister() {
  const [nfc_uid, setNfcUid] = useState('')
  const [nfcStatus, setNfcStatus] = useState<'unsupported' | 'idle' | 'scanning'>('idle')
  const [mode, setMode] = useState<'existing' | 'new'>('new')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [studentId, setStudentId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/starband/students').then((r) => r.json()).then((d) => { if (d.ok) setStudents(d.students) })
  }, [])

  // Web NFC scanner.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.NDEFReader) { setNfcStatus('unsupported'); return }
    const reader = new window.NDEFReader()
    let cancelled = false
    ;(async () => {
      try {
        await reader.scan()
        if (cancelled) return
        setNfcStatus('scanning')
        reader.addEventListener('reading', (e) => {
          if (e.serialNumber) setNfcUid(e.serialNumber)
        })
      } catch { setNfcStatus('unsupported') }
    })()
    return () => { cancelled = true }
  }, [])

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!nfc_uid) { setMsg('Tap the band first (or paste a test UID).'); return }
    setBusy(true)
    try {
      const body = mode === 'existing'
        ? { nfc_uid, student_id: studentId }
        : { nfc_uid, first_name: first, last_name: last, parent_name: parentName, parent_email: parentEmail, parent_phone: parentPhone }
      const r = await fetch('/api/starband/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await r.json()
      if (data.ok) {
        setMsg('✓ Band registered. Ready for the kiosk.')
        setNfcUid(''); setFirst(''); setLast(''); setParentName(''); setParentEmail(''); setParentPhone(''); setStudentId('')
        // reload list
        fetch('/api/starband/students').then((r) => r.json()).then((d) => { if (d.ok) setStudents(d.students) })
      } else {
        setMsg(data.message ?? data.error ?? 'Could not register.')
      }
    } finally { setBusy(false) }
  }, [nfc_uid, mode, studentId, first, last, parentName, parentEmail, parentPhone])

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="max-w-xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-zinc-900">⭐ Register a StarBand</h1>
          <a href="/starband" className="text-sm bg-zinc-900 text-white px-3 py-1.5 rounded-full font-bold">← Kiosk</a>
        </header>

        <div className="bg-white rounded-2xl shadow-md border-2 border-zinc-200 p-6">
          {/* Step 1: NFC UID */}
          <div className="mb-6">
            <label className="block text-xs font-extrabold tracking-widest text-zinc-500 mb-2">STEP 1 · TAP THE NEW BAND</label>
            <div className="flex items-center gap-2">
              <input
                value={nfc_uid}
                onChange={(e) => setNfcUid(e.target.value)}
                placeholder="Tap to scan, or paste UID for testing"
                className="flex-1 px-4 py-3 rounded-xl border-2 border-zinc-200 font-mono text-sm focus:border-red-500 outline-none"
              />
              {nfc_uid && <button type="button" onClick={() => setNfcUid('')} className="px-3 py-2 text-sm text-zinc-500">clear</button>}
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              {nfcStatus === 'scanning' && <span className="inline-flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> NFC reader active — bring band close</span>}
              {nfcStatus === 'unsupported' && 'NFC not available — paste a test UID (e.g. DEMO-NFC-01).'}
            </div>
          </div>

          {/* Step 2: Student */}
          <div className="mb-4">
            <label className="block text-xs font-extrabold tracking-widest text-zinc-500 mb-2">STEP 2 · STUDENT</label>
            <div className="inline-flex bg-zinc-100 rounded-full p-1 mb-3 text-sm font-bold">
              <button type="button" onClick={() => setMode('new')} className={`px-3 py-1.5 rounded-full ${mode === 'new' ? 'bg-white shadow' : 'opacity-70'}`}>New student</button>
              <button type="button" onClick={() => setMode('existing')} className={`px-3 py-1.5 rounded-full ${mode === 'existing' ? 'bg-white shadow' : 'opacity-70'}`}>Existing</button>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'new' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input required value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name *" className="px-4 py-3 rounded-xl border-2 border-zinc-200" />
                  <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" className="px-4 py-3 rounded-xl border-2 border-zinc-200" />
                </div>
                <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Parent name (optional)" className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="Parent email" className="px-4 py-3 rounded-xl border-2 border-zinc-200" />
                  <input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="Parent phone" className="px-4 py-3 rounded-xl border-2 border-zinc-200" />
                </div>
              </>
            ) : (
              <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 bg-white">
                <option value="">Select a student…</option>
                {students.filter((s) => !s.nfc_uid).map((s) => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
            )}

            <button
              type="submit"
              disabled={busy || !nfc_uid}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-extrabold py-4 rounded-xl text-lg"
            >
              {busy ? 'Registering…' : '⭐ Register StarBand'}
            </button>
          </form>

          {msg && <div className={`mt-4 p-3 rounded-xl text-sm font-bold ${msg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{msg}</div>}
        </div>

        {/* Already-paired list for reference */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
          <h2 className="text-sm font-extrabold text-zinc-500 tracking-widest mb-2">PAIRED BANDS ({students.filter((s) => s.nfc_uid).length})</h2>
          <ul className="space-y-1 text-sm">
            {students.filter((s) => s.nfc_uid).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0">
                <span className="font-bold">{s.first_name} {s.last_name}</span>
                <code className="text-xs text-zinc-500 font-mono">{s.nfc_uid}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
