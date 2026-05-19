// Permanently delete classes with status='cancelled'. These are leftovers
// from an earlier over-aggressive consolidation pass that we never cleaned
// up. They have 0 enrolments and just pollute reports.

import { supabase, getTenantId } from '../tools/supabase.js'

async function main() {
  const tenantId = await getTenantId()

  const { data: cancelled, error: listErr } = await supabase
    .from('classes')
    .select('id, name, day_of_week, start_time')
    .eq('tenant_id', tenantId)
    .eq('status', 'cancelled')
  if (listErr) {
    console.error('Failed to list cancelled classes:', listErr)
    process.exit(1)
  }

  if (!cancelled || cancelled.length === 0) {
    console.log('No cancelled classes to delete.')
    return
  }

  console.log(`Found ${cancelled.length} cancelled classes to delete:`)
  for (const c of cancelled) {
    console.log(`  - ${c.name}`)
  }

  // Safety: confirm no active enrolments tied to any of these (delete should
  // cascade but we want to be sure no real student data is dragged with it).
  const ids = cancelled.map((c) => c.id)
  const { count: activeEnrolCount } = await supabase
    .from('enrolments')
    .select('id', { count: 'exact', head: true })
    .in('class_id', ids)
    .eq('status', 'active')
  console.log(`Active enrolments on cancelled classes: ${activeEnrolCount ?? 0}`)
  if ((activeEnrolCount ?? 0) > 0) {
    console.error('⚠️ Aborting — there are active enrolments on a "cancelled" class. Investigate first.')
    process.exit(1)
  }

  const { error: delErr } = await supabase
    .from('classes')
    .delete()
    .in('id', ids)
  if (delErr) {
    console.error('Delete failed:', delErr)
    process.exit(1)
  }
  console.log(`✅ Deleted ${cancelled.length} cancelled classes.`)
}

main().catch((e) => {
  console.error('💥', e)
  process.exit(1)
})
