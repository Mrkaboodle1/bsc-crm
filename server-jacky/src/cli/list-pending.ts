import { supabase, getTenantId } from '../tools/supabase.js'
const tenantId = await getTenantId()
const { data: actions, error } = await supabase
  .from('pending_actions')
  .select('id,status,priority,draft_recipient,draft_subject,created_at')
  .eq('tenant_id', tenantId)
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
if (error) { console.error(error.message); process.exit(1) }
console.log(`Pending: ${actions?.length ?? 0}`)
for (const a of actions ?? []) {
  console.log(`  [${a.priority}] ${a.draft_recipient} — ${a.draft_subject}`)
}
