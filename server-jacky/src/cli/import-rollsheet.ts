#!/usr/bin/env node
// Import the Big Star Circus Term-2 roll-sheet xlsx into the classes /
// students / enrolments tables. Designed to be idempotent — safe to re-run
// after fixing parent name matches. Uses Term-2 2026 as the enrolment term.
//
// What it does:
//   1. For each sheet in the xlsx, derive class metadata (name, day, time,
//      discipline, term) from the sheet name and inspection of the rows.
//   2. Upsert that class into the `classes` table.
//   3. For each student row in the sheet:
//      a. Extract clean name + age + commitment from the row.
//      b. Try to match to an existing family by last name / parent name.
//         If no match, create a placeholder family flagged in notes.
//      c. Upsert the student record (match by family + first_name).
//      d. Upsert an active enrolment (one per student × class).
//
// Skips one-off sheets (Kids Night Out, Holidays, Birthdays) — those aren't
// weekly classes and the data model doesn't represent them well yet.

import { readFileSync, writeFileSync } from 'node:fs'
import { read, utils } from 'xlsx'
import { supabase, getTenantId } from '../tools/supabase.js'

const FILE = process.argv[2]
  ?? 'C:/Users/Rhett Morrow/my-assistant/crm/Bigstar Roll Call Sheets 2026 Term 2.xlsx'
const TERM = 'Term 2 2026'

// Sheets we treat as recurring weekly classes
const SKIP_SHEETS = /kids night out|holidays|birthdays|schools under/i

// ────────────────────────────────────────────────────────────────────
// Class metadata extraction from sheet name
// ────────────────────────────────────────────────────────────────────

const DAY_NUM: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }

function classFromSheetName(sheet: string): null | {
  name: string
  day_of_week: number
  start_time: string
  duration_minutes: number
  discipline: string
} {
  const lower = sheet.toLowerCase().trim()
  let day_of_week = -1
  for (const [name, n] of Object.entries(DAY_NUM)) {
    if (lower.includes(name)) { day_of_week = n; break }
  }
  if (day_of_week < 0) return null

  let discipline = 'circus_acro'
  if (lower.includes('aerial')) discipline = 'aerial'
  else if (lower.includes('fusion')) discipline = 'fusion'
  else if (lower.includes('drama')) discipline = 'drama'
  else if (lower.includes('hs circus') || lower.includes('homeschool')) discipline = 'homeschool'
  else if (lower.includes('acro')) discipline = 'circus_acro'
  else if (lower.includes('circus')) discipline = 'circus_acro'

  // Best-guess start time from common BSC slots. Refine via CRM later.
  let start_time = '16:00:00'
  if (lower.includes('am')) start_time = '09:30:00'
  if (lower.includes('saturday')) start_time = '09:30:00'

  return {
    name: sheet.trim(),
    day_of_week,
    start_time,
    duration_minutes: 60,
    discipline,
  }
}

// ────────────────────────────────────────────────────────────────────
// Student row extraction (same logic as the report script)
// ────────────────────────────────────────────────────────────────────

type ParsedStudent = {
  rawName: string
  cleanName: string
  firstName: string
  lastName: string | null
  age: number | null
  commitment: string
  startDateRaw: string
  notes: string
}

function parseStudentRows(sheet: ReturnType<typeof read>['Sheets'][string]): ParsedStudent[] {
  if (!sheet) return []
  const data = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })
  let nameCol = 3
  let notesCol = -1
  for (let r = 0; r < Math.min(data.length, 15); r++) {
    const row = data[r] as unknown[]
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').toLowerCase().trim()
      if (cell.includes('child') && cell.includes('name')) nameCol = c
      if (cell === 'notes' || cell.includes('notes')) notesCol = c
    }
  }
  const seen = new Map<string, ParsedStudent>()
  for (let r = 0; r < data.length; r++) {
    const row = data[r] as unknown[]
    const rawName = String(row[nameCol] ?? '').trim()
    if (!rawName) continue
    const lower = rawName.toLowerCase()
    if (lower.startsWith('total')) continue
    if (lower === 'childs name' || lower === 'child name') continue
    if (lower.includes('private lessons') || lower.includes('private group')) continue
    if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(rawName)) continue
    if (/coach:/i.test(rawName)) continue
    if (rawName.length < 2) continue

    const ageMatch = rawName.match(/\((\d{1,2})\)/) || rawName.match(/\b(\d{1,2})\s*yo?\b/i)
    const age = ageMatch ? parseInt(ageMatch[1]!, 10) : null

    let cleanName = rawName
      .replace(/\([^)]*\)/g, '')
      .replace(/\d{1,2}:\d{2}.*$/, '')
      .replace(/\d{1,2}\s*-\s*\d{1,2}\s*(am|pm)/i, '')
      .replace(/\s+\d{1,2}\s*$/, '')
      .replace(/\bfree trial\b/gi, '')
      .replace(/\bsister\b.*$/i, '')   // strip "(5) brother A" → ""; "Selina (JT)" → "Selina"
      .replace(/\bbrother\b.*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (!cleanName) continue

    const parts = cleanName.split(/\s+/)
    const firstName = parts[0]!
    const lastName = parts.length >= 2 ? parts.slice(1).join(' ') : null

    const commitment = String(row[1] ?? '').trim()
    const startDateRaw = String(row[0] ?? '').trim()
    const notes = notesCol >= 0 ? String(row[notesCol] ?? '').trim() : ''

    const key = cleanName.toLowerCase()
    const existing = seen.get(key)
    if (!existing || commitment.length > existing.commitment.length) {
      seen.set(key, { rawName, cleanName, firstName, lastName, age, commitment, startDateRaw, notes })
    }
  }
  return [...seen.values()]
}

