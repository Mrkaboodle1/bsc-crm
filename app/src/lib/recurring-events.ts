// Standing weekly gigs that aren't classes and aren't one-off appointments.
// Rendered on the calendar like a recurring rule (no DB rows), so they're easy
// to adjust here whenever the arrangement changes.

export type RecurringEvent = {
  title: string
  type: string        // maps to APPT_TYPE_META (gig / show)
  startLabel: string  // e.g. "1:00pm"
  endLabel: string    // e.g. "3:00pm"
  sortMin: number     // minutes from midnight, for ordering
  coach: string | null
  location: string
  note?: string
}

const SATURDAY = 6

// Fortnight parity is anchored to the first Saturday of 2026 (2026-01-03).
// index 0 → Rhett's week, index 1 → Charlie's week, then alternating.
function saturdayIndex(dateStr: string): number {
  const anchor = Date.parse('2026-01-03T00:00:00Z')
  const ms = Date.parse(`${dateStr}T00:00:00Z`) - anchor
  return Math.round(ms / (7 * 86_400_000))
}

export function recurringEventsFor(dateStr: string): RecurringEvent[] {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10))
  const dow = new Date(y, m - 1, d).getDay()
  if (dow !== SATURDAY) return []

  const big4Coach = saturdayIndex(dateStr) % 2 === 0 ? 'Rhett Morrow' : 'Charlie'

  return [
    {
      title: 'BIG4 Holiday Park',
      type: 'gig',
      startLabel: '1:00pm', endLabel: '3:00pm', sortMin: 13 * 60,
      coach: big4Coach,
      location: 'BIG4 Holiday Park',
      note: `Fortnightly — ${big4Coach === 'Rhett Morrow' ? "Rhett's week" : "Charlie's week"} (alternates Rhett / Charlie)`,
    },
    {
      title: 'Paradise Resort — solo show',
      type: 'show',
      startLabel: '7:00pm', endLabel: '8:00pm', sortMin: 19 * 60,
      coach: 'Rhett Morrow',
      location: 'Paradise Resort',
      note: 'Rhett solo, every Saturday night',
    },
  ]
}
