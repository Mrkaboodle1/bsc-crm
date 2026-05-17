#!/usr/bin/env node
// Direct disk import of the Tectonic Contacts CSV → families table.
// Bypasses the browser-upload flow because the file is already on the dev
// machine. Same dedup logic as the web importer: match by email first,
// then insert.
//
// Tectonic columns: Contact Id, First Name, Last Name, Phone, Email,
// Business Name, Created, Last Activity, Tags

import { readFileSync } from 'node:fs'
import { supabase, getTenantId } from '../tools/supabase.js'
import { logger } from '../logger.js'

const file = process.argv[2] ?? 'C:\\Users\\Rhett Morrow\\my-assistant\\crm\\Export_Contacts_All_May_2026_4_58_PM.csv'

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else { inQuotes = false }
      } else cell += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(cell); cell = '' }
      else if (c === '\n' || c === '\r') {
        if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); row = []; cell = '' }
        if (c === '\r' && text[i + 1] === '\n') i++
      } else cell += c
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row) }
  return { headers: rows[0]!.map((h) => h.trim()), rows: rows.slice(1).filter((r) => r.some((c) => c.trim() !== '')) }
}

function normalisePhone(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('+')) return trimmed.replace(/\s+/g, '')
  const digits = trimmed.replace(/\D+/g, '')
  if (digits.length === 10 && digits.startsWith('04')) return '+61' + digits.slice(1)
  if (digits.length === 11 && digits.startsWith('614')) return '+' + digits
  return trimmed
}

const t0 = Date.now()
const text = readFileSync(file, 'utf8')
const { headers, rows } = parseCsv(text)
console.log(`Loaded ${rows.length} rows from ${file}`)
const idx = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase())
const iFirst = idx('First Name')
const iLast = idx('Last Name')
const iPhone = idx('Phone')
const iEmail = idx('Email')
const iTags = idx('Tags')
const iCreated = idx('Created')

const tenantId = await getTenantId()

// Pre-fetch existing families to avoid round-trips
const { data: existing } = await supabase
  .from('families')
  .select('id, email')
  .eq('tenant_id', tenantId)
  .not('email', 'is', null)
const existingEmails = new Set((existing ?? []).map((e) => e.email!.toLowerCase()))

let inserted = 0
let skipped = 0
const errors: string[] = []

const BATCH = 50
for (let start = 0; start < rows.length; start += BATCH) {
  const batch = rows.slice(start, start + BATCH)
  const payload: Array<Record<string, unknown>> = []
  for (const r of batch) {
    const firstName = (r[iFirst] ?? '').trim()
    const lastName = (r[iLast] ?? '').trim()
    const email = (r[iEmail] ?? '').trim().toLowerCase() || null
    if (!firstName && !lastName && !email) {
      skipped++
      continue
    }
    if (email && existingEmails.has(email)) {
      skipped++ // Stripe sync already brought them in OR earlier batch this run
      continue
    }
    const phone = normalisePhone((r[iPhone] ?? '').trim())
    const tags = (r[iTags] ?? '').trim().split(',').map((t) => t.trim()).filter(Boolean)
    const familyName = lastName || firstName || email || 'Tectonic lead'
    const primaryParent = [firstName, lastName].filter(Boolean).join(' ') || null
    payload.push({
      tenant_id: tenantId,
      family_name: familyName,
      primary_parent: primaryParent,
      email,
      phone,
      tags,
      lifecycle_stage: 'lead',
      source: 'other',
      notes: `Imported from Tectonic CRM on ${new Date().toISOString().slice(0, 10)}. Created in Tectonic: ${r[iCreated] ?? '?'}`,
    })
    if (email) existingEmails.add(email)
  }
  if (payload.length === 0) continue
  const { error } = await supabase.from('families').insert(payload)
  if (error) {
    errors.push(`Batch starting at ${start}: ${error.message}`)
    skipped += payload.length
  } else {
    inserted += payload.length
  }
  if (start % 200 === 0) {
    console.log(`  Progress: ${start + batch.length}/${rows.length} (${inserted} inserted, ${skipped} skipped)`)
  }
}

const dur = ((Date.now() - t0) / 1000).toFixed(1)
console.log(`\n✅ Tectonic import done in ${dur}s`)
console.log(`   Rows scanned    : ${rows.length}`)
console.log(`   Families inserted: ${inserted}`)
console.log(`   Skipped (dup/empty): ${skipped}`)
if (errors.length) {
  console.log(`\n⚠ ${errors.length} batch error(s):`)
  for (const e of errors.slice(0, 5)) console.log(`  - ${e}`)
}
logger.info({ inserted, skipped, errors: errors.length }, 'Tectonic CSV import complete')
process.exit(0)
