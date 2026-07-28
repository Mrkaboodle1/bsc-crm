import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'
import { CoachRepliesClient, type Reply } from '@/components/coach-replies-client'

export const dynamic = 'force-dynamic'

export default async function CoachRepliesPage() {
  const user = await verifySession()
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('coach_replies')
    .select('id, coach_id, from_email, from_name, subject, body, is_read, received_at')
    .eq('tenant_id', user.tenantId).order('received_at', { ascending: false }).limit(200)

  const setupNeeded = !!error && (error.message.includes('does not exist') || error.message.includes('schema cache'))
  const replies = (data ?? []) as Reply[]

  return (
    <DashboardShell user={user} currentPath="/coaches/replies" pageTitle="Coach Replies" pageSubtitle="Replies from your coaches land here (and forward to your inbox).">
      {setupNeeded ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 max-w-2xl">
          <div className="text-3xl mb-2">🛠️</div>
          <h2 className="font-extrabold text-zinc-900 text-lg mb-2">One-time setup needed</h2>
          <p className="text-sm text-zinc-700">Paste <code className="bg-white px-1.5 py-0.5 rounded text-xs">schema/034_coach_replies.sql</code> into Supabase once, then refresh.</p>
        </div>
      ) : (
        <CoachRepliesClient initial={replies} />
      )}
    </DashboardShell>
  )
}
