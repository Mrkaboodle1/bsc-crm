#!/usr/bin/env node
// Cross-reference the BSC roll-call xlsx against the families table (which
// is now populated from Stripe + Tectonic) to answer two questions:
//
//   1. Who's on the roll but NOT paying a weekly sub?
//   2. Who's on the roll and using a Play On voucher?
//
// Strategy: for each sheet (= class), find the student rows, extract the
// student first name + commitment type, then best-effort match to a family
// in the CRM. Then look at that family's Stripe-derived lifecycle + weekly
// fee to decide their status.

import { readFileSync, writeFileSync } from 'node:fs'
import { read, utils } from 'xlsx'
import { supabase, getTenantId } from '../tools/supabase.js'

const FILE = process.argv[2]
  ?? 'C:/Users/Rhett Morrow/my-assistant/crm/Bigstar Roll Call Sheets 2026 Term 2.xlsx'

const wb = read(readFileSync(FILE))
console.log(`Loaded ${wb.SheetNames.length} sheets from roll sheet.`)

// ────────────────────────────────────────────────────────────────────
// Per-sheet → list of student records (name, commitment, age, notes)
// ────────────────────────────────────────────────────────────────────

type Student = {
  rawName: string
  cleanName: string
  age: number | null
  commitment: string
  startDate: string
  notes: string
  sheet: string
}

function parseSheet(sheetName: string, sheet: ReturnType<typeof read>['Sheets'][string]): Student[] {
  if (!sheet) return []
  const data = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })
  // Find the row containing "CHILD NAME" so we can lock the student-name column
  let nameCol = 3 // default (col D, index 3) — matches the common pattern
  let notesCol = -1
  for (let r = 0; r < Math.min(data.length, 15); r++) {
    const row = data[r] as unknown[]
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').toLowerCase().trim()
      if (cell.includes('child') && cell.includes('name')) nameCol = c
      if (cell === 'notes' || cell.includes('notes')) notesCol = c
    }
  }
  const students: Student[] = []
  for (let r = 0; r < data.length; r++) {
    const row = data[r] as unknown[]
    const rawName = String(row[nameCol] ?? '').trim()
    const commitment = String(row[1] ?? '').trim()
    if (!rawName) continue
    // Skip totals / header rows / blank rows
    const lower = rawName.toLowerCase()
    if (
      lower.startsWith('total') ||
      lower === 'childs name' ||
      lower === 'child name' ||
      lower.includes('private lessons') ||
      lower.includes('private group') ||
      lower.length < 2
    ) continue
    // Skip lines that look like venue or class headers (e.g., "Monday 3:45 - 4:45pm")
    if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(rawName)) continue
    if (/coach:/i.test(rawName)) continue

    // Parse age from "Macy Scott (7)" or "Amelia (5) brother A"
    const ageMatch = rawName.match(/\((\d{1,2})\)/) || rawName.match(/\b(\d{1,2})\s*yo?\b/i)
    const age = ageMatch ? parseInt(ageMatch[1]!, 10) : null

    // Clean name: drop parens/time fragments
    let cleanName = rawName
      .replace(/\([^)]*\)/g, '')          // remove (5) (JT) (20)
      .replace(/\d{1,2}:\d{2}.*$/, '')     // strip times like 9-10am
      .replace(/\d{1,2}\s*-\s*\d{1,2}\s*(am|pm)/i, '') // 3-4pm
      .replace(/\s+\d{1,2}\s*$/, '')       // trailing age like "Millie 8"
      .replace(/\bfree trial\b/gi, '')
      .replace(/\bft\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    // If anything in parens looked like another name, capture too
    const startDate = String(row[0] ?? '').trim()
    const notes = notesCol >= 0 ? String(row[notesCol] ?? '').trim() : ''

    students.push({ rawName, cleanName, age, commitment, startDate, notes, sheet: sheetName })
  }
  return students
}

const allStudents: Student[] = []
for (const name of wb.SheetNames) {
  allStudents.push(...parseSheet(name, wb.Sheets[name]!))
}
console.log(`Found ${allStudents.length} student-rows across all sheets (before dedup).`)

