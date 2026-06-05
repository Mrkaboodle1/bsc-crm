// Australian / Queensland calendar overlays for the BSC calendar:
//   - QLD state-school term dates (2026–2029, official — education.qld.gov.au)
//   - School-holiday ranges (the gaps between terms)
//   - QLD statewide public holidays (qld.gov.au)
//   - Cultural & religious "dates of significance" (subtle background hints,
//     based on the Dept of Home Affairs multicultural calendar)
//
// All dates are plain YYYY-MM-DD strings interpreted as Brisbane local days
// (Queensland has no daylight saving, so no tz juggling needed here).

export type Term = { year: number; term: 1 | 2 | 3 | 4; start: string; end: string }
export type DateRange = { start: string; end: string; label: string }
export type NamedDate = { date: string; name: string }
export type Significance = { start: string; end?: string; name: string; group: string }

// ── QLD state-school TERMS ────────────────────────────────────────────────
export const TERMS: Term[] = [
  { year: 2026, term: 1, start: '2026-01-27', end: '2026-04-02' },
  { year: 2026, term: 2, start: '2026-04-20', end: '2026-06-26' },
  { year: 2026, term: 3, start: '2026-07-13', end: '2026-09-18' },
  { year: 2026, term: 4, start: '2026-10-06', end: '2026-12-11' },
  { year: 2027, term: 1, start: '2027-01-27', end: '2027-03-25' },
  { year: 2027, term: 2, start: '2027-04-12', end: '2027-06-25' },
  { year: 2027, term: 3, start: '2027-07-12', end: '2027-09-17' },
  { year: 2027, term: 4, start: '2027-10-05', end: '2027-12-10' },
  { year: 2028, term: 1, start: '2028-01-24', end: '2028-03-31' },
  { year: 2028, term: 2, start: '2028-04-18', end: '2028-06-23' },
  { year: 2028, term: 3, start: '2028-07-10', end: '2028-09-15' },
  { year: 2028, term: 4, start: '2028-10-03', end: '2028-12-08' },
  { year: 2029, term: 1, start: '2029-01-22', end: '2029-03-29' },
  { year: 2029, term: 2, start: '2029-04-16', end: '2029-06-22' },
  { year: 2029, term: 3, start: '2029-07-09', end: '2029-09-14' },
  { year: 2029, term: 4, start: '2029-10-02', end: '2029-12-07' },
]

// ── SCHOOL HOLIDAYS (the gaps between terms, incl. the summer break) ───────
export const SCHOOL_HOLIDAYS: DateRange[] = [
  { start: '2026-04-03', end: '2026-04-19', label: 'Autumn holidays' },
  { start: '2026-06-27', end: '2026-07-12', label: 'Winter holidays' },
  { start: '2026-09-19', end: '2026-10-05', label: 'Spring holidays' },
  { start: '2026-12-12', end: '2027-01-26', label: 'Summer holidays' },
  { start: '2027-03-26', end: '2027-04-11', label: 'Autumn holidays' },
  { start: '2027-06-26', end: '2027-07-11', label: 'Winter holidays' },
  { start: '2027-09-18', end: '2027-10-04', label: 'Spring holidays' },
  { start: '2027-12-11', end: '2028-01-23', label: 'Summer holidays' },
  { start: '2028-04-01', end: '2028-04-17', label: 'Autumn holidays' },
  { start: '2028-06-24', end: '2028-07-09', label: 'Winter holidays' },
  { start: '2028-09-16', end: '2028-10-02', label: 'Spring holidays' },
  { start: '2028-12-09', end: '2029-01-21', label: 'Summer holidays' },
  { start: '2029-03-30', end: '2029-04-15', label: 'Autumn holidays' },
  { start: '2029-06-23', end: '2029-07-08', label: 'Winter holidays' },
  { start: '2029-09-15', end: '2029-10-01', label: 'Spring holidays' },
  { start: '2029-12-08', end: '2030-01-28', label: 'Summer holidays' },
]

