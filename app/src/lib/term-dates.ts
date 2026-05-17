// Queensland state school term dates — source of truth for BSC's roll-call UI.
//
// Dates pulled from education.qld.gov.au/about-us/calendar/future-dates
// + the official QLD school calendar PDF (school-calendar.pdf). Stored
// here so the CRM can render Term 1/2/3/4 + W1..W10 columns on the
// attendance grid without a network round-trip.
//
// Refresh path:
//   - server-jacky/src/cli/fetch-term-dates.ts re-fetches the official page
//     once a year (scheduled in src/index.ts) and overwrites this file.
//   - Manual override: just edit the constants below.
//
// We use ISO dates (YYYY-MM-DD). All dates are Brisbane-time calendar dates.

export type Term = 1 | 2 | 3 | 4

export type TermRange = {
  year: number
  term: Term
  start: string // first Monday of the term (or first day if not a Monday)
  end: string   // last Friday of the term (or last day)
}

// QLD state school term dates 2026 → 2029. Source: education.qld.gov.au
// Last updated: 2026-05-17
export const TERM_DATES: TermRange[] = [
  // 2026 — from official PDF (school-calendar.pdf)
  { year: 2026, term: 1, start: '2026-01-27', end: '2026-04-02' },
  { year: 2026, term: 2, start: '2026-04-20', end: '2026-06-26' },
  { year: 2026, term: 3, start: '2026-07-13', end: '2026-09-18' },
  { year: 2026, term: 4, start: '2026-10-06', end: '2026-12-11' },

  // 2027 — from education.qld.gov.au future-dates page
  { year: 2027, term: 1, start: '2027-01-27', end: '2027-03-25' },
  { year: 2027, term: 2, start: '2027-04-12', end: '2027-06-25' },
  { year: 2027, term: 3, start: '2027-07-12', end: '2027-09-17' },
  { year: 2027, term: 4, start: '2027-10-05', end: '2027-12-10' },

  // 2028 — from education.qld.gov.au future-dates page
  { year: 2028, term: 1, start: '2028-01-24', end: '2028-03-31' },
  { year: 2028, term: 2, start: '2028-04-18', end: '2028-06-23' },
  { year: 2028, term: 3, start: '2028-07-10', end: '2028-09-15' },
  { year: 2028, term: 4, start: '2028-10-03', end: '2028-12-08' },

  // 2029 — from education.qld.gov.au future-dates page
  { year: 2029, term: 1, start: '2029-01-22', end: '2029-03-29' },
  { year: 2029, term: 2, start: '2029-04-16', end: '2029-06-22' },
  { year: 2029, term: 3, start: '2029-07-09', end: '2029-09-14' },
  { year: 2029, term: 4, start: '2029-10-02', end: '2029-12-07' },
]

const ISO_DAY = (s: string): Date => new Date(s + 'T00:00:00+10:00') // Brisbane

/** Return the term range for a given year + term, or null if not known. */
export function getTerm(year: number, term: Term): TermRange | null {
  return TERM_DATES.find((t) => t.year === year && t.term === term) ?? null
}

/** Pick the term that contains the given date (or null if it's in a holiday / unknown). */
export function termContaining(iso: string): TermRange | null {
  const t = ISO_DAY(iso).getTime()
  for (const range of TERM_DATES) {
    if (ISO_DAY(range.start).getTime() <= t && t <= ISO_DAY(range.end).getTime() + 86_400_000) {
      return range
    }
  }
  return null
}

/** The most current relevant term — the one containing today, or the upcoming one. */
export function currentTerm(today?: string): TermRange {
  const iso = today ?? brisbaneToday()
  const inside = termContaining(iso)
  if (inside) return inside
  // Otherwise: find the next term that starts after today, falling back to last known
  const t = ISO_DAY(iso).getTime()
  const upcoming = TERM_DATES
    .filter((r) => ISO_DAY(r.start).getTime() > t)
    .sort((a, b) => ISO_DAY(a.start).getTime() - ISO_DAY(b.start).getTime())[0]
  if (upcoming) return upcoming
  return TERM_DATES[TERM_DATES.length - 1]!
}

/** Compute the 10 week-start dates for a term, anchored to a specific day-of-week. */
export function termWeekDates(range: TermRange, dayOfWeekSunday0: number): string[] {
  // Find the first occurrence of dayOfWeek on or after range.start
  const start = ISO_DAY(range.start)
  const dow = start.getDay()
  const offset = (dayOfWeekSunday0 - dow + 7) % 7
  const firstClass = new Date(start.getTime() + offset * 86_400_000)
  const out: string[] = []
  const endMs = ISO_DAY(range.end).getTime() + 86_400_000
  for (let week = 0; week < 11; week++) {
    const d = new Date(firstClass.getTime() + week * 7 * 86_400_000)
    if (d.getTime() > endMs) break
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** Return all 4 terms for a year (helpful for term-picker UIs). */
export function termsForYear(year: number): TermRange[] {
  return TERM_DATES.filter((t) => t.year === year).sort((a, b) => a.term - b.term)
}

/** Brisbane "today" as an ISO date string. */
export function brisbaneToday(): string {
  const now = new Date()
  const bris = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return bris.toISOString().slice(0, 10)
}

/** Pretty d.m format (e.g. "20.4") matching BSC's roll-sheet column headers. */
export function shortDate(iso: string): string {
  const d = ISO_DAY(iso)
  return `${d.getDate()}.${d.getMonth() + 1}`
}
