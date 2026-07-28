import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { TraineeLogbook, type Trainee, type LogEntry } from '@/components/trainee-logbook'

export const dynamic = 'force-dynamic'

export default async function LogbookPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const canManage = ['owner', 'manager'].includes(user.role)

  // Coaches (resilient: trainee_level/trainee_goals exist only after migration 023).
  let rows: Record<string, unknown>[] | null = null
  const a = await supabase.from('coaches').select('id, full_name, role, status, trainee_level, trainee_goals').order('full_name')
  if (a.error && /trainee_level|trainee_goals/.test(a.error.message)) {
    const b = await supabase.from('coaches').select('id, full_name, role, status').order('full_name')
    rows = b.data as Record<string, unknown>[] | null
  } else rows = a.data as Record<string, unknown>[] | null

  const trainees: Trainee[] = (rows ?? [])
    .filter((r) => r.status !== 'departed')
    .map((r) => ({ id: r.id as string, name: r.full_name as string, role: (r.role as string) ?? null, level: (r.trainee_level as string) ?? null, goals: (r.trainee_goals as string) ?? null }))

  // Logbook entries (table exists only after migration 023).
  let entries: LogEntry[] = []
  let needsSetup = false
  const e = await supabase.from('trainee_logbook').select('id, coach_id, entry_date, time_in, time_out, hours, activity, signed_off').order('entry_date', { ascending: false })
  if (e.error) { if (/does not exist|relation|schema cache/.test(e.error.message)) needsSetup = true }
  else entries = (e.data ?? []) as LogEntry[]

  return (
    <DashboardShell user={user} currentPath="/coaching/logbook" pageTitle="Trainee Logbooks" pageSubtitle="Hours, level and goals for each trainee — the digital booklet.">
      {needsSetup ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 max-w-2xl">
          <div className="text-3xl mb-2">🛠️</div>
          <h2 className="font-extrabold text-zinc-900 text-lg mb-2">One-time setup needed</h2>
          <p className="text-sm text-zinc-700">Paste <code className="bg-white px-1.5 py-0.5 rounded text-xs">schema/023_trainee_logbook.sql</code> into Supabase once, then refresh.</p>
        </div>
      ) : (
        <TraineeLogbook trainees={trainees} entries={entries} canManage={canManage} />
      )}
    </DashboardShell>
  )
}
