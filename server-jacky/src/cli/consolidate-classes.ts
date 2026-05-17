#!/usr/bin/env node
// Cleanup: rename imported "T1/T2 ..." classes to human-friendly names,
// and cancel the 18 old empty-shell classes so they don't clutter /roll-call.
// Rhett can resurrect any old class via the CRM by setting status='active'.

import { supabase, getTenantId } from '../tools/supabase.js'

const RENAMES: Record<string, string> = {
  'T1 Monday Acro':              'Mon 4:00 Acro',
  'T1 Tuesday Aerial':           'Tue 4:00 Aerial',
  'T1 Wednesday AM HS Circus':   'Wed 9:30 Homeschool Circus',
  'T1 Wednesday PM Circus':      'Wed 4:00 Circus',
  'T1 Thursday AM HS Circus':    'Thu 9:30 Homeschool Circus',
  'T1 Thursday PM Circus Fusion':'Thu 4:00 Circus Fusion',
  'T1 Friday Circus & Aerial':   'Fri 4:00 Circus & Aerial',
  'T2 Saturday AM Fusion':       'Sat 9:30 Fusion',
}

const tenantId = await getTenantId()

// 1. Rename imported classes
for (const [oldName, newName] of Object.entries(RENAMES)) {
  const { data, error } = await supabase
    .from('classes')
    .update({ name: newName })
    .eq('tenant_id', tenantId)
    .eq('name', oldName)
    .select('id, name')
  if (error) console.error(`Rename "${oldName}" failed: ${error.message}`)
  else if (data && data.length > 0) console.log(`✅ Renamed: ${oldName} → ${newName}`)
}

// 2. Cancel empty old classes (no enrolments)
const { data: allClasses } = await supabase
  .from('classes')
  .select('id, name, status')
  .eq('tenant_id', tenantId)
  .eq('status', 'active')

const { data: enrols } = await supabase
  .from('enrolments')
  .select('class_id')
  .in('class_id', (allClasses ?? []).map((c) => c.id))
const enrolByClass = (enrols ?? []).reduce<Record<string, number>>((acc, r) => {
  acc[r.class_id] = (acc[r.class_id] ?? 0) + 1
  return acc
}, {})

let cancelled = 0
for (const c of allClasses ?? []) {
  if ((enrolByClass[c.id] ?? 0) === 0) {
    const { error } = await supabase
      .from('classes')
      .update({ status: 'cancelled' })
      .eq('id', c.id)
    if (error) console.error(`Cancel "${c.name}" failed: ${error.message}`)
    else {
      console.log(`🗑  Cancelled (empty): ${c.name}`)
      cancelled++
    }
  }
}

console.log(`\n✅ Consolidation done. ${Object.keys(RENAMES).length} renames + ${cancelled} cancelled.`)
process.exit(0)
