'use client'

// /starband/bulk — Rapid band pairing. Connect your whole roll fast:
// tap a band (UID fills) → tap the child's name → paired instantly → next band.
// Reuses POST /api/starband/register in "existing student" mode. No page reloads.

import { useEffect, useState, useCallback, useMemo } from 'react'

declare global {
  interface Window { NDEFReader?: new () => { scan: () => Promise<void>; addEventListener: (ev: string, fn: (e: { serialNumber?: string }) => void) => void } }
}

type Student = { id: string; first_name: string; last_name: string; nfc_uid: string | null; tag_count?: number }

export default function StarBandBulk() {
  const [students, setStudents] = useState<Student[]>([])
  const [nfc_uid, setNfcUid] = useState('')
  const [nfcStatus, setNfcStatus] = useState<'unsupported' | 'idle' | 'scanning'>('idle')
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const [filter, setFilter] = useState<'all' | 'unpaired'>('all')
  const [justPaired, setJustPaired] = useState<Record<string, string>>({}) // studentId -> uid

  const load = useCallback(() => {
    fetch('/api/starband/students').then((r) => r.json()).then((d) => { if (d.ok) setStudents(d.students) })
  }, [])
  useEffect(() => { load() }, [load])

  // Auto-dismiss the toast after ~1.6s.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1600)
    return () => clearTimeout(t)
  }, [toast])

  // Web NFC reader — fills the UID box on every tap.
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
          if (e.serialNumber) { setNfcUid(e.serialNumber.toUpperCase()); beep() }
        })
      } catch { setNfcStatus('unsupported') }
    })()
    return () => { cancelled = true }
  }, [])

  function beep() {
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      const ctx = new Ctx()
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 880; g.gain.value = 0.05
      o.start(); o.stop(ctx.currentTime + 0.08)
    } catch { /* ignore */ }
  }

  const assign = useCallback(async (student: Student) => {
    const uid = nfc_uid.trim().toUpperCase()
    if (!uid) { setToast({ text: 'Tap or paste a band UID first.', ok: false }); return }
    setBusyId(student.id)
    try {
      const r = await fetch('/api/starband/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nfc_uid: uid, student_id: student.id, kind: 'wristband' }),
      })
      const d = await r.json()
      if (d.ok) {
        setToast({ text: `✓ Band paired to ${student.first_name}`, ok: true })
        setJustPaired((p) => ({ ...p, [student.id]: uid }))
        setStudents((ss) => ss.map((s) => s.id === student.id ? { ...s, nfc_uid: uid, tag_count: (s.tag_count ?? 0) + 1 } : s))
        setNfcUid('') // clear, ready for next band
      } else {
        setToast({ text: d.message ?? d.error ?? 'Could not pair.', ok: false })
      }
    } finally { setBusyId(null) }
  }, [nfc_uid])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return students
      .filter((s) => filter === 'all' || !s.nfc_uid)
      .filter((s) => !needle || `${s.first_name} ${s.last_name}`.toLowerCase().includes(needle))
      .sort((a, b) => a.first_name.localeCompare(b.first_name))
  }, [students, q, filter])

  const pairedCount = students.filter((s) => s.nfc_uid).length

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900">⚡ Rapid Band Pairing</h1>
            <p className="text-sm text-zinc-500">Tap a band, then tap the child. {pairedCount}/{students.length} kids paired.</p>
          </div>
          <div className="flex gap-2">
            <a href="/starband/register" className="text-sm bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-full font-bold">One-by-one</a>
            <a href="/starband" className="text-sm bg-zinc-900 text-white px-3 py-1.5 rounded-full font-bold">← Kiosk</a>
          </div>
        </header>

        {/* Sticky band capture bar */}
        <div className="sticky top-2 z-10 bg-white rounded-2xl shadow-lg border-2 border-[#D72027] p-4 mb-4">
          <label className="block text-[10px] font-extrabold tracking-widest text-zinc-500 mb-2">STEP 1 · TAP THE BAND</label>
          <div className="flex items-center gap-2">
            <input
              value={nfc_uid}
              onChange={(e) => setNfcUid(e.target.value.toUpperCase())}
              placeholder="Tap band, or paste UID (e.g. 04:8A:9B:C2)"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-zinc-200 font-mono text-base focus:border-[#D72027] outline-none"
            />
            {nfc_uid && <button onClick={() => setNfcUid('')} className="px-3 py-2 text-sm text-zinc-500 font-bold">clear</button>}
          </div>
          <div className="text-xs mt-2 h-4">
            {nfcStatus === 'scanning' && <span className="inline-flex items-center gap-2 text-emerald-600 font-semibold"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> NFC reader active — bring band close</span>}
            {nfcStatus === 'unsupported' && <span className="text-zinc-500">NFC tap works on Android Chrome. Otherwise use your phone&apos;s NFC Tools app to read the UID, then paste it above.</span>}
          </div>
          {nfc_uid && <div className="mt-2 text-sm font-bold text-[#D72027]">Band ready: <code className="font-mono">{nfc_uid}</code> — now tap a child below 👇</div>}
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-2 mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a child…"
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-sm focus:border-[#D72027] outline-none"
          />
          <div className="inline-flex bg-zinc-100 rounded-full p-1 text-xs font-bold">
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-full ${filter === 'all' ? 'bg-white shadow' : 'opacity-70'}`}>All</button>
            <button onClick={() => setFilter('unpaired')} className={`px-3 py-1.5 rounded-full ${filter === 'unpaired' ? 'bg-white shadow' : 'opacity-70'}`}>Unpaired</button>
          </div>
        </div>

        {/* Student list */}
        <ul className="space-y-2">
          {filtered.length === 0 && (
            <li className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-400">
              {filter === 'unpaired' ? 'Every child has a band 🎉' : 'No matches.'}
            </li>
          )}
          {filtered.map((s) => {
            const paired = !!s.nfc_uid
            const justNow = justPaired[s.id]
            return (
              <li key={s.id} className={`bg-white rounded-xl border-2 p-3 flex items-center gap-3 ${justNow ? 'border-emerald-400 bg-emerald-50' : paired ? 'border-zinc-100' : 'border-zinc-200'}`}>
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                  {s.first_name[0]}{s.last_name?.[0] ?? ''}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-zinc-900 truncate">{s.first_name} {s.last_name}</div>
                  {paired ? (
                    <div className="text-[11px] text-emerald-600 font-semibold truncate">⌚ {justNow ?? s.nfc_uid}{(s.tag_count ?? 0) > 1 ? ` · ${s.tag_count} tags` : ''}</div>
                  ) : (
                    <div className="text-[11px] text-zinc-400">No band yet</div>
                  )}
                </div>
                <button
                  onClick={() => assign(s)}
                  disabled={!nfc_uid || busyId === s.id}
                  className={`text-sm font-extrabold px-4 py-2.5 rounded-xl shrink-0 disabled:opacity-30 ${paired ? 'bg-white border-2 border-zinc-200 text-zinc-700' : 'bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white'}`}
                >
                  {busyId === s.id ? '…' : paired ? 'Re-pair' : 'Assign band'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl shadow-2xl font-extrabold text-sm ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
