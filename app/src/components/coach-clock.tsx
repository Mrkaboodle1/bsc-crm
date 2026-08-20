'use client'

// The time clock on the coach portal.
//  - Coaches: auto-clocked IN when the portal loads (server side); this widget
//    shows the state and carries the "Clock off" button.
//  - Trainees (Charlie): a tap-in / tap-out tile any signed-in coach can use,
//    because trainees don't have their own logins.
// Every entry lands in coach_time_logs and feeds payroll.

import { useEffect, useState } from 'react'

type ClockState = {
  ready: boolean            // table exists
  me: { name: string; openLogId: string | null; clockIn: string | null } | null
  trainees: Array<{ coachId: string; name: string; openLogId: string | null; clockIn: string | null }>
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Brisbane' })
}

export function CoachClock() {
  const [state, setState] = useState<ClockState | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    try {
      const r = await fetch('/api/coach-clock')
      setState(await r.json())
    } catch { setState({ ready: false, me: null, trainees: [] }) }
  }
  useEffect(() => { load() }, [])

  async function act(action: 'off' | 'trainee-in' | 'trainee-out', coachId?: string) {
    setBusy(action + (coachId ?? ''))
    try {
      await fetch('/api/coach-clock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, coachId }) })
      await load()
    } finally { setBusy(null) }
  }

  if (!state || !state.ready) return null

  return (
    <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
      {state.me && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">⏱ Your shift</div>
            {state.me.openLogId ? (
              <div className="font-extrabold text-emerald-700">Clocked ON at {fmtTime(state.me.clockIn)}</div>
            ) : (
              <div className="font-extrabold text-zinc-500">Clocked off — logging in tomorrow clocks you on again</div>
            )}
            <div className="text-[10px] text-zinc-400 mt-0.5">Signing into this portal clocks you on automatically. Tap clock off when you finish.</div>
          </div>
          {state.me.openLogId && (
            <button
              type="button"
              onClick={() => act('off')}
              disabled={busy === 'off'}
              className="shrink-0 bg-zinc-900 text-white text-sm font-extrabold px-4 py-2.5 rounded-xl hover:bg-zinc-700 disabled:opacity-50"
            >
              {busy === 'off' ? 'Saving…' : 'Clock off'}
            </button>
          )}
        </div>
      )}

      {state.trainees.map((t) => (
        <div key={t.coachId} className="bg-white rounded-2xl border-2 border-amber-200 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">🎓 Trainee — {t.name}</div>
            {t.openLogId ? (
              <div className="font-extrabold text-emerald-700">Signed IN at {fmtTime(t.clockIn)}</div>
            ) : (
              <div className="font-extrabold text-zinc-500">Not signed in yet</div>
            )}
            <div className="text-[10px] text-zinc-400 mt-0.5">Tap in the moment {t.name.split(' ')[0]} joins the floor — changed and ready, not walking in the door.</div>
          </div>
          {t.openLogId ? (
            <button type="button" onClick={() => act('trainee-out', t.coachId)} disabled={busy === 'trainee-out' + t.coachId}
              className="shrink-0 bg-zinc-900 text-white text-sm font-extrabold px-4 py-2.5 rounded-xl hover:bg-zinc-700 disabled:opacity-50">
              Sign out
            </button>
          ) : (
            <button type="button" onClick={() => act('trainee-in', t.coachId)} disabled={busy === 'trainee-in' + t.coachId}
              className="shrink-0 bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white text-sm font-extrabold px-4 py-2.5 rounded-xl shadow disabled:opacity-50">
              Sign in
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
