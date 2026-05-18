// /contacts/tasks — global tasks list with All / Due Today / Overdue / Upcoming
// filters, just like Tectonic's Tasks tab.

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ContactsSubnav } from '@/components/contacts-subnav'
import { TasksList, type TaskRow } from './tasks-list'

function brisbaneToday() {
  const now = new Date()
  const bris = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return bris.toISOString().slice(0, 10)
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const view = (filter ?? 'open') as 'all' | 'open' | 'due_today' | 'overdue' | 'upcoming' | 'done'
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const today = brisbaneToday()
  const tomorrowMs = Date.now() + 24 * 3600_000

  let query = supabase
    .from('tasks')
    .select(`
      id, title, description, status, priority, due_at, created_at, completed_at,
      related_family_id,
      family:families!tasks_related_family_id_fkey ( id, family_name, primary_parent )
    `)
    .eq('tenant_id', user.tenantId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(500)

  if (view === 'open') query = query.in('status', ['open', 'in_progress'])
  if (view === 'done') query = query.eq('status', 'done')
  if (view === 'due_today') {
    query = query
      .in('status', ['open', 'in_progress'])
      .gte('due_at', `${today}T00:00:00+10:00`)
      .lte('due_at', `${today}T23:59:59+10:00`)
  }
  if (view === 'overdue') {
    query = query
      .in('status', ['open', 'in_progress'])
      .lt('due_at', `${today}T00:00:00+10:00`)
  }
  if (view === 'upcoming') {
    query = query
      .in('status', ['open', 'in_progress'])
      .gte('due_at', new Date(tomorrowMs).toISOString())
  }

  const { data, error } = await query
  const tableMissing = error?.message?.includes('does not exist') || error?.message?.includes('relation')

  const rows: TaskRow[] = (data ?? []).map((t) => {
    const fam = Array.isArray(t.family) ? t.family[0] : t.family
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueAt: t.due_at,
      familyId: t.related_family_id,
      familyName: fam?.family_name ?? null,
      primaryParent: fam?.primary_parent ?? null,
    }
  })

  return (
    <DashboardShell
      user={user}
      currentPath="/contacts"
      pageTitle="Tasks"
      pageSubtitle={`${rows.length} ${rows.length === 1 ? 'task' : 'tasks'}${view === 'open' ? ' open' : view === 'overdue' ? ' overdue' : view === 'due_today' ? ' due today' : view === 'upcoming' ? ' upcoming' : view === 'done' ? ' completed' : ''}`}
    >
      <ContactsSubnav active="/contacts/tasks" />

      {tableMissing && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 mb-4 text-sm text-amber-900">
          <strong>Tasks table missing.</strong> Apply <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">schema/008_smartlists_tasks_companies.sql</code> in Supabase.
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {([
          ['open',      'Open'],
          ['due_today', 'Due today'],
          ['overdue',   '🔥 Overdue'],
          ['upcoming',  'Upcoming'],
          ['done',      'Done'],
          ['all',       'All'],
        ] as const).map(([id, label]) => (
          <a
            key={id}
            href={`/contacts/tasks?filter=${id}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
              view === id
                ? 'bg-zinc-900 text-white shadow'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      <TasksList rows={rows} />
    </DashboardShell>
  )
}
