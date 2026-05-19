import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { InboxList, type InboxRow } from '@/components/inbox-list'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()

  let query = supabase
    .from('pending_actions')
    .select(`
      id, kind, triggered_by, status, priority, reasoning,
      draft_subject, draft_body, draft_recipient, draft_metadata,
      created_at, updated_at,
      source_email:email_messages!pending_actions_source_email_id_fkey (
        id, from_email, from_name, subject, body_text, received_at, classification, classification_confidence
      ),
      family:families!pending_actions_related_family_id_fkey ( id, family_name, lifecycle_stage )
    `)
    .order('priority', { ascending: false }) // urgent → high → normal → low (alpha sort puts urgent last though)
    .order('created_at', { ascending: false })

  const statusFilter = filter ?? 'pending'
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  const rows: InboxRow[] = (data ?? []).map((r) => {
    const src = Array.isArray(r.source_email) ? r.source_email[0] : r.source_email
    const fam = Array.isArray(r.family) ? r.family[0] : r.family
    return {
      id: r.id,
      kind: r.kind,
      triggeredBy: r.triggered_by,
      status: r.status,
      priority: r.priority,
      reasoning: r.reasoning,
      draftSubject: r.draft_subject,
      draftBody: r.draft_body,
      draftRecipient: r.draft_recipient,
      createdAt: r.created_at,
      family: fam ? { id: fam.id, name: fam.family_name, lifecycle: fam.lifecycle_stage } : null,
      sourceEmail: src
        ? {
            id: src.id,
            fromEmail: src.from_email,
            fromName: src.from_name,
            subject: src.subject,
            bodyText: src.body_text,
            receivedAt: src.received_at,
            classification: src.classification,
          }
        : null,
    }
  })

  // Custom priority sort (urgent / high / normal / low) — overrides DB alpha
  const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
  rows.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))

  // Counts for filter pills
  const countByStatus = (data ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <DashboardShell
      user={user}
      currentPath="/inbox"
      pageTitle="Approval queue"
      pageSubtitle="Drafts queued by Jacky — review, edit, and approve before they send."
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          {error.message}
          {error.message.includes('does not exist') && (
            <div className="mt-2 text-xs">
              Migration 006 hasn&apos;t been applied yet. Paste{' '}
              <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded">schema/006_agent_queue.sql</code>{' '}
              into Supabase SQL Editor.
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['pending', 'approved', 'sent', 'rejected', 'all'] as const).map((s) => {
          const active = (statusFilter ?? 'pending') === s
          const count = s === 'all' ? Object.values(countByStatus).reduce((a, b) => a + b, 0) : countByStatus[s] ?? 0
          return (
            <a
              key={s}
              href={`/inbox?filter=${s}`}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold capitalize px-3 py-1.5 rounded-md transition-colors ${
                active
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              {s} <span className={`ml-1 ${active ? 'opacity-80' : 'text-zinc-400'}`}>{count}</span>
            </a>
          )
        })}
      </div>

      <InboxList rows={rows} />
    </DashboardShell>
  )
}
