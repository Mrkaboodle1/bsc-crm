// One-off / weekly: import a CommBank CSV into bank_transactions with auto-category.
// Usage: node scripts/import-commbank.mjs "C:\\path\\to\\file.csv"
import fs from 'node:fs'

const FILE = process.argv[2] || 'C:/Users/Rhett Morrow/my-assistant/Bank Transction/CSVData (15).csv'
const envRaw = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = {}
for (const l of envRaw.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const r2 = (n) => Math.round(n * 100) / 100
const toISO = (d) => { const [D, M, Y] = d.split('/'); return `${Y}-${M}-${D}` }
const NO_GST = new Set(['Staff wages', 'Superannuation', 'Director loan', 'Bank fees', 'Filing fees', 'Tax & GST'])
const EXP = [[/RHETT WAGE|NETBANK RHETT|WAGE|PAYROLL|SALARY/, 'Staff wages'], [/SUPER|HOSTPLUS|AUSTRALIANSUPER|REST SUPER|SUNSUPER/, 'Superannuation'], [/OFFICEWORKS|KMART|SPOTLIGHT|CRAFT|ETSY|TARGET|BIG W|CLEVERPATCH/, 'Materials & supplies'], [/BUNNINGS|MITRE 10|TOTAL TOOLS|REPAIR|HARDWARE/, 'Repairs'], [/BP |CALTEX|AMPOL|7-ELEVEN|SHELL|FUEL|UNITED PETROL|LINKT|TOLL|UBER|TAXI|PARKING/, 'Vehicle & travel'], [/WOOLWORTHS|COLES|IGA|ALDI|MCDONALD|CAFE|COFFEE|HUNGRY|KFC|SUBWAY|CHEMIST/, 'General expenses'], [/PRINT|PRINTERS|VISTAPRINT|SIGN|BANNER/, 'Marketing'], [/FACEBOOK|META |GOOGLE|CANVA|ADOBE|MAILCHIMP|XERO|GODADDY|VERCEL|OPENAI|ANTHROPIC|ZOOM|MICROSOFT|SPOTIFY|APPLE\.COM|SUBSCRIPTION|NOTION/, 'Software & subscriptions'], [/INSURANCE|AAMI|ALLIANZ|QBE|NRMA|CGU|BIZCOVER/, 'Insurance'], [/RENT|REAL ESTATE|HARCOURTS|RAY WHITE|LJ HOOKER/, 'Rent'], [/TITLES|ASIC|COUNCIL|GOLD COAST CITY|FILING|REGISTR/, 'Filing fees'], [/BANK FEE|ACCOUNT FEE|MONTHLY FEE|OVERDRAWN/, 'Bank fees'], [/TELSTRA|OPTUS|VODAFONE|TPG|AUSSIE BROADBAND|INTERNET/, 'Telephone & internet'], [/COSTUME|FABRIC|LYCRA/, 'Costumes'], [/TRAINING|COURSE|GYMNASTICS AUST|FIRST AID|BLUE CARD/, 'Training'], [/ATO|AUSTRALIAN TAXATION|BAS PAYMENT/, 'Tax & GST']]
const INC = [[/NDIS|PLAN ?PARTNER|MYPLAN|PLAN ?MANAG|FAMILY CENTRE|DISABILITY|FIRST2CARE|RISE ?AND ?SHINE|SPECIALCISE/, 'Term class fees'], [/BIRTHDAY|PARTY/, 'Birthday parties'], [/RESORT|BIG4|BIG 4|HOLIDAY PARK|PARADISE/, 'Events'], [/SCHOOL|COLLEGE|EDU|OSHC|CHILDCARE|KINDY/, 'Incursions'], [/SQUARE|STRIPE|EFTPOS/, 'Other income'], [/KABOODLE|MAGIC|ENTERTAIN/, 'Mr Kaboodle Entertainment'], [/GRANT|FOUNDATION|GIVIT/, 'Grants'], [/DONAT|GOFUNDME/, 'Donations']]
function suggest(desc, dir) {
  const u = (desc || '').toUpperCase()
  for (const [re, c] of (dir === 'in' ? INC : EXP)) if (re.test(u)) return { category: c, gst: !NO_GST.has(c) }
  return { category: null, gst: dir === 'out' }
}

async function main() {
  const tenantId = (await (await sb('tenants?select=id&order=created_at.asc&limit=1')).json())[0]?.id
  if (!tenantId) throw new Error('no tenant')

  const rows = []
  for (const raw of fs.readFileSync(FILE, 'utf8').split(/\r?\n/)) {
    const m = /^(\d{2}\/\d{2}\/\d{4}),"?([+-]?[\d.]+)"?,"(.*)","?([+-]?[\d.]*)"?$/.exec(raw.trim())
    if (!m) continue
    const txn_date = toISO(m[1]), amount = r2(parseFloat(m[2])), description = m[3].replace(/""/g, '"').trim(), balance = m[4] ? r2(parseFloat(m[4])) : null
    const direction = amount >= 0 ? 'in' : 'out'
    const import_key = `${txn_date}|${amount}|${balance ?? ''}|${description.slice(0, 24)}`
    const s = suggest(description, direction)
    rows.push({ tenant_id: tenantId, txn_date, amount, direction, description, balance, source: 'commbank_csv', import_key, status: 'needs_review', category: s.category, gst: s.gst })
  }
  console.log('Parsed', rows.length, 'transactions from', FILE)

  // dedupe vs existing import_keys
  const existing = new Set()
  let off = 0
  while (true) { const d = await (await sb(`bank_transactions?select=import_key&limit=1000&offset=${off}`)).json(); d.forEach((x) => existing.add(x.import_key)); if (d.length < 1000) break; off += 1000 }
  const fresh = rows.filter((r) => !existing.has(r.import_key))

  let inserted = 0
  for (let i = 0; i < fresh.length; i += 200) {
    const ins = await sb('bank_transactions', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(fresh.slice(i, i + 200)) })
    if (!ins.ok) { console.log('insert fail', (await ins.text()).slice(0, 150)); break }
    inserted += fresh.slice(i, i + 200).length
  }
  const cat = fresh.filter((r) => r.category).length
  console.log(`DONE. Imported ${inserted} (skipped ${rows.length - fresh.length} duplicates). Auto-categorised ${cat}/${fresh.length}.`)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
