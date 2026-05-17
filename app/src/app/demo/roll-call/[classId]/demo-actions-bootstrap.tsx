'use client'

// Wires the AttendanceGrid up with no-op (in-memory) mark/award functions
// so the /demo route works without a Supabase session.

import { useMemo } from 'react'
import { AttendanceGrid, type RosterEntry, type MarkFn, type AwardFn, type RemoveFn, type SearchFn, type AddFn } from '@/app/roll-call/[classId]/attendance-grid'

export function DemoActionsBootstrap({
  classId,
  date,
  roster,
}: {
  classId: string
  date: string
  roster: RosterEntry[]
}) {
  // In-memory stub — no network. Resolves successfully so optimistic updates stick.
  const onMark: MarkFn = useMemo(
    () => async (input) => {
      // Fake a tiny delay so the "saving…" pill flashes briefly.
      await new Promise((r) => setTimeout(r, 150))
      return { ok: true as const, attendanceId: input.status ? `demo-att-${input.studentId}` : null }
    },
    []
  )

  const onAward: AwardFn = useMemo(
    () => async (input) => {
      await new Promise((r) => setTimeout(r, 200))
      // Find the entry and compute a fake new total
      const entry = roster.find((r) => r.studentId === input.studentId)
      const newTotal = (entry?.totalStars ?? 0) + input.stars
      const newTier =
        newTotal >= 76 ? 5 :
        newTotal >= 36 ? 4 :
        newTotal >= 16 ? 3 :
        newTotal >=  6 ? 2 : 1
      return { ok: true as const, newTotal, newTier }
    },
    [roster]
  )

  // Demo-mode stubs — actions are no-ops with friendly responses
  const onRemove: RemoveFn = useMemo(() => async () => ({ ok: true as const }), [])
  const onSearch: SearchFn = useMemo(() => async () => ({ ok: true as const, results: [] }), [])
  const onAdd: AddFn = useMemo(() => async () => ({ ok: true as const }), [])

  return (
    <AttendanceGrid
      classId={classId}
      date={date}
      roster={roster}
      onMark={onMark}
      onAward={onAward}
      onRemove={onRemove}
      onSearch={onSearch}
      onAdd={onAdd}
    />
  )
}