// ────────────────────────────────────────────────────────────────────
// Family matching — same approach as the report script.
// ────────────────────────────────────────────────────────────────────

type Family = { id: string; family_name: string; primary_parent: string | null; email: string | null }

function findFamilyId(student: ParsedStudent, bySurname: Map<string, Family[]>, byFirstName: Map<string, Family[]>): string | null {
  if (student.lastName) {
    const surname = student.lastName.toLowerCase().trim()
    const matches = bySurname.get(surname)
    if (matches && matches.length >= 1) return matches[0]!.id
  }
  const first = student.firstName.toLowerCase().trim()
  const parentMatch = byFirstName.get(first)
  if (parentMatch && parentMatch.length === 1) return parentMatch[0]!.id
  return null
}

// ────────────────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────────────────

const tenantId = await getTenantId()
console.log(`Tenant: ${tenantId}`)

// Pull all families for matching
const PAGE = 1000
let allFamilies: Family[] = []
for (let offset = 0; ; offset += PAGE) {
  const { data, error } = await supabase
    .from('families')
    .select('id, family_name, primary_parent, email')
    .eq('tenant_id', tenantId)
    .range(offset, offset + PAGE - 1)
  if (error) { console.error(error.message); process.exit(1) }
  if (!data || data.length === 0) break
  allFamilies = allFamilies.concat(data)
  if (data.length < PAGE) break
}
console.log(`Loaded ${allFamilies.length} families for matching.`)

const bySurname = new Map<string, Family[]>()
const byFirstName = new Map<string, Family[]>()
for (const f of allFamilies) {
  const surname = f.family_name?.toLowerCase().trim() ?? ''
  if (surname) {
    const list = bySurname.get(surname) ?? []
    list.push(f)
    bySurname.set(surname, list)
  }
  const parts = (f.primary_parent ?? '').toLowerCase().trim().split(/\s+/)
  if (parts[0]) {
    const list = byFirstName.get(parts[0]) ?? []
    list.push(f)
    byFirstName.set(parts[0], list)
  }
}

const wb = read(readFileSync(FILE))
console.log(`Workbook has ${wb.SheetNames.length} sheets.`)

const stats = {
  sheetsProcessed: 0,
  sheetsSkipped: 0,
  classesUpserted: 0,
  studentsInserted: 0,
  studentsUpdated: 0,
  familiesCreated: 0,
  enrolmentsCreated: 0,
  rowsSkipped: 0,
  errors: [] as string[],
}

const unmatched: Array<{ sheet: string; student: string }> = []