// ── QLD statewide PUBLIC HOLIDAYS ─────────────────────────────────────────
export const PUBLIC_HOLIDAYS: NamedDate[] = [
  // 2026
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-26', name: 'Australia Day' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-04', name: 'Easter Saturday' },
  { date: '2026-04-05', name: 'Easter Sunday' },
  { date: '2026-04-06', name: 'Easter Monday' },
  { date: '2026-04-25', name: 'Anzac Day' },
  { date: '2026-05-04', name: 'Labour Day' },
  { date: '2026-10-05', name: "King's Birthday" },
  { date: '2026-12-24', name: 'Christmas Eve (from 6pm)' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-28', name: 'Boxing Day (observed)' },
  // 2027
  { date: '2027-01-01', name: "New Year's Day" },
  { date: '2027-01-26', name: 'Australia Day' },
  { date: '2027-03-26', name: 'Good Friday' },
  { date: '2027-03-27', name: 'Easter Saturday' },
  { date: '2027-03-28', name: 'Easter Sunday' },
  { date: '2027-03-29', name: 'Easter Monday' },
  { date: '2027-04-26', name: 'Anzac Day (observed)' },
  { date: '2027-05-03', name: 'Labour Day' },
  { date: '2027-10-04', name: "King's Birthday" },
  { date: '2027-12-24', name: 'Christmas Eve (from 6pm)' },
  { date: '2027-12-25', name: 'Christmas Day' },
  { date: '2027-12-28', name: 'Boxing Day (observed)' },
  // 2028
  { date: '2028-01-01', name: "New Year's Day" },
  { date: '2028-01-26', name: 'Australia Day' },
  { date: '2028-04-14', name: 'Good Friday' },
  { date: '2028-04-15', name: 'Easter Saturday' },
  { date: '2028-04-16', name: 'Easter Sunday' },
  { date: '2028-04-17', name: 'Easter Monday' },
  { date: '2028-04-25', name: 'Anzac Day' },
  { date: '2028-05-01', name: 'Labour Day' },
  { date: '2028-10-02', name: "King's Birthday" },
  { date: '2028-12-25', name: 'Christmas Day' },
  { date: '2028-12-26', name: 'Boxing Day' },
  // 2029
  { date: '2029-01-01', name: "New Year's Day" },
  { date: '2029-01-26', name: 'Australia Day' },
  { date: '2029-03-30', name: 'Good Friday' },
  { date: '2029-03-31', name: 'Easter Saturday' },
  { date: '2029-04-01', name: 'Easter Sunday' },
  { date: '2029-04-02', name: 'Easter Monday' },
  { date: '2029-04-25', name: 'Anzac Day' },
  { date: '2029-05-07', name: 'Labour Day' },
  { date: '2029-10-01', name: "King's Birthday" },
  { date: '2029-12-25', name: 'Christmas Day' },
  { date: '2029-12-26', name: 'Boxing Day' },
]

// ── CULTURAL & RELIGIOUS DATES OF SIGNIFICANCE ────────────────────────────
// Shown faintly in the background so Rhett can see them without them shouting.
// Fixed-date Australian observances repeat yearly; moveable feasts are listed
// per-year where the date shifts (2026 + 2027 where known).
export const SIGNIFICANCE: Significance[] = [
  // Annual fixed Australian observances (repeat every year — see expandAnnual)
  // handled separately below via ANNUAL_SIGNIFICANCE.

  // 2026 moveable / dated
  { start: '2026-02-17', name: 'Lunar New Year (Year of the Horse)', group: 'Cultural' },
  { start: '2026-02-18', end: '2026-03-19', name: 'Ramadan', group: 'Islamic' },
  { start: '2026-03-03', end: '2026-03-04', name: 'Holi', group: 'Hindu' },
  { start: '2026-03-20', name: 'Eid al-Fitr', group: 'Islamic' },
  { start: '2026-04-02', end: '2026-04-09', name: 'Passover (Pesach)', group: 'Jewish' },
  { start: '2026-05-27', name: 'Eid al-Adha', group: 'Islamic' },
  { start: '2026-05-31', name: 'Vesak (Buddha Day)', group: 'Buddhist' },
  { start: '2026-09-12', end: '2026-09-13', name: 'Rosh Hashanah', group: 'Jewish' },
  { start: '2026-09-21', end: '2026-09-22', name: 'Yom Kippur', group: 'Jewish' },
  { start: '2026-11-08', name: 'Diwali', group: 'Hindu' },
  { start: '2026-12-04', end: '2026-12-12', name: 'Hanukkah', group: 'Jewish' },

  // 2027 moveable / dated (key ones)
  { start: '2027-02-06', name: 'Lunar New Year (Year of the Goat)', group: 'Cultural' },
  { start: '2027-02-08', end: '2027-03-08', name: 'Ramadan', group: 'Islamic' },
  { start: '2027-03-09', name: 'Eid al-Fitr', group: 'Islamic' },
  { start: '2027-05-16', name: 'Eid al-Adha', group: 'Islamic' },
  { start: '2027-10-29', name: 'Diwali', group: 'Hindu' },
]

