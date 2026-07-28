// Shared invoice maths — used by the manual invoice API and the repeating-invoice
// generator so totals are always calculated the same way.

export type LineIn = { description?: string; account?: string; qty?: number; unit_price?: number; gst?: boolean }
export type CleanLine = { description: string; account: string | null; qty: number; unit_price: number; gst: boolean; amount: number; sort: number }

const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100

/** Build clean lines + totals honouring Xero's "Amounts are" mode (exclusive/inclusive/none). */
export function computeInvoice(linesIn: LineIn[], amountsAre: string) {
  const mode = ['exclusive', 'inclusive', 'none'].includes(amountsAre) ? amountsAre : 'exclusive'
  const clean: CleanLine[] = (linesIn || [])
    .map((l, i) => ({
      description: String(l.description || '').slice(0, 300),
      account: String(l.account || '').slice(0, 100) || null,
      qty: r2(l.qty ?? 1),
      unit_price: r2(l.unit_price),
      gst: mode === 'none' ? false : l.gst !== false,
      amount: r2((Number(l.qty) || 0) * (Number(l.unit_price) || 0)),
      sort: i,
    }))
    .filter((l) => l.description || l.amount)

  let subtotal = 0, gst = 0, total = 0
  if (mode === 'inclusive') {
    total = r2(clean.reduce((s, l) => s + l.amount, 0))
    gst = r2(clean.reduce((s, l) => s + (l.gst ? l.amount / 11 : 0), 0))
    subtotal = r2(total - gst)
  } else if (mode === 'none') {
    subtotal = r2(clean.reduce((s, l) => s + l.amount, 0)); gst = 0; total = subtotal
  } else {
    subtotal = r2(clean.reduce((s, l) => s + l.amount, 0))
    gst = r2(clean.reduce((s, l) => s + (l.gst ? l.amount * 0.1 : 0), 0))
    total = r2(subtotal + gst)
  }
  return { clean, subtotal, gst, total, mode }
}

/** Advance a YYYY-MM-DD date by one repeat period. */
export function advanceDate(iso: string, frequency: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (frequency === 'fortnightly') d.setDate(d.getDate() + 14)
  else d.setDate(d.getDate() + 7) // weekly
  return d.toISOString().slice(0, 10)
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}
