#!/usr/bin/env node
// Quick CLI: reject all currently-pending drafts (e.g. if Rhett's already
// replied manually and doesn't need them).

import { supabase, getTenantId } from '../tools/supabase.js'

const tenantId = await getTenantId()
const reason = process.argv.slice(2).join(' ') || 'Rejected via reject-pending CLI'

const { data, error } = await supabase
  .from('pending_actions')
  .update({ status: 'rejected', rejected_reason: reason })
  .eq('tenant_id', tenantId)
  .eq('status', 'pending')
  .select('id, draft_recipient, draft_subject')

if (error) {
  console.error(`❌ ${error.message}`)
  process.exit(1)
}

console.log(`✅ Rejected ${data.length} pending draft(s):`)
for (const r of data) {
  console.log(`   - ${r.draft_recipient}: ${r.draft_subject}`)
}
process.exit(0)
