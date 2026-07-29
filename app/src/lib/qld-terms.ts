// Queensland state school term dates — drives Play On voucher validity.
// Rhett's rule: a voucher covers ONE class for ONE term, and it expires at the
// end of the CURRENT term no matter how late in the term it's handed over.
// Source: QLD Department of Education published calendars.

export type Term = { label: string; start: string; end: string }

export const QLD_TERMS: Term[] = [
  { label: 'T1 2026', start: '2026-01-27', end: '2026-04-02' },
  { label: 'T2 2026', start: '2026-04-20', end: '2026-06-26' },
  { label: 'T3 2026', start: '2026-07-13', end: '2026-09-18' },
  { label: 'T4 2026', start: '2026-10-06', end: '2026-12-11' },
  { label: 'T1 2027', start: '2027-01-27', end: '2027-04-01' },
  { label: 'T2 2027', start: '2027-04-19', end: '2027-06-25' },
  { label: 'T3 2027', start: '2027-07-12', end: '2027-09-17' },
  { label: 'T4 2027', start: '2027-10-05', end: '2027-12-10' },
]

/** The term a date falls in. During school holidays, the UPCOMING term
 *  (a voucher handed over in the holidays is for the term about to start). */
export function termFor(dateISO: string): Term | null {
  const d = dateISO.slice(0, 10)
  for (const t of QLD_TERMS) {
    if (d >= t.start && d <= t.end) return t   // inside a term
    if (d < t.start) return t                  // holidays → next term
  }
  return null // beyond the table — extend QLD_TERMS
}
