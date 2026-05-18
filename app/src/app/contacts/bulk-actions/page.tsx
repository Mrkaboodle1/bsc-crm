// /contacts/bulk-actions — audit log of campaigns, sends, and triage runs.
// Pulled from agent_activity (Jacky's cron logs) and pending_actions (per-
// recipient send results). Tectonic equivalent of "Bulk Actions" tab.

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ContactsSubnav } from '@/components/contacts-subnav'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function BulkActionsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Jacky's routine runs (read-the-inbox + send-approved cycles)
  const { data: activity } = await supabase
    .from('agent_activity')
    .select('id, routine, status, started_at, finished_at, emails_read, drafts_created, log_summary, ai_cost_usd')
    .eq('tenant_id', user.tenantId)
    .order('finished_at', { ascending: false, nullsFirst: false })
    .limit(50)

  // Recent campaign-style sends (bulk drafts grouped by triggered_by=campaign)
  const { data: campaigns } = await supabase
    .from('pending_actions')
    .select('id, kind, status, draft_subject, draft_recipient, created_at, sent_at, triggered_by, reasoning')
    .eq('tenant_id', user.tenantId)
    .eq('triggered_by', 'campaign')
    .order('created_at', { ascending: false })
    .limit(100)

  // Group campaign rows by reasoning text (same campaign = same reasoning string)
  const campaignGroups = new Map<string, { reasoning: string; total: number; sent: number; pending: number; failed: number; latest: string }>()
  for (const c of campaigns ?? []) {
    const key = c.reasoning ?? 'Unlabelled campaign'
    const g = campaignGroups.get(key) ?? { reasoning: key, total: 0, sent: 0, pending: 0, failed: 0, latest: c.created_at }
    g.total++
    if (c.status === 'sent') g.sent++
    else if (c.status === 'pending') g.pending++
    else if (c.status === 'failed') g.failed++
    if (new Date(c.created_at) > new Date(g.latest)) g.latest = c.created_at
    campaignGroups.set(key, g)
  }
  const groups = [...campaignGroups.values()].sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime())

  return (
    <DashboardShell
      user={user}
      currentPath="/contacts"
      pageTitle="Bulk actions"
      pageSubtitle="Track progress and results for bulk actions."
    >
      <ContactsSubnav active="/contacts/bulk-actions" />

      {/* Campaigns */}
      <section className="mb-8">
        <h2 className="text-lg font-extrabold text-zinc-900 mb-3">Campaigns</h2>
        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 text-center text-sm text-zinc-500">
            No bulk campaigns yet. <a href="/marketing/bulk-send" className="text-[#D72027] hover:underline font-bold">Start one →</a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3 text-right">Recipients</th>
                  <th className="px-4 py-3 text-right">Sent</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Failed</th>
                  <th className="px-4 py-3">Latest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {groups.map((g, i) => (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-800 max-w-[400px] truncate" title={g.reasoning}>{g.reasoning}</td>
                    <td className="px-4 py-3 text-right font-extrabold">{g.total}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-bold">{g.sent}</td>
                    <td className="px-4 py-3 text-right text-amber-700 font-bold">{g.pending}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-bold">{g.failed}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(g.latest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Agent routine activity */}
      <section>
        <h2 className="text-lg font-extrabold text-zinc-900 mb-3">Server-Jacky activity log</h2>
        {!activity || activity.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 text-center text-sm text-zinc-500">
            No routine activity recorded yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Routine</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Emails read</th>
                  <th className="px-4 py-3 text-right">Drafts</th>
                  <th className="px-4 py-3 text-right">AI cost</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3">Finished</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {activity.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-800 font-bold">{a.routine}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                        a.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{a.emails_read ?? 0}</td>
                    <td className="px-4 py-3 text-right">{a.drafts_created ?? 0}</td>
                    <td className="px-4 py-3 text-right text-zinc-500">${Number(a.ai_cost_usd ?? 0).toFixed(4)}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500 max-w-[300px] truncate">{a.log_summary ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(a.finished_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  )
}
