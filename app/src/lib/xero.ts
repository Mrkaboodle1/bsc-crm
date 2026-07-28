// BSC CRM — Xero (live) read-only helper. SERVER ONLY.
//
// Talks to Xero via the Custom Connection (client-credentials grant). The same
// connection the assistant uses; credentials live in env:
//   XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_SCOPES
// Custom connections are single-organisation, so no tenant header is needed.
//
// Everything here is READ-ONLY (reports + account balances) — Big Star Books
// never writes to Xero.

import 'server-only'

const TOKEN_URL = 'https://identity.xero.com/connect/token'
const API_BASE = 'https://api.xero.com/api.xro/2.0'

export class XeroNotConfigured extends Error {}
export class XeroError extends Error {}

let cachedToken: { value: string; expiresAt: number } | null = null

export function xeroConfigured(): boolean {
  return !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET)
}

async function getToken(): Promise<string> {
  const id = process.env.XERO_CLIENT_ID
  const secret = process.env.XERO_CLIENT_SECRET
  const scopes = process.env.XERO_SCOPES || ''
  if (!id || !secret) throw new XeroNotConfigured('Xero connection details are not set up yet.')

  // Re-use a warm token (60s safety margin) to avoid hitting the token endpoint
  // on every report.
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value

  const body = new URLSearchParams({ grant_type: 'client_credentials' })
  if (scopes) body.set('scope', scopes)

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new XeroError(`Could not connect to Xero (${res.status}). ${text.slice(0, 200)}`)
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return json.access_token
}

async function xeroGet(path: string): Promise<unknown> {
  const token = await getToken()
  const res = await fetch(`${API_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new XeroError(`Xero request failed (${res.status}). ${text.slice(0, 200)}`)
  }
  return res.json()
}

// ── Report parsing ──────────────────────────────────────────────────
// Xero reports return nested Rows. We flatten to a name→amount lookup, taking
// the FIRST figure cell (Cells[1]) of each Row/SummaryRow — that's the current
// period. The Balance Sheet ships a second column with the SAME date a year
// earlier, so reading the last cell silently returned last year's numbers.

type Cell = { Value?: string }
type ReportRow = { RowType: string; Title?: string; Cells?: Cell[]; Rows?: ReportRow[] }
type ReportResponse = { Reports?: { Rows?: ReportRow[] }[] }

const toNum = (v: string | undefined): number => {
  if (!v) return 0
  const n = Number(v.replace(/[, ]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Flattened report: an ordered list of { name, amount } plus name→amount maps
 *  for the current period and (where the report has one) the prior period. */
export type FlatReport = {
  lines: { name: string; amount: number; prior?: number }[]
  map: Record<string, number>
  priorMap: Record<string, number>
}

function flatten(report: ReportResponse): FlatReport {
  const lines: { name: string; amount: number; prior?: number }[] = []
  const walk = (rows?: ReportRow[]) => {
    for (const r of rows ?? []) {
      if ((r.RowType === 'Row' || r.RowType === 'SummaryRow') && r.Cells && r.Cells.length >= 2) {
        const name = (r.Cells[0]?.Value || '').trim()
        const amount = toNum(r.Cells[1]?.Value)
        const prior = r.Cells.length > 2 ? toNum(r.Cells[2]?.Value) : undefined
        if (name) lines.push({ name, amount, prior })
      }
      if (r.Rows) walk(r.Rows)
    }
  }
  walk(report.Reports?.[0]?.Rows)
  const map: Record<string, number> = {}
  const priorMap: Record<string, number> = {}
  for (const l of lines) {
    map[l.name.toLowerCase()] = l.amount
    if (l.prior !== undefined) priorMap[l.name.toLowerCase()] = l.prior
  }
  return { lines, map, priorMap }
}

export async function getProfitAndLoss(fromDate: string, toDate: string): Promise<FlatReport> {
  const json = (await xeroGet(`Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}`)) as ReportResponse
  return flatten(json)
}

export async function getBalanceSheet(date: string): Promise<FlatReport> {
  const json = (await xeroGet(`Reports/BalanceSheet?date=${date}`)) as ReportResponse
  return flatten(json)
}

/** Look up a figure by (case-insensitive) account/row name; 0 if absent. */
export function pick(report: FlatReport, name: string): number {
  return report.map[name.toLowerCase()] ?? 0
}

// ── Unpaid customer invoices (money owed TO the business) ───────────
// The Accounting API returns Microsoft-style JSON dates: "/Date(1623456000000+0000)/".
function parseXeroDate(v: string | undefined): string | null {
  if (!v) return null
  const m = /\/Date\((-?\d+)/.exec(v)
  if (!m) return null
  return new Date(Number(m[1])).toISOString().slice(0, 10)
}

export type UnpaidInvoice = {
  number: string
  contact: string
  amountDue: number
  total: number
  dueISO: string | null
}

type RawInvoice = {
  InvoiceNumber?: string
  Contact?: { Name?: string }
  AmountDue?: number
  Total?: number
  DueDate?: string
}

/** Authorised (sent, unpaid) customer invoices, soonest-due first. */
export async function getUnpaidInvoices(): Promise<UnpaidInvoice[]> {
  const where = encodeURIComponent('Type=="ACCREC" AND Status=="AUTHORISED"')
  const json = (await xeroGet(`Invoices?where=${where}&order=DueDate`)) as { Invoices?: RawInvoice[] }
  return (json.Invoices ?? [])
    .map((inv) => ({
      number: inv.InvoiceNumber || '(no number)',
      contact: inv.Contact?.Name || 'Unknown',
      amountDue: Number(inv.AmountDue) || 0,
      total: Number(inv.Total) || 0,
      dueISO: parseXeroDate(inv.DueDate),
    }))
    .filter((i) => i.amountDue > 0)
    .sort((a, b) => (a.dueISO || '9999').localeCompare(b.dueISO || '9999'))
}

/** Same as pick(), but the prior-period column (Balance Sheet ships last year). */
export function pickPrior(report: FlatReport, name: string): number {
  return report.priorMap?.[name.toLowerCase()] ?? 0
}
