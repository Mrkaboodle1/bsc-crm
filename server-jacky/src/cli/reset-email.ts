#!/usr/bin/env node
// Reset an email so it gets re-triaged on the next run. Pass the subject
// (substring match) or "all-junk" to wipe everything classified as
// junk_or_automated. Also clears any pending_actions referencing them.

import { supabase, getTenantId } from '../tools/supabase.js'

const arg = process.argv.slice(2).join(' ').trim()
if (!arg) {
  console.error('Usage: npm run reset:email <subject substring | all-junk>')
  process.exit(1)
}

const tenantId = await getTenantId()

let query = supabase.from('email_messages').select('id, subject, from_email, classification').eq('tenant_id', tenantId)
if (arg === 'all-junk') {
  query = query.eq('classification', 'junk_or_automated')
} else {
  query = query.ilike('subject', `%${arg}%`)
}
const { data: emails, error } = await query
if (error) { console.error(`❌ ${error.message}`); process.exit(1) }
if (!emails || emails.length === 0) {
  console.log('No matching emails.'); process.exit(0)
}

console.log(`Matched ${emails.length} email(s):`)
for (const e of emails) console.log(`  - ${e.from_email} / ${e.classification} / ${e.subject?.slice(0, 70)}`)

const ids = emails.map((e) => e.id)
// Delete dependent pending_actions first (FK)
const { error: paErr, count: paCount } = await supabase
  .from('pending_actions')
  .delete({ count: 'exact' })
  .eq('tenant_id', tenantId)
  .in('source_email_id', ids)
if (paErr) console.warn(`⚠ Couldn't clear pending_actions: ${paErr.message}`)
else console.log(`Cleared ${paCount ?? 0} pending_action(s)`)

const { error: emErr } = await supabase
  .from('email_messages')
  .delete()
  .eq('tenant_id', tenantId)
  .in('id', ids)
if (emErr) { console.error(`❌ ${emErr.message}`); process.exit(1) }
console.log(`✅ Deleted ${ids.length} email_messages row(s). Next triage run will re-process them.`)
process.exit(0)