// Repeat every year in range — fixed-date Australian days of significance.
export const ANNUAL_SIGNIFICANCE: { month: number; day: number; endMonth?: number; endDay?: number; name: string; group: string }[] = [
  { month: 1, day: 1, name: "New Year's Day", group: 'Cultural' },
  { month: 2, day: 14, name: "Valentine's Day", group: 'Cultural' },
  { month: 3, day: 8, name: "International Women's Day", group: 'Awareness' },
  { month: 3, day: 17, name: "St Patrick's Day", group: 'Cultural' },
  { month: 3, day: 21, name: 'Harmony Day', group: 'Awareness' },
  { month: 5, day: 26, name: 'National Sorry Day', group: 'First Nations' },
  { month: 5, day: 27, endMonth: 6, endDay: 3, name: 'National Reconciliation Week', group: 'First Nations' },
  { month: 7, day: 6, endMonth: 7, endDay: 13, name: 'NAIDOC Week', group: 'First Nations' },
  { month: 10, day: 31, name: 'Halloween', group: 'Cultural' },
  { month: 12, day: 25, name: 'Christmas Day', group: 'Christian' },
]

// ── Helpers ───────────────────────────────────────────────────────────────
const inRange = (date: string, start: string, end: string) => date >= start && date <= end

export function termFor(date: string): Term | null {
  return TERMS.find((t) => inRange(date, t.start, t.end)) ?? null
}

export function termWeek(date: string, term: Term): number {
  const ms = Date.parse(date) - Date.parse(term.start)
  return Math.floor(ms / (7 * 86_400_000)) + 1
}

export function schoolHolidayFor(date: string): DateRange | null {
  return SCHOOL_HOLIDAYS.find((h) => inRange(date, h.start, h.end)) ?? null
}

const rangeDays = (h: DateRange) => Math.round((Date.parse(h.end) - Date.parse(h.start)) / 86_400_000) + 1

// A holiday-workshop day = a weekday (Mon–Fri) inside one of the short 2-week
// breaks (autumn/winter/spring), excluding public holidays. The long summer
// break (~6 weeks, over Christmas) is intentionally excluded — those days are
// added manually as needed, not auto-filled.
export function isHolidayWorkshopDay(date: string): boolean {
  const h = schoolHolidayFor(date)
  if (!h) return false
  if (rangeDays(h) > 28) return false // skip the summer break
  if (publicHolidayFor(date)) return false
  const [y, m, d] = date.split('-').map((x) => parseInt(x, 10))
  const dow = new Date(y, m - 1, d).getDay()
  return dow >= 1 && dow <= 5
}

export function publicHolidayFor(date: string): NamedDate | null {
  return PUBLIC_HOLIDAYS.find((h) => h.date === date) ?? null
}

export function significanceFor(date: string): Significance[] {
  const out: Significance[] = SIGNIFICANCE.filter((s) => inRange(date, s.start, s.end ?? s.start))
  const [y, m, d] = date.split('-').map((x) => parseInt(x, 10))
  for (const a of ANNUAL_SIGNIFICANCE) {
    const start = `${y}-${String(a.month).padStart(2, '0')}-${String(a.day).padStart(2, '0')}`
    const end = a.endMonth ? `${y}-${String(a.endMonth).padStart(2, '0')}-${String(a.endDay).padStart(2, '0')}` : start
    if (inRange(date, start, end)) out.push({ start, end, name: a.name, group: a.group })
  }
  return out
}

// Term label like "Term 2 · Week 3" or a holiday label for a given date.
export function periodLabel(date: string): string {
  const t = termFor(date)
  if (t) return `Term ${t.term} · Week ${termWeek(date, t)}`
  const h = schoolHolidayFor(date)
  if (h) return h.label
  return ''
}
