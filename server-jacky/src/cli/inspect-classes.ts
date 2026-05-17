#!/usr/bin/env node
import { supabase, getTenantId } from '../tools/supabase.js'

const tenantId = await getTenantId()
const { data: classes } = await supabase
  .from('classes')
  .select('id, name, day_of_week, start_time, discipline, status, created_at')
  .eq('tenant_id', tenantId)
  .order('day_of_week', { ascending: true })
  .order('start_time', { ascending: true })

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Count enrolments per class
const classIds = (classes ?? []).map((c) => c.id)
const { data: enrols } = await supabase
  .from('enrolments')
  .select('class_id')
  .in('class_id', classIds)
const enrolByClass = (enrols ?? []).reduce<Record<string, number>>((acc, r) => {
  acc[r.class_id] = (acc[r.class_id] ?? 0) + 1
  return acc
}, {})

console.log(`\n${classes?.length ?? 0} classes total. ↓ enrolment counts:\n`)
for (const c of classes ?? []) {
  const dow = c.day_of_week ?? -1
  const day = dow >= 0 && dow <= 6 ? DAYS[dow] : '???'
  const enrolled = enrolByClass[c.id] ?? 0
  const flag = enrolled > 0 ? '✅' : '⚠️'
  console.log(`  ${flag} ${day} ${c.start_time?.slice(0, 5) ?? '?'} · ${enrolled} students · ${c.status} · ${c.name} (id ${c.id.slice(0, 8)})`)
}
process.exit(0)
