'use client'

// BIGSTAR StarBand kiosk — reception screen. Reads NFC via Web NFC API
// (Android Chrome only), falls back to a manual demo picker on iPad / laptop.
// Each tap toggles: not-in → checked-in (+5 stars); checked-in → checked-out
// (+5 stars +10 XP). No login — designed to live on a reception tablet.
//
// MIFARE Classic fallback: NFC TagInfo (by NXP) on Android shows the card's
// UID. Tap "Share UID → Copy". Paste into the input below, or use the
// share-as-URL trick:  https://<kiosk>/starband?uid=04:8A:9B:C2:11
// The kiosk auto-fires the tap when ?uid= is present.

import { useEffect, useState, useCallback, useRef } from 'react'

// Normalise any UID so "04:8a:9b" and "04-8A-9B" and " 048A9B " all match.
// Trim → uppercase. Demo UIDs like DEMO-NFC-01 stay intact (no chars stripped).
function normaliseUid(raw: string): string {
  return (raw || '').trim().toUpperCase()
}

type Student = { id: string; first_name: string; last_name: string; nfc_uid: string | null; photo_url?: string | null; pin_code?: string | null; stars_total: number; xp_total: number; attendance_streak: number; checked_in: boolean; tag_count?: number }
type KioskMode = 'tap' | 'faces' | 'pin'
type TapResult = {
  ok: boolean; action?: string; message?: string; error?: string
  student?: { name: string; stars: number; xp: number; streak: number }
  stars_awarded?: number; xp_awarded?: number
}

// Browser type augmentation for Web NFC (Chrome Android).
declare global {
  interface Window { NDEFReader?: new () => { scan: () => Promise<void>; addEventListener: (ev: string, fn: (e: { serialNumber?: string }) => void) => void } }
}