// Dedup: same kid name + same sheet = one entry. Keep the row with the most
// specific commitment string (longer = more info).
const seen = new Map<string, Student>()
for (const s of allStudents) {
  const key = `${s.sheet}::${s.cleanName.toLowerCase().trim()}`
  const prev = seen.get(key)
  if (!prev || s.commitment.length > prev.commitment.length) seen.set(key, s)
}
const uniqStudents = [...seen.values()]
console.log(`Deduped to ${uniqStudents.length} unique student × class entries.`)

// ────────────────────────────────────────────────────────────────────
// Family lookup — fetch all families, build name→family map for matching.
// ────────────────────────────────────────────────────────────────────

const tenantId = await getTenantId()
// Paginate — Supabase default page size is 1000, and we have ~1700 families.
const PAGE = 1000
type FamilyRow = { id: string; family_name: string; primary_parent: string | null; email: string | null; phone: string | null; lifecycle_stage: string | null; stripe_customer_id: string | null; weekly_fee_total: number | null; tags: string[] | null }
let allFamilies: FamilyRow[] = []
let famErr: { message: string } | null = null
for (let offset = 0; ; offset += PAGE) {
  const { data, error } = await supabase
    .from('families')
    .select('id, family_name, primary_parent, email, phone, lifecycle_stage, stripe_customer_id, weekly_fee_total, tags')
    .eq('tenant_id', tenantId)
    .range(offset, offset + PAGE - 1)
  if (error) { famErr = error; break }
  if (!data || data.length === 0) break
  allFamilies = allFamilies.concat(data)
  if (data.length < PAGE) break
}
const families = allFamilies

if (famErr) {
  console.error('Family fetch failed:', famErr.message)
  process.exit(1)
}
console.log(`Loaded ${families.length} families from DB.`)

// Build search indexes — by surname, by parent first name, by primary_parent full
type Family = (typeof families)[number]
const bySurname = new Map<string, Family[]>()
const byFirstName = new Map<string, Family[]>()
for (const f of families) {
  const surnameKey = f.family_name?.toLowerCase().trim() ?? ''
  if (surnameKey) {
    const list = bySurname.get(surnameKey) ?? []
    list.push(f)
    bySurname.set(surnameKey, list)
  }
  const parentParts = (f.primary_parent ?? '').toLowerCase().trim().split(/\s+/)
  if (parentParts[0]) {
    const list = byFirstName.get(parentParts[0]) ?? []
    list.push(f)
    byFirstName.set(parentParts[0], list)
  }
}

function findFamily(student: Student): { family: Family | null; confidence: 'high' | 'medium' | 'low' | 'none' } {
  // 1. Try last-name match (most common — student "Macy Scott" → family "Scott")
  const parts = student.cleanName.toLowerCase().split(/\s+/)
  if (parts.length >= 2) {
    const surname = parts[parts.length - 1]!
    const matches = bySurname.get(surname)
    if (matches && matches.length === 1) return { family: matches[0]!, confidence: 'high' }
    if (matches && matches.length > 1) return { family: matches[0]!, confidence: 'medium' }
  }
  // 2. Try first-name match against parent first names
  const first = parts[0]
  if (first) {
    const parentMatch = byFirstName.get(first)
    if (parentMatch && parentMatch.length === 1) return { family: parentMatch[0]!, confidence: 'medium' }
    // single-name students like "Sophie" — only match if exactly one family has a parent named that
    if (parts.length === 1 && parentMatch && parentMatch.length === 1) return { family: parentMatch[0]!, confidence: 'low' }
  }
  return { family: null, confidence: 'none' }
}

// ────────────────────────────────────────────────────────────────────
// Bucket students
// ────────────────────────────────────────────────────────────────────

const PLAY_ON_REGEX = /\b(play\s*on|playon|po)\b/i
const SUB_REGEX = /\bsub(scription)?\b/i
const NDIS_REGEX = /\bndis\b/i
const CASUAL_REGEX = /\bcasual\b/i
const FREE_TRIAL_REGEX = /\b(ft|free trial)\b/i

type Bucket = {
  student: Student
  match: ReturnType<typeof findFamily>
  payingStatus: 'subscribed' | 'play_on_voucher' | 'ndis' | 'casual' | 'free_trial' | 'not_paying' | 'unknown'
}

