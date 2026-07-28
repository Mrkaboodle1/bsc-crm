import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'
import { MessageHistoryClient, type Thread } from '@/components/message-history-client'

export const dynamic = 'force-dynamic'

// Every text/email thread with a parent, imported out of Tectonic so the
// history survives the cutover. Read-only archive — replies still go out
// through the normal Chat inbox / SMS.
export default async function MessageHistoryPage() {
  const user = await verifySession()
  const admin = createAdminSupabase()
  const canImport = ['owner', 'manager'].includes(user.role)

  const { data, error } = await admin
    .from('conversations')
    .select('id, contact_name, phone, email, channel, last_message, last_at, unread, family_id')
    .eq('tenant_id', user.tenantId)
    .order('last_at', { ascending: false, nullsFirst: false })
    .limit(500)

  const needsSetup = !!error
  const threads = (data ?? []) as Thread[]

  return (
    <DashboardShell
      user={user}
      currentPath="/conversations/history"
      pageTitle="Message History"
      pageSubtitle="Every text &amp; email thread with your families — brought over from Tectonic."
    >
      {needsSetup ? (
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-8 text-center max-w-xl mx-auto">
          <div className="text-4xl mb-2">🗄️</div>
          <h2 className="text-xl font-black text-zinc-900">One setup step needed</h2>
          <p className="text-zinc-600 mt-2">
            Open Supabase → SQL editor, paste the file <strong>schema/058_tectonic_cutover.sql</strong> and hit <strong>Run</strong>.
            Then come back here and press <strong>Import from Tectonic</strong> — your 1,788 parent conversations will come across.
          </p>
        </div>
      ) : (
        <MessageHistoryClient threads={threads} canImport={canImport} />
      )}
    </DashboardShell>
  )
}
