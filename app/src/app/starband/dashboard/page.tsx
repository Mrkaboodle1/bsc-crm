'use client'

// /starband/dashboard — reception view of today's StarBand activity.
// Auto-refreshes every 5s so reception staff can leave it open.

import { useEffect, useState } from 'react'

type Session = {
  id: string; student_id: string; nfc_uid: string
  checked_in_at: string; checked_out_at: string | null
  stars_awarded: number; xp_awarded: number
  students: { first_name: string; last_name: string } | null
}
type Dashboard = {
  ok: boolean
  today_count: number; checked_in_count: number; checked_out_count: number
  stars_today: number; sessions: Session[]
}

function fmtTime(iso: string) { try { return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

export default function StarBandDashboard() {
  const [data, setData] = useState<Dashboard | null>(null)

  useEffect(() => {
    const load = async () => {
      try { const r = await fetch('/api/starband/dashboard'); setData(await r.json()) } catch { /* ignore */ }
    }
    void load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  const inSessions = data?.sessions.filter((s) => !s.checked_out_at) ?? []
  const outSessions = data?.sessions.filter((s) => !!s.checked_out_at) ?? []

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">⭐ StarBand Dashboard</h1>
          <div className="text-xs text-zinc-500 mt-1">Today · auto-refreshes every 5s</div>
        </div>
        <div className="flex gap-2">
          <a href="/starband" className="text-sm bg-zinc-900 text-white px-3 py-1.5 rounded-full font-bold">Kiosk</a>
          <a href="/starband/register" className="text-sm bg-amber-400 text-zinc-900 px-3 py-1.5 rounded-full font-bold">Register</a>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Checked in now" value={data?.checked_in_count ?? '–'} colour="emerald" />
        <StatCard label="Checked out" value={data?.checked_out_count ?? '–'} colour="zinc" />
        <StatCard label="Attendance today" value={data?.today_count ?? '–'} colour="red" />
        <StatCard label="Stars awarded today" value={data?.stars_today ?? '–'} colour="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SessionPanel title="Currently checked in" sessions={inSessions} variant="in" />
        <SessionPanel title="Checked out today" sessions={outSessions} variant="out" />
      </div>
    </div>
  )
}

function StatCard({ label, value, colour }: { label: string; value: number | string; colour: 'emerald' | 'zinc' | 'red' | 'amber' }) {
  const colours: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    zinc:    'bg-zinc-100 border-zinc-200 text-zinc-700',
    red:     'bg-red-50 border-red-200 text-red-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
  }
  return (
    <div className={`rounded-2xl border-2 p-4 ${colours[colour]}`}>
      <div className="text-3xl sm:text-4xl font-extrabold">{value}</div>
      <div className="text-[10px] tracking-widest uppercase mt-1 opacity-75">{label}</div>
    </div>
  )
}

function SessionPanel({ title, sessions, variant }: { title: string; sessions: Session[]; variant: 'in' | 'out' }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4">
      <h2 className="text-sm font-extrabold text-zinc-700 tracking-widest mb-3">{title.toUpperCase()} ({sessions.length})</h2>
      {sessions.length === 0 ? (
        <div className="text-sm text-zinc-400 italic py-6 text-center">{variant === 'in' ? 'No one checked in yet today.' : 'No completed sessions yet.'}</div>
      ) : (
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${variant === 'in' ? 'bg-emerald-50' : 'bg-zinc-50'}`}>
              <div>
                <div className="font-bold text-zinc-900">{s.students ? `${s.students.first_name} ${s.students.last_name}` : s.nfc_uid}</div>
                <div className="text-xs text-zinc-500">
                  In {fmtTime(s.checked_in_at)}{s.checked_out_at ? ` · Out ${fmtTime(s.checked_out_at)}` : ''}
                </div>
              </div>
              <div className="text-xs font-extrabold text-amber-600">⭐ {s.stars_awarded}{s.xp_awarded ? ` · XP ${s.xp_awarded}` : ''}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