const buckets: Bucket[] = []
for (const s of uniqStudents) {
  const match = findFamily(s)
  // First: classify from the commitment column directly (most authoritative)
  let payingStatus: Bucket['payingStatus']
  if (PLAY_ON_REGEX.test(s.commitment) || PLAY_ON_REGEX.test(s.notes)) {
    payingStatus = 'play_on_voucher'
  } else if (NDIS_REGEX.test(s.commitment)) {
    payingStatus = 'ndis'
  } else if (CASUAL_REGEX.test(s.commitment)) {
    payingStatus = 'casual'
  } else if (/^(ft|free trial)$/i.test(s.commitment) || (FREE_TRIAL_REGEX.test(s.commitment) && !SUB_REGEX.test(s.commitment))) {
    payingStatus = 'free_trial'
  } else if (SUB_REGEX.test(s.commitment)) {
    payingStatus = 'subscribed'
  } else if (match.family && (match.family.lifecycle_stage === 'active' || (match.family.weekly_fee_total ?? 0) > 0)) {
    payingStatus = 'subscribed'
  } else if (match.family && (match.family.lifecycle_stage === 'past' || match.family.lifecycle_stage === 'lost')) {
    payingStatus = 'not_paying'
  } else {
    payingStatus = 'unknown'
  }
  buckets.push({ student: s, match, payingStatus })
}

// ────────────────────────────────────────────────────────────────────
// Summary + per-bucket dump
// ────────────────────────────────────────────────────────────────────

const tally: Record<string, number> = {}
for (const b of buckets) tally[b.payingStatus] = (tally[b.payingStatus] ?? 0) + 1
console.log('\n=== Roll-vs-billing summary ===')
for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(18)} ${v}`)

const NOT_PAYING_BUCKETS: Bucket['payingStatus'][] = ['not_paying', 'free_trial', 'casual', 'unknown']
const playOn = buckets.filter((b) => b.payingStatus === 'play_on_voucher')
const notPaying = buckets.filter((b) => NOT_PAYING_BUCKETS.includes(b.payingStatus))

// Markdown report
const out: string[] = []
out.push('# BSC Roll vs Billing Report\n')
out.push(`*Generated ${new Date().toISOString()} from roll-sheet xlsx × CRM families table.*\n`)
out.push(`Total **unique student × class** entries: **${uniqStudents.length}** (scanned ${allStudents.length} raw rows, deduped)\n`)
out.push('## Summary')
out.push('')
out.push('| Status | Count |')
out.push('|---|---|')
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  out.push(`| ${k.replace(/_/g, ' ')} | ${v} |`)
}
out.push('')

out.push('## 🎟 Play On voucher users\n')
out.push('Anyone on the roll whose commitment or notes column says "Play On" / "PO" / "Play On Voucher".\n')
out.push('| Student | Class | Commitment | Family | Lifecycle |')
out.push('|---|---|---|---|---|')
for (const b of playOn) {
  const fam = b.match.family
  out.push(`| ${b.student.cleanName} ${b.student.age ? `(${b.student.age})` : ''} | ${b.student.sheet.trim()} | ${b.student.commitment} | ${fam?.family_name ?? '—'} | ${fam?.lifecycle_stage ?? 'no family match'} |`)
}

out.push('\n## 🚨 On the roll but NOT subscribed\n')
out.push('Students who appear on a roll sheet but the family record shows no active subscription or weekly fee — these are the ones to chase for term-2 conversion. Excludes Play On voucher users + NDIS-funded.\n')
out.push('| Student | Class | Commitment | Family | Lifecycle | Weekly fee |')
out.push('|---|---|---|---|---|---|')
for (const b of notPaying) {
  const fam = b.match.family
  out.push(`| ${b.student.cleanName} ${b.student.age ? `(${b.student.age})` : ''} | ${b.student.sheet.trim()} | ${b.student.commitment || '—'} | ${fam?.family_name ?? '—'} | ${fam?.lifecycle_stage ?? '—'} | $${fam?.weekly_fee_total ?? 0} |`)
}

const report = out.join('\n')
const outPath = 'C:/Users/Rhett Morrow/my-assistant/bsc-crm/research/roll-vs-billing-report.md'
writeFileSync(outPath, report)
console.log(`\n✅ Report written to ${outPath}`)
console.log(`\n📋 Quick stats:`)
console.log(`   Play On voucher users: ${playOn.length}`)
console.log(`   On roll but not subscribed: ${notPaying.length}`)
process.exit(0)
