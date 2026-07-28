// One-off: copy Xero's Repeating Invoices into Big Star Books (bs_repeating_invoices).
// Idempotent — skips a template that already looks present (same customer + amount + frequency).
import fs from 'node:fs'
import os from 'node:os'

const envRaw = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = {}
for (const l of envRaw.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const xe = JSON.parse(fs.readFileSync(os.homedir() + '/.claude.json', 'utf8')).mcpServers.xero.env
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const parseDate = (v) => { if (!v) return null; const m = /\/Date\((-?\d+)/.exec(v); return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : null }
const isEmail = (s) => /\S+@\S+\.\S+/.test(s || '')
const amountsMap = { Exclusive: 'exclusive', Inclusive: 'inclusive', NoTax: 'none' }
const today = new Date().toISOString().slice(0, 10)

function freq(sch) {
  if (!sch) return 'weekly'
  if (sch.Unit === 'MONTHLY') return 'monthly'
  if (sch.Unit === 'WEEKLY' && Number(sch.Period) === 2) return 'fortnightly'
  return 'weekly'
}

async function main() {
  const tenantId = (await (await sb('tenants?select=id&order=created_at.asc&limit=1')).json())[0]?.id
  if (!tenantId) throw new Error('no tenant')

  const totalOf = (lines, mode) => {
    const sum = (lines || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0)
    const gst = mode === 'inclusive' || mode === 'none' ? 0 : (lines || []).reduce((s, l) => s + (l.gst ? (Number(l.qty) || 0) * (Number(l.unit_price) || 0) * 0.1 : 0), 0)
    return Math.round((sum + gst) * 100) / 100
  }
  // existing templates — dedupe on customer + frequency + amount (so two different
  // weekly invoices to the same customer are BOTH kept).
  const existing = new Set((await (await sb('bs_repeating_invoices?select=contact_name,frequency,amounts_are,lines')).json()).map((r) => `${r.contact_name}|${r.frequency}|${totalOf(r.lines, r.amounts_are)}`))

  const body = new URLSearchParams({ grant_type: 'client_credentials' })
  if (xe.XERO_SCOPES) body.set('scope', xe.XERO_SCOPES)
  const tr = await fetch('https://identity.xero.com/connect/token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(xe.XERO_CLIENT_ID + ':' + xe.XERO_CLIENT_SECRET).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  const tok = (await tr.json()).access_token
  const r = await fetch('https://api.xero.com/api.xro/2.0/RepeatingInvoices', { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/json' } })
  const list = (await r.json()).RepeatingInvoices || []
  console.log('Xero repeating invoices:', list.length)

  let inserted = 0, skipped = 0
  for (const ri of list) {
    const name = ri.Contact?.Name || null
    const f = freq(ri.Schedule)
    const email = ri.Contact?.EmailAddress || (isEmail(name) ? name : null)
    const lines = (ri.LineItems || []).map((l) => ({
      description: l.Description || '', account: null,
      qty: Number(l.Quantity) || 1, unit_price: Number(l.UnitAmount) || 0,
      gst: (Number(l.TaxAmount) || 0) > 0,
    }))
    const amode = amountsMap[ri.LineAmountTypes] || 'exclusive'
    if (existing.has(`${name}|${f}|${totalOf(lines, amode)}`)) { skipped++; continue }
    const mode = ri.ApprovedForSending ? 'send' : ri.Status === 'AUTHORISED' ? 'approve' : 'draft'
    const sched = ri.Schedule || {}
    const nextXero = parseDate(sched.NextScheduledDate) || (sched.NextScheduledDateString || null) || today
    const nextDate = nextXero < today ? today : nextXero // never back-date (avoids the generator catching up duplicates)
    const row = {
      tenant_id: tenantId, contact_name: name, contact_email: email,
      reference: ri.Reference || null,
      amounts_are: amode,
      lines, frequency: f,
      due_days: sched.DueDateType === 'DAYSAFTERBILLDATE' ? (Number(sched.DueDate) || 7) : 7,
      next_date: nextDate, end_date: parseDate(sched.EndDate),
      mode, active: true,
    }
    const ins = await sb('bs_repeating_invoices', { method: 'POST', body: JSON.stringify(row) })
    if (ins.ok) { inserted++; existing.add(`${name}|${f}|${totalOf(lines, amode)}`) } else { console.log('fail', name, (await ins.text()).slice(0, 120)) }
  }
  console.log(`DONE. Imported ${inserted} repeating invoices. Skipped ${skipped} (already there).`)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
