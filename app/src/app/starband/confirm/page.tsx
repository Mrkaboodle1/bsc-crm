'use client'

// /starband/confirm — the coach's iPad "confirm the roll" + live safety board.
// Big photo cards of everyone currently in the building, the class their roll
// was auto-marked against, and allergy / medical flags front-and-centre.
// Doubles as a live FIRE / EVACUATION REGISTER — hit Print for a paper copy.
// Auto-refreshes every 5s.

import { useEffect, useState } from 'react'

type Session = {
  id: string; student_id: string; name: string; first_name: string
  photo_url: string | null
  checked_in_at: string; checked_out_at: string | null; present: boolean
  class_name: string | null; roll_status: string | null
  flags: string[]
  support_needs: string | null; support_strategy: string | null
}
type Confirm = {
  ok: boolean; date: string; total: number; in_now: number; flagged: number
  sessions: Session[]
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Brisbane' }) } catch { return '' }
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export default function CoachConfirm() {
  const [data, setData] = useState<Confirm | null>(null)
  const [now, setNow] = useState('')

  useEffect(() => {
    const load = async () => {
      try { const r = await fetch('/api/starband/confirm'); setData(await r.json()) } catch { /* ignore */ }
      setNow(new Date().toLocaleString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Brisbane' }))
    }
    void load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  const inNow = data?.sessions.filter((s) => s.present) ?? []
  const out = data?.sessions.filter((s) => !s.present) ?? []

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-6">
      <style>{`@media print {
        .no-print{display:none!important}
        body{background:#fff}
        .print-card{break-inside:avoid;border:1px solid #ccc!important}
      }`}</style>

      <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">✅ Confirm the Roll</h1>
          <div className="text-xs text-zinc-500 mt-1">{now || '…'} · live · auto-refreshes every 5s</div>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={() => window.print()} className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-full font-bold">🔥 Print evacuation register</button>
          <a href="/starband/dashboard" className="text-sm bg-zinc-900 text-white px-3 py-1.5 rounded-full font-bold">Dashboard</a>
          <a href="/starband" className="text-sm bg-amber-400 text-zinc-900 px-3 py-1.5 rounded-full font-bold">Kiosk</a>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="In the building now" value={data?.in_now ?? '–'} colour="emerald" big />
        <Stat label="Medical / allergy flags" value={data?.flagged ?? '–'} colour="red" />
        <Stat label="Checked out today" value={out.length} colour="zinc" />
      </div>

      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5">
        <h2 className="text-sm font-extrabold text-red-700 tracking-widest mb-3">🔥 IN THE BUILDING NOW — EVACUATION REGISTER ({inNow.length})</h2>
        {inNow.length === 0 ? (
          <div className="text-sm text-zinc-400 italic py-6 text-center">No children currently checked in.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {inNow.map((s) => (
              <div key={s.id} className="print-card bg-white rounded-xl border border-zinc-200 p-3 flex gap-3 items-start">
                {s.photo_url
                  ? <img src={s.photo_url} alt="" className="w-14 h-14 rounded-lg object-cover bg-zinc-100 shrink-0" />
                  : <div className="w-14 h-14 rounded-lg bg-amber-200 text-amber-800 font-extrabold flex items-center justify-center shrink-0">{initials(s.name)}</div>}
                <div className="min-w-0">
                  <div className="font-extrabold text-zinc-900 leading-tight">{s.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">In {fmtTime(s.checked_in_at)}</div>
                  {s.class_name && <div className="text-xs text-emerald-700 font-semibold mt-0.5">✓ {s.class_name}</div>}
                  {s.flags.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {s.flags.map((f, i) => (
                        <div key={i} className="text-[11px] font-bold text-red-700 bg-red-100 rounded px-1.5 py-0.5 leading-snug">⚠ {f}</div>
                      ))}
                    </div>
                  )}
                  {(s.support_needs || s.support_strategy) && (
                    <div className="mt-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5 leading-snug">
                      🧠 {s.support_needs}{s.support_needs && s.support_strategy ? ' — ' : ''}{s.support_strategy}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {out.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 no-print">
          <h2 className="text-sm font-extrabold text-zinc-500 tracking-widest mb-3">CHECKED OUT TODAY ({out.length})</h2>
          <ul className="grid sm:grid-cols-2 gap-1">
            {out.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-zinc-50 text-sm">
                <span className="font-semibold text-zinc-700">{s.name}</span>
                <span className="text-xs text-zinc-400">In {fmtTime(s.checked_in_at)} · Out {s.checked_out_at ? fmtTime(s.checked_out_at) : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, colour, big }: { label: string; value: number | string; colour: 'emerald' | 'red' | 'zinc'; big?: boolean }) {
  const colours: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    zinc: 'bg-zinc-100 border-zinc-200 text-zinc-700',
  }
  return (
    <div className={`rounded-2xl border-2 p-4 ${colours[colour]}`}>
      <div className={`${big ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'} font-extrabold`}>{value}</div>
      <div className="text-[10px] tracking-widest uppercase mt-1 opacity-75">{label}</div>
    </div>
  )
}
