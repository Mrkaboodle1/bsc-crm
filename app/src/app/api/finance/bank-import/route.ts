// /api/finance/bank-import — paste/upload a CommBank CSV export. Owner/manager.
// Parses "Date,Amount,Description,Balance", skips duplicates, auto-suggests a
// category, and stores each row as 'needs_review'.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { suggestCategory } from '@/lib/bank-categorise'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

const r2 = (n: number) => Math.round(n * 100) / 100
const toISO = (d: string) => { const [D, M, Y] = d.split('/'); return `${Y}-${M}-${D}` }

// Parse CommBank NetBank CSV (Date,"Amount","Description","Balance", no header).
function parseRows(csv: string) {
  const out: { txn_date: string; amount: number; direction: 'in' | 'out'; description: string; balance: number | null; import_key: string }[] = []
  for (const raw of csv.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const m = /^(\d{2}\/\d{2}\/\d{4}),"?([+-]?[\d.]+)"?,"(.*)","?([+-]?[\d.]*)"?$/.exec(line)
    if (!m) continue
    const txn_date = toISO(m[1])
    const amount = r2(parseFloat(m[2]))
    const description = m[3].replace(/""/g, '"').trim()
    const balance = m[4] ? r2(parseFloat(m[4])) : null
    const import_key = `${txn_date}|${amount}|${balance ?? ''}|${description.slice(0, 24)}`
    out.push({ txn_date, amount, direction: amount >= 0 ? 'in' : 'out', description, balance, import_key })
  }
  return out
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const csv = String(b.csv || '')
  if (!csv.trim()) return NextResponse.json({ error: 'No CSV data received.' }, { status: 400 })

  const parsed = parseRows(csv)
  if (!parsed.length) return NextResponse.json({ error: "Couldn't read any transactions — is it a CommBank CSV export?" }, { status: 400 })

  const admin = createAdminSupabase()

  // Existing keys → skip duplicates.
  const keys = parsed.map((p) => p.import_key)
  const existing = new Set<string>()
  for (let i = 0; i < keys.length; i += 500) {
    const { data } = await admin.from('bank_transactions').select('import_key').eq('tenant_id', g.tenantId).in('import_key', keys.slice(i, i + 500))
    if (data) data.forEach((x) => existing.add(x.import_key))
  }

  // Learned rules for category suggestions.
  const { data: rules } = await admin.from('categorisation_rules').select('match_text, category, gst').eq('tenant_id', g.tenantId)

  const fresh = parsed.filter((p) => !existing.has(p.import_key))
  const rows = fresh.map((p) => {
    const s = suggestCategory(p.description, p.direction, rules ?? [])
    return { tenant_id: g.tenantId, ...p, category: s.category, gst: s.gst, status: 'needs_review' }
  })

  let imported = 0
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from('bank_transactions').insert(rows.slice(i, i + 500))
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) return NextResponse.json({ error: 'missing-table' }, { status: 400 })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    imported += rows.slice(i, i + 500).length
  }

  return NextResponse.json({ ok: true, imported, duplicates: parsed.length - fresh.length, total: parsed.length })
}
