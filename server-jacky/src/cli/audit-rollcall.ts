// Quick audit of what's in the database right now for the Roll Call.
// Run: npm run cli -- audit-rollcall
//
// Prints class count, student count, enrolment count, and attendance count
// so we can see whether the Term 2 2026 import actually landed or got wiped.

import { supabase, getTenantId } from '../tools/supabase.js'

async function main() {
  const tenantId = await getTenantId()
  console.log(`Tenant: ${tenantId}\n`)

  const { count: classCount, data: classSample } = await supabase
    .from('classes')
    .select('id, name, day_of_week, start_time, status, capacity', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  const { count: activeCount } = await supabase
    .from('classes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const { count: studentCount } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const { count: enrolCount } = await supabase
    .from('enrolments')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const { count: activeEnrolCount } = await supabase
    .from('enrolments')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const { count: attendanceCount } = await supabase
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  console.log('=== ROLL CALL DATABASE AUDIT ===')
  console.log(`Classes total       : ${classCount}`)
  console.log(`Classes active      : ${activeCount}`)
  console.log(`Students            : ${studentCount}`)
  console.log(`Enrolments total    : ${enrolCount}`)
  console.log(`Enrolments active   : ${activeEnrolCount}`)
  console.log(`Attendance records  : ${attendanceCount}`)
  console.log('')
  console.log('=== CLASS SAMPLE (first 30) ===')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (const c of (classSample ?? []).slice(0, 30)) {
    const enrolHere = await supabase
      .from('enrolments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', c.id)
      .eq('status', 'active')
    console.log(`  [${c.status}] ${days[c.day_of_week]} ${c.start_time} — ${c.name} (${enrolHere.count ?? 0} enrolled, cap ${c.capacity})`)
  }
}

main().catch((e) => {
  console.error('💥', e)
  process.exit(1)
})
