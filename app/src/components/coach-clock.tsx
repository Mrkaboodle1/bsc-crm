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
  canManage?: boolean       // admins + head coach: add / rename / remove trainees
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

  async function act(action: string, coachId?: string, name?: string) {
    setBusy(action + (coachId ?? ''))
    try {
      const r = await fetch('/api/coach-clock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, coachId, name }) })
      const d = await r.json().catch(() => ({}))
      if (d && d.ok === false && d.error) alert(d.error)
      await load()
    } finally { setBusy(null) }
  }

  function addTrainee() {
    const name = prompt('New trainee’s name (first + last):')
    if (name && name.trim()) act('trainee-add', undefined, name.trim())
  }
  function renameTrainee(coachId: string, current: string) {
    const name = prompt('Correct name for this trainee:', current)
    if (name && name.trim() && name.trim() !== current) act('trainee-rename', coachId, name.trim())
  }
  function removeTrainee(coachId: string, current: string) {
    if (confirm(`Remove ${current}'s tile from the clock?\n\nTheir logged hours are kept — the tile just goes away.`)) act('trainee-remove', coachId)
  }

  if (!state) return null
  if (!state.ready) {
    // The table isn't in the database yet — say so instead of hiding, or the
    // whole feature looks like it doesn't exist.
    return (
      <div className="mb-5 max-w-3xl bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 text-sm">
        <span className="font-extrabold text-zinc-800">⏱ Time clock is one paste away.</span>{' '}
        <span className="text-zinc-600">Rhett: paste <code className="bg-white px-1.5 py-0.5 rounded text-xs">schema/060_coach_time_logs.sql</code> into the Supabase SQL editor and refresh — coach clock-on/off and the trainee sign-in tiles (Charlie, Louis, Elia) appear right here.</span>
      </div>
    )
  }

  return (
    <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
      {state.me && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">⏱ Your shift</div>
            {state.me.openLogId ? (
              <div className="font-extrabold text-emerald-700">Clocked ON at {fmtTime(state.me.clockIn)}</div>
            ) : (
              <div className="font-extrabold text-zinc-500">Clocked off for today</div>
            )}
            <div className="text-[10px] text-zinc-400 mt-0.5">First sign-in of the day clocks you on automatically. Tap clock off when you finish — reloading won&apos;t restart it.</div>
          </div>
          {state.me.openLogId ? (
            <button
              type="button"
              onClick={() => act('off')}
              disabled={busy === 'off'}
              className="shrink-0 bg-zinc-900 text-white text-sm font-extrabold px-4 py-2.5 rounded-xl hover:bg-zinc-700 disabled:opacity-50"
            >
              {busy === 'off' ? 'Saving…' : 'Clock off'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => act('on')}
              disabled={busy === 'on'}
              className="shrink-0 bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white text-sm font-extrabold px-4 py-2.5 rounded-xl shadow disabled:opacity-50"
            >
              {busy === 'on' ? 'Saving…' : 'Clock back on'}
            </button>
          )}
        </div>
      )}

      {state.trainees.map((t) => (
        <div key={t.coachId} className="bg-white rounded-2xl border-2 border-amber-200 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">
              🎓 Trainee — {t.name}
              {state.canManage && (
                <span className="ml-2 normal-case tracking-normal">
                  <button type="button" onClick={() => renameTrainee(t.coachId, t.name)} className="text-zinc-400 hover:text-zinc-700 font-bold" title="Fix this trainee's name">✎</button>
                  <button type="button" onClick={() => removeTrainee(t.coachId, t.name)} className="ml-1.5 text-zinc-400 hover:text-red-600 font-bold" title="Remove this tile (hours are kept)">✕</button>
                </span>
              )}
            </div>
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

      {state.canManage && (
        <button
          type="button"
          onClick={addTrainee}
          className="border-2 border-dashed border-zinc-300 rounded-2xl p-4 text-sm font-extrabold text-zinc-400 hover:text-zinc-700 hover:border-zinc-400 text-left"
        >
          ＋ Add a trainee tile
        </button>
      )}
    </div>
  )
}
