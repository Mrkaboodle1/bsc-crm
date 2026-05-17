#!/usr/bin/env node
// Remove junk student rows that snuck in from xlsx header/total/section
// rows during the roll-sheet import. Hard-delete the student + their
// enrolments + their placeholder family (if no other students linked).

import { supabase, getTenantId } from '../tools/supabase.js'

const JUNK_PATTERNS = [
  /^weekly\s*roll\s*call/i,
  /^child\s*name/i,
  /^childs\s*name/i,
  /^circus\s*fusion/i,
  /^circus\s*acro/i,
  /^aerial/i,
  /^total\s/i,
  /^wed\s*$/i,
  /^thu\s*$/i,
  /^fri\s*$/i,
  /^mon\s*$/i,
  /^tue\s*$/i,
  /^sat\s*$/i,
  /^private\s+(lessons|group)/i,
  /^coach:/i,
  /^kids\s*night\s*out/i,
  /^homework\s*$/i,
  /^moo\s*moo$/i,         // looks like a nickname placeholder
  /^\.+$/,                 // just dots
  /^\?+$/,
]

const tenantId = await getTenantId()
const PAGE = 1000
let all: Array<{ id: string; first_name: string; last_name: string | null; family_id: string }> = []
for (let offset = 0; ; offset += PAGE) {
  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, family_id')
    .eq('tenant_id', tenantId)
    .range(offset, offset + PAGE - 1)
  if (error) { console.error(error.message); process.exit(1) }
  if (!data || data.length === 0) break
  all = all.concat(data)
  if (data.length < PAGE) break
}
console.log(`Scanned ${all.length} students.`)

const junk = all.filter((s) => {
  const full = `${s.first_name} ${s.last_name ?? ''}`.trim()
  return JUNK_PATTERNS.some((re) => re.test(full)) || JUNK_PATTERNS.some((re) => re.test(s.first_name))
})

if (junk.length === 0) {
  console.log('No junk students found. All clean.')
  process.exit(0)
}

console.log(`\nFound ${junk.length} junk student(s):`)
for (const s of junk) {
  console.log(`  - ${s.first_name} ${s.last_name ?? ''}`)
}

console.log('\nDeleting…')
// Cascade: enrolments + attendance FK to students with ON DELETE CASCADE so
// deleting the student row cleans up downstream rows automatically.
const ids = junk.map((s) => s.id)
const familyIds = [...new Set(junk.map((s) => s.family_id))]

const { error: delErr } = await supabase.from('students').delete().in('id', ids)
if (delErr) { console.error(`Delete failed: ${delErr.message}`); process.exit(1) }
console.log(`✅ Deleted ${ids.length} students.`)

// Also clean up placeholder families that are now empty + tagged 'from-roll-sheet'
let famDeleted = 0
for (const famId of familyIds) {
  const { data: remaining } = await supabase.from('students').select('id').eq('family_id', famId).limit(1)
  if (remaining && remaining.length === 0) {
    const { data: fam } = await supabase.from('families').select('tags').eq('id', famId).maybeSingle()
    if (fam && Array.isArray(fam.tags) && fam.tags.includes('from-roll-sheet')) {
      await supabase.from('families').delete().eq('id', famId)
      famDeleted++
    }
  }
}
console.log(`✅ Cleaned up ${famDeleted} empty placeholder families.`)
process.exit(0)