export default function StarBandKiosk() {
  const [result, setResult] = useState<TapResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [nfcStatus, setNfcStatus] = useState<'unsupported' | 'idle' | 'scanning' | 'error'>('idle')
  const [students, setStudents] = useState<Student[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [mode, setMode] = useState<KioskMode>('tap')
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Layer 3 — face-tap: posts the student id directly.
  const tapStudent = useCallback(async (id: string) => {
    if (busy || !id) return
    setBusy(true)
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    try {
      const r = await fetch('/api/starband/by-student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: id }) })
      const data: TapResult = await r.json()
      setResult(data)
      void loadStudents()
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message, message: 'Connection problem — try again.' })
    } finally {
      setBusy(false)
      dismissTimer.current = setTimeout(() => setResult(null), 6000)
    }
  }, [busy])

  // Layer 4 — PIN entry.
  const tapPin = useCallback(async (pin: string) => {
    if (busy || !pin) return
    setBusy(true)
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    try {
      const r = await fetch('/api/starband/by-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
      const data: TapResult = await r.json()
      setResult(data)
      void loadStudents()
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message, message: 'Connection problem — try again.' })
    } finally {
      setBusy(false)
      dismissTimer.current = setTimeout(() => setResult(null), 6000)
    }
  }, [busy])

  const tap = useCallback(async (raw_uid: string) => {
    const nfc_uid = normaliseUid(raw_uid)
    if (busy || !nfc_uid) return
    setBusy(true)
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    try {
      // Decide check-in or check-out by what we already know about the student.
      const local = students.find((s) => normaliseUid(s.nfc_uid ?? '') === nfc_uid)
      const endpoint = local?.checked_in ? '/api/starband/checkout' : '/api/starband/checkin'
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nfc_uid }) })
      const data: TapResult = await r.json()
      setResult(data)
      void loadStudents() // refresh local cache for next tap
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message, message: 'Connection problem — try again.' })
    } finally {
      setBusy(false)
      dismissTimer.current = setTimeout(() => setResult(null), 6000)
    }
  }, [busy, students])

  // Real NFC scanning (Chrome Android only).
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
          const uid = e.serialNumber || ''
          if (uid) void tap(uid)
        })
        reader.addEventListener('readingerror', () => setNfcStatus('error'))
      } catch {
        setNfcStatus('unsupported')
      }
    })()
    return () => { cancelled = true }
  }, [tap])

  const loadStudents = useCallback(async () => {
    try {
      const r = await fetch('/api/starband/students')
      const data = await r.json()
      if (data.ok) setStudents(data.students)
    } catch { /* ignore */ }
  }, [])
  useEffect(() => { void loadStudents() }, [loadStudents])

  // Auto-fire if ?uid= is on the URL (NFC TagInfo Share → URL fallback).
  // Reads window.location.search to avoid the useSearchParams() Suspense rule.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const uid = params.get('uid') || params.get('UID')
    if (uid) {
      // Strip from address bar so a refresh doesn't re-fire.
      window.history.replaceState({}, '', window.location.pathname)
      void tap(uid)
    }
  }, [tap])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#1a0f24 0%,#3a0f24 60%,#A0151B 100%)' }}>
      {/* Watermark */}
      <div className="absolute top-6 left-6 flex items-center gap-3 text-amber-300 font-extrabold text-lg tracking-wide">
        ⭐ BIGSTAR CIRCUS
      </div>
      <div className="absolute top-6 right-6 flex items-center gap-3 text-xs">
        <a href="/starband/dashboard" className="bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20">Dashboard</a>
        <a href="/starband/register" className="bg-amber-400 text-zinc-900 font-bold px-3 py-1.5 rounded-full hover:bg-amber-300">Register band</a>
      </div>

      {/* Mode tabs (hidden when showing a tap result) */}
      {!result && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex gap-1 bg-white/10 backdrop-blur p-1 rounded-full border border-white/20">
          {(['tap', 'faces', 'pin'] as KioskMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-full transition ${mode === m ? 'bg-amber-400 text-zinc-900' : 'text-white/80 hover:text-white'}`}
            >
              {m === 'tap' ? '⭐ Tap' : m === 'faces' ? '👦 Faces' : '🔢 PIN'}
            </button>
          ))}
        </div>
      )}

      {result ? (
        <TapResultView r={result} onDismiss={() => setResult(null)} />
      ) : mode === 'tap' ? (
        <KioskIdle status={nfcStatus} onManual={() => setShowPicker(true)} onUidEntered={tap} />
      ) : mode === 'faces' ? (
        <KioskFaces students={students} onPick={tapStudent} busy={busy} />
      ) : (
        <KioskPin onSubmit={tapPin} busy={busy} />
      )}

      {/* Manual picker (fallback / demo mode) */}
      {showPicker && (
        <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white text-zinc-900 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold">Demo / Manual mode</h2>
              <button onClick={() => setShowPicker(false)} className="text-2xl leading-none">×</button>
            </div>
            <p className="text-xs text-zinc-500 mb-3">Tap a student to simulate a wristband scan.</p>
            <ul className="space-y-1">
              {students.map((s) => (
                <li key={s.id}>
                  <button
                    disabled={!s.nfc_uid || busy}
                    onClick={() => { setShowPicker(false); if (s.nfc_uid) void tap(s.nfc_uid) }}
                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition ${s.checked_in ? 'bg-emerald-50 border border-emerald-200' : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200'} ${!s.nfc_uid ? 'opacity-40' : ''}`}
                  >
                    <div>
                      <div className="font-bold">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-zinc-500">{s.nfc_uid ?? 'no band'} · ⭐ {s.stars_total} · XP {s.xp_total}</div>
                    </div>
                    <div className="text-xs font-extrabold">{s.checked_in ? 'CHECK OUT →' : 'CHECK IN →'}</div>
                  </button>
                </li>
              ))}
              {students.length === 0 && <li className="text-sm text-zinc-500 p-4 text-center">No students yet. Open <a href="/starband/register" className="underline font-bold">Register</a>.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function KioskIdle({ status, onManual, onUidEntered }: { status: 'unsupported' | 'idle' | 'scanning' | 'error'; onManual: () => void; onUidEntered: (uid: string) => void }) {
  const [manualUid, setManualUid] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  return (
    <div className="text-center px-6 w-full max-w-md">
      <div className="text-6xl sm:text-8xl mb-2">⭐</div>
      <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-3">BIGSTAR CIRCUS</h1>
      <h2 className="text-2xl sm:text-3xl font-bold mb-8 opacity-90">Tap your StarBand</h2>
      <div className="text-sm opacity-70 mb-6">
        {status === 'scanning' && <span className="inline-flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> NFC reader active — bring band close</span>}
        {status === 'unsupported' && 'NFC auto-scan not available on this device.'}
        {status === 'error' && 'NFC error — use the input below to enter a UID manually.'}
        {status === 'idle' && 'Starting NFC reader…'}
      </div>

      {/* Manual / TagInfo paste field — works with any 13.56 MHz card (incl. MIFARE Classic) */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (manualUid.trim()) { onUidEntered(manualUid); setManualUid('') } }}
        className="flex gap-2 mb-3"
      >
        <input
          type="text" inputMode="text" autoComplete="off" spellCheck={false}
          value={manualUid} onChange={(e) => setManualUid(e.target.value)}
          placeholder="Paste or type UID…"
          className="flex-1 bg-white/10 border border-white/30 rounded-full px-4 py-3 text-white placeholder-white/50 font-mono text-sm focus:outline-none focus:bg-white/20"
        />
        <button type="submit" className="bg-amber-400 text-zinc-900 font-extrabold px-5 py-3 rounded-full hover:bg-amber-300">Tap →</button>
      </form>

      <div className="flex gap-2 justify-center flex-wrap">
        <button onClick={onManual} className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/30">
          Demo students →
        </button>
        <button onClick={() => setShowHelp((s) => !s)} className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/30">
          {showHelp ? 'Hide help' : 'MIFARE / Jaycar card?'}
        </button>
      </div>

      {showHelp && (
        <div className="mt-5 text-left bg-white/10 border border-white/20 rounded-2xl p-4 text-xs leading-relaxed">
          <div className="font-extrabold text-amber-300 mb-2">Reading a MIFARE / Jaycar 13.56 MHz card:</div>
          <ol className="list-decimal pl-5 space-y-1 opacity-90">
            <li>Install <a href="https://play.google.com/store/apps/details?id=com.nxp.taginfolite" target="_blank" rel="noreferrer" className="underline font-bold">NFC TagInfo</a> on Android.</li>
            <li>Open it, tap your card. It shows a <span className="font-mono">UID</span>.</li>
            <li>Long-press the UID → <b>Copy</b>.</li>
            <li>Paste it into the field above → <b>Tap →</b>.</li>
          </ol>
          <div className="mt-2 opacity-70">Or share <span className="font-mono">…/starband?uid=YOUR-UID</span> from the app for one-tap.</div>
        </div>
      )}
    </div>
  )
}

function TapResultView({ r, onDismiss }: { r: TapResult; onDismiss: () => void }) {
  const success = r.ok && r.student
  return (
    <button onClick={onDismiss} className="text-center px-6 max-w-2xl w-full" aria-label="Dismiss">
      {success ? (
        <>
          <div className="text-7xl sm:text-9xl mb-3">⭐</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-1">{r.action === 'checked_out' ? 'Goodbye' : r.action === 'already_in' ? 'Already in' : 'Welcome'} {r.student!.name.split(' ')[0]}!</h1>
          <p className="text-lg sm:text-2xl opacity-90 mb-6">{r.action === 'checked_out' ? 'Session complete · See you next time!' : r.action === 'already_in' ? 'You\'re already checked in.' : 'Attendance recorded'}</p>
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
            <Stat label="STARS" value={r.student!.stars} bonus={r.stars_awarded ? `+${r.stars_awarded}` : null} />
            <Stat label="XP" value={r.student!.xp} bonus={r.xp_awarded ? `+${r.xp_awarded}` : null} />
            <Stat label="STREAK" value={r.student!.streak} />
          </div>
          <div className="mt-8 text-xs opacity-60">tap anywhere to dismiss · auto-closes in 6s</div>
        </>
      ) : (
        <>
          <div className="text-7xl mb-3">⚠️</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Band not recognised</h1>
          <p className="text-base opacity-90 mb-6">{r.message ?? r.error}</p>
          <a href="/starband/register" className="inline-block bg-amber-400 text-zinc-900 px-6 py-3 rounded-full font-extrabold">Register this band →</a>
        </>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Layer 3 — face-tap photo grid (works without any card)
// ─────────────────────────────────────────────────────────────────────────
function KioskFaces({ students, onPick, busy }: { students: Student[]; onPick: (id: string) => void; busy: boolean }) {
  const [q, setQ] = useState('')
  const filtered = students.filter((s) =>
    !q.trim() || (`${s.first_name} ${s.last_name}`.toLowerCase().includes(q.trim().toLowerCase())),
  )
  return (
    <div className="px-4 pt-32 pb-10 max-w-5xl mx-auto w-full">
      <div className="text-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">No band today? Tap your face. 👋</h1>
        <p className="text-sm opacity-75">No watch, no problem — find yourself below.</p>
      </div>
      <input
        type="text" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Search a name…"
        className="w-full bg-white/10 border border-white/30 rounded-full px-4 py-2.5 text-white placeholder-white/50 text-sm mb-4 focus:outline-none focus:bg-white/20"
      />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {filtered.map((s) => (
          <button
            key={s.id} disabled={busy}
            onClick={() => onPick(s.id)}
            className={`rounded-2xl p-2 border-2 transition ${s.checked_in ? 'border-emerald-400 bg-emerald-400/20' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-zinc-700 mb-1.5 relative">
              {s.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photo_url} alt={s.first_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold opacity-60">
                  {(s.first_name?.[0] ?? '?') + (s.last_name?.[0] ?? '')}
                </div>
              )}
              {s.checked_in && <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">IN</span>}
            </div>
            <div className="text-xs font-bold leading-tight truncate">{s.first_name}</div>
            <div className="text-[10px] opacity-60 leading-tight truncate">{s.last_name}</div>
          </button>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center opacity-60 py-8 text-sm">No matches.</div>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Layer 4 — PIN keypad (kid remembers a 4-digit code)
// ─────────────────────────────────────────────────────────────────────────
function KioskPin({ onSubmit, busy }: { onSubmit: (pin: string) => void; busy: boolean }) {
  const [pin, setPin] = useState('')
  const push = (d: string) => setPin((p) => (p.length < 6 ? p + d : p))
  const back = () => setPin((p) => p.slice(0, -1))
  const submit = () => { if (pin.length >= 3) { onSubmit(pin); setPin('') } }
  return (
    <div className="text-center px-6 w-full max-w-xs pt-32">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Enter your code</h1>
      <p className="text-sm opacity-70 mb-6">4 digits → tap ✓</p>
      <div className="flex gap-2 justify-center mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-extrabold ${pin[i] ? 'border-amber-400 bg-white/10' : 'border-white/30'}`}>
            {pin[i] ? '●' : ''}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {['1','2','3','4','5','6','7','8','9'].map((d) => (
          <button key={d} onClick={() => push(d)} className="bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-2xl py-5 text-2xl font-extrabold">{d}</button>
        ))}
        <button onClick={back} className="bg-white/10 hover:bg-white/20 rounded-2xl py-5 text-xl">⌫</button>
        <button onClick={() => push('0')} className="bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-2xl py-5 text-2xl font-extrabold">0</button>
        <button onClick={submit} disabled={busy || pin.length < 3} className="bg-amber-400 text-zinc-900 hover:bg-amber-300 active:bg-amber-500 rounded-2xl py-5 text-xl font-extrabold disabled:opacity-40">✓</button>
      </div>
    </div>
  )
}

function Stat({ label, value, bonus }: { label: string; value: number; bonus?: string | null }) {
  return (
    <div className="bg-white/10 rounded-2xl py-5 px-2 border border-white/20">
      <div className="text-3xl sm:text-4xl font-extrabold">{value}</div>
      <div className="text-[10px] tracking-widest opacity-70 mt-1">{label}</div>
      {bonus && <div className="text-amber-300 font-extrabold text-sm mt-1">{bonus}</div>}
    </div>
  )
}