for (const sheetName of wb.SheetNames) {
  if (SKIP_SHEETS.test(sheetName)) {
    stats.sheetsSkipped++
    console.log(`  Skipped sheet: ${sheetName.trim()}`)
    continue
  }
  const meta = classFromSheetName(sheetName)
  if (!meta) {
    stats.sheetsSkipped++
    console.log(`  Skipped (no class metadata): ${sheetName.trim()}`)
    continue
  }
  stats.sheetsProcessed++

  // Upsert class — match by tenant + name to keep idempotent
  const { data: existingClass } = await supabase
    .from('classes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', meta.name)
    .maybeSingle()

  let classId: string
  if (existingClass) {
    classId = existingClass.id
  } else {
    const { data: inserted, error } = await supabase
      .from('classes')
      .insert({
        tenant_id: tenantId,
        name: meta.name,
        day_of_week: meta.day_of_week,
        start_time: meta.start_time,
        duration_minutes: meta.duration_minutes,
        discipline: meta.discipline,
        capacity: 12,
        status: 'active',
      })
      .select('id')
      .single()
    if (error || !inserted) {
      stats.errors.push(`Class insert "${meta.name}": ${error?.message}`)
      continue
    }
    classId = inserted.id
    stats.classesUpserted++
  }

  const students = parseStudentRows(wb.Sheets[sheetName]!)
  for (const s of students) {
    try {
      let familyId = findFamilyId(s, bySurname, byFirstName)

      if (!familyId) {
        // Create a placeholder family — students.family_id is NOT NULL.
        const placeholderName = s.lastName ?? s.firstName
        const { data: newFam, error: famErr } = await supabase
          .from('families')
          .insert({
            tenant_id: tenantId,
            family_name: placeholderName,
            primary_parent: null,
            email: null,
            lifecycle_stage: 'lead',
            source: 'other',
            tags: ['from-roll-sheet', 'needs-parent-link'],
            notes: `Auto-created from "${sheetName.trim()}" roll sheet on ${new Date().toISOString().slice(0, 10)}. Please link to real parent.`,
          })
          .select('id')
          .single()
        if (famErr || !newFam) {
          stats.errors.push(`Placeholder family "${placeholderName}": ${famErr?.message}`)
          continue
        }
        familyId = newFam.id
        stats.familiesCreated++
        unmatched.push({ sheet: sheetName.trim(), student: s.cleanName })
      }

      // Upsert student — dedup by family_id + first_name (case insensitive)
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('family_id', familyId)
        .ilike('first_name', s.firstName)
        .maybeSingle()

      let studentId: string
      if (existingStudent) {
        studentId = existingStudent.id
        // Optionally backfill missing last_name / age
        if (s.lastName || s.age) {
          const upd: Record<string, unknown> = {}
          if (s.lastName) upd.last_name = s.lastName
          if (s.age) {
            // crude DOB estimate — use 30 June of (current year - age) so the year is right
            const year = new Date().getFullYear() - s.age
            upd.date_of_birth = `${year}-06-30`
          }
          await supabase.from('students').update(upd).eq('id', studentId)
        }
        stats.studentsUpdated++
      } else {
        const dob = s.age ? `${new Date().getFullYear() - s.age}-06-30` : null
        const { data: newStudent, error: stuErr } = await supabase
          .from('students')
          .insert({
            tenant_id: tenantId,
            family_id: familyId,
            first_name: s.firstName,
            last_name: s.lastName,
            date_of_birth: dob,
          })
          .select('id')
          .single()
        if (stuErr || !newStudent) {
          stats.errors.push(`Student "${s.cleanName}": ${stuErr?.message}`)
          continue
        }
        studentId = newStudent.id
        stats.studentsInserted++
      }

      // Upsert enrolment — dedup by student + class
      const { data: existingEnrol } = await supabase
        .from('enrolments')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .maybeSingle()

      if (!existingEnrol) {
        // Parse start date if possible — formats seen: "02.02.26", "Oct 4, 2025", "01.02.26"
        let startDate = new Date().toISOString().slice(0, 10)
        const dmy = s.startDateRaw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/)
        if (dmy) {
          const dd = dmy[1]!.padStart(2, '0')
          const mm = dmy[2]!.padStart(2, '0')
          const yy = dmy[3]!.length === 2 ? `20${dmy[3]}` : dmy[3]!
          startDate = `${yy}-${mm}-${dd}`
        }

        const { error: enrErr } = await supabase
          .from('enrolments')
          .insert({
            tenant_id: tenantId,
            student_id: studentId,
            class_id: classId,
            start_date: startDate,
            status: 'active',
            term: TERM,
            notes: s.commitment ? `Commitment: ${s.commitment}` : null,
          })
        if (enrErr) {
          stats.errors.push(`Enrol "${s.cleanName}" → ${meta.name}: ${enrErr.message}`)
        } else {
          stats.enrolmentsCreated++
        }
      }
    } catch (e) {
      stats.errors.push(`${s.cleanName} (${sheetName.trim()}): ${(e as Error).message}`)
    }
  }
}

console.log('\n=== Roll-sheet import done ===')
console.log(`  Sheets processed   : ${stats.sheetsProcessed}`)
console.log(`  Sheets skipped     : ${stats.sheetsSkipped}`)
console.log(`  Classes upserted   : ${stats.classesUpserted}`)
console.log(`  Students inserted  : ${stats.studentsInserted}`)
console.log(`  Students updated   : ${stats.studentsUpdated}`)
console.log(`  Placeholder families created: ${stats.familiesCreated}`)
console.log(`  Enrolments created : ${stats.enrolmentsCreated}`)
if (stats.errors.length) {
  console.log(`\n⚠ ${stats.errors.length} error(s):`)
  for (const e of stats.errors.slice(0, 10)) console.log('  - ' + e)
}

if (unmatched.length) {
  const out = unmatched.map((u) => `- [${u.sheet}] ${u.student}`).join('\n')
  writeFileSync('C:/Users/Rhett Morrow/my-assistant/bsc-crm/research/unmatched-students.md', `# Students whose family couldn't be auto-matched\n\nThese got a placeholder family created. Search them in /families and link to the real parent record.\n\n${out}\n`)
  console.log(`\n📝 ${unmatched.length} unmatched student(s) listed at research/unmatched-students.md`)
}
process.exit(0)
