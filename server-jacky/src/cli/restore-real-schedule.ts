#!/usr/bin/env node
// Undo my over-aggressive consolidation. The OLD seeded classes (Mon 3:45,
// Mon 4:45, Mon 5:45 etc.) match Rhett's actual published schedule. Restore
// them, then redistribute the students I bulk-imported into the correct
// age-banded classes.

import { supabase, getTenantId } from '../tools/supabase.js'

const tenantId = await getTenantId()

// 1. Restore every class I cancelled this morning back to active.
const { data: cancelled } = await supabase
  .from('classes')
  .select('id, name')
  .eq('tenant_id', tenantId)
  .eq('status', 'cancelled')

let restored = 0
for (const c of cancelled ?? []) {
  const { error } = await supabase
    .from('classes')
    .update({ status: 'active' })
    .eq('id', c.id)
  if (!error) {
    console.log(`✅ Restored: ${c.name}`)
    restored++
  }
}
console.log(`\nRestored ${restored} classes.`)

// 2. Build a lookup of the canonical classes by name.
const { data: allActive } = await supabase
  .from('classes')
  .select('id, name')
  .eq('tenant_id', tenantId)
  .eq('status', 'active')
const byName = new Map((allActive ?? []).map((c) => [c.name, c.id]))

// 3. Redistribution plan. Source = my over-merged class. Target = age-banded
//    real class names. The redistribute() helper does the moving.
type Redist = {
  source: string  // the class I created during import
  byAge: Array<{ min: number; max: number; target: string }>
  fallback?: string  // where age-unknown students go
}

const REDIST: Redist[] = [
  {
    source: 'Mon 4:00 Acro',
    byAge: [
      { min: 0, max: 8,  target: 'Mon 3:45 Circus Acro 5-8' },
      { min: 9, max: 17, target: 'Mon 4:45 Circus Acro 9-15' },
      { min: 18, max: 99, target: 'Mon 5:45 Adult Circus' },
    ],
    fallback: 'Mon 4:45 Circus Acro 9-15', // safest default for unknown ages
  },
  {
    source: 'Tue 4:00 Aerial',
    byAge: [
      { min: 0, max: 8,  target: 'Tue 3:45 Junior Aerial' },
      { min: 9, max: 14, target: 'Tue 5:00 Senior Aerial' },
      { min: 15, max: 99, target: 'Tue 6:15 Teen Aerial' },
    ],
    fallback: 'Tue 3:45 Junior Aerial',
  },
  {
    source: 'Wed 4:00 Circus',
    byAge: [
      { min: 0, max: 7,  target: 'Wed 3:45 Circus Fusion 5-8' },
      { min: 8, max: 99, target: 'Wed 4:45 Circus Fusion 8-15' },
    ],
    fallback: 'Wed 4:45 Circus Fusion 8-15',
  },
  {
    source: 'Thu 4:00 Circus Fusion',
    byAge: [
      { min: 0, max: 8,  target: 'Thu 3:45 Circus Fusion 5-8' },
      { min: 9, max: 99, target: 'Thu 4:45 Circus Fusion 9-15' },
    ],
    fallback: 'Thu 4:45 Circus Fusion 9-15',
  },
  {
    source: 'Fri 4:00 Circus & Aerial',
    byAge: [
      { min: 0, max: 8,  target: 'Fri 3:45 Junior Aerial' },
      { min: 9, max: 99, target: 'Fri 4:45 Senior Aerial' },
    ],
    fallback: 'Fri 4:45 Senior Aerial',
  },
  // Wed AM Homeschool and Sat AM Fusion — schedule has only one option each so leave them
  // mapped to the existing single class. We just need to rename my class to match.
  {
    source: 'Wed 9:30 Homeschool Circus',
    byAge: [],
    fallback: 'Wed 10:30 Homeschool Circus', // schedule says 10:30 is the Circus slot
  },
  {
    source: 'Thu 9:30 Homeschool Circus',
    byAge: [],
    fallback: 'Wed 10:30 Homeschool Circus', // Thu HS only has 3 kids — Rhett can move manually if needed
  },
  {
    source: 'Sat 9:30 Fusion',
    byAge: [],
    fallback: 'Sat 9:00 Circus Fusion',
  },
]

const today = new Date().toISOString().slice(0, 10)

for (const plan of REDIST) {
  const sourceId = byName.get(plan.source)
  if (!sourceId) {
    console.log(`⚠ Source class not found (already cleaned up?): ${plan.source}`)
    continue
  }
  // Pull active enrolments + student DOB so we can age-bucket
  const { data: enrols } = await supabase
    .from('enrolments')
    .select('id, student_id, notes, student:students!enrolments_student_id_fkey(date_of_birth, first_name, last_name)')
    .eq('class_id', sourceId)
    .eq('status', 'active')
  if (!enrols || enrols.length === 0) {
    console.log(`\nNo enrolments to redistribute from ${plan.source}.`)
    continue
  }

  console.log(`\n=== Redistributing ${enrols.length} from ${plan.source} ===`)
  let moved = 0
  for (const e of enrols) {
    const stu = Array.isArray(e.student) ? e.student[0] : e.student
    const dob = stu?.date_of_birth
    let age: number | null = null
    if (dob) {
      const yr = new Date(dob).getFullYear()
      age = new Date().getFullYear() - yr
    }
    let targetName: string | null = null
    if (age !== null && plan.byAge.length > 0) {
      const band = plan.byAge.find((b) => age! >= b.min && age! <= b.max)
      if (band) targetName = band.target
    }
    if (!targetName) targetName = plan.fallback ?? null
    if (!targetName) continue
    const targetId = byName.get(targetName)
    if (!targetId) {
      console.log(`  ⚠ Target class not found: ${targetName} (skipping ${stu?.first_name})`)
      continue
    }
    if (targetId === sourceId) continue

    // Check if student already enrolled in target
    const { data: existing } = await supabase
      .from('enrolments')
      .select('id')
      .eq('student_id', e.student_id)
      .eq('class_id', targetId)
      .maybeSingle()

    if (existing) {
      // Already enrolled — just cancel the duplicate (don't double-enrol)
      await supabase.from('enrolments').update({ status: 'cancelled', end_date: today }).eq('id', e.id)
    } else {
      // Move: point this enrolment row at the new class
      await supabase.from('enrolments').update({ class_id: targetId }).eq('id', e.id)
    }
    console.log(`  ${stu?.first_name ?? '?'} ${stu?.last_name ?? ''} (age ${age ?? '?'}) → ${targetName}`)
    moved++
  }
  console.log(`  Moved: ${moved}/${enrols.length}`)

  // If no enrolments left, cancel the source class
  const { data: remaining } = await supabase
    .from('enrolments')
    .select('id')
    .eq('class_id', sourceId)
    .eq('status', 'active')
  if (!remaining || remaining.length === 0) {
    await supabase.from('classes').update({ status: 'cancelled' }).eq('id', sourceId)
    console.log(`  🗑 Cancelled empty source class: ${plan.source}`)
  }
}

console.log('\n✅ Done. Refresh /roll-call.')
process.exit(0)
