import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ClassFormButton, type ClassRecord, type Coach } from '@/components/class-form'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DISC: Record<string, string> = { circus_acro: 'Circus Acro', aerial: 'Aerial', fusion: 'Circus Fusion', drama: 'Drama', toddler: 'Toddler', homeschool: 'Homeschool', adult: 'Adult', ndis: 'NDIS', private: 'Private lesson', show_programme: 'Show Programme' }

function fmt(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':'); const hr = parseInt(h, 10)
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`
}

type Row = ClassRecord & { primary_coach: { full_name: string } | { full_name: string }[] | null }

export default async function ClassesPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const [{ data: classes }, { data: coaches }] = await Promise.all([
    supabase.from('classes').select('id, name, discipline, day_of_week, start_time, duration_minutes, age_min, age_max, capacity, weekly_fee, primary_coach_id, primary_coach:coaches!classes_primary_coach_id_fkey(full_name)').eq('status', 'active').order('day_of_week').order('start_time').returns<Row[]>(),
    supabase.from('coaches').select('id, full_name').order('full_name').returns<Coach[]>(),
  ])
  const rows = classes ?? []
  const coachList = coaches ?? []

  return (
    <DashboardShell user={user} currentPath="/classes" pageTitle="Classes" pageSubtitle={`${rows.length} active classes & private lessons`} pageActions={<ClassFormButton coaches={coachList} />}>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
            <th className="px-4 py-3 font-semibold">Class</th><th className="px-3 py-3 font-semibold">Day</th>
            <th className="px-3 py-3 font-semibold">Time</th><th className="px-3 py-3 font-semibold">Type</th>
            <th className="px-3 py-3 font-semibold">Coach</th><th className="px-3 py-3 font-semibold">Cap</th><th className="px-3 py-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((c) => {
              const coach = Array.isArray(c.primary_coach) ? c.primary_coach[0] : c.primary_coach
              return (
                <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50/60">
                  <td className="px-4 py-3 font-medium text-zinc-800">{c.name}</td>
                  <td className="px-3 py-3 text-zinc-600">{DAYS[c.day_of_week ?? 0]}</td>
                  <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">{fmt(c.start_time)}</td>
                  <td className="px-3 py-3"><span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">{DISC[c.discipline || ''] || c.discipline}</span></td>
                  <td className="px-3 py-3 text-zinc-600">{coach?.full_name || '—'}</td>
                  <td className="px-3 py-3 text-zinc-600">{c.capacity}</td>
                  <td className="px-3 py-3 text-right"><ClassFormButton coaches={coachList} editing={c} label="Edit" subtle /></td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-400">No classes yet — add your first one.</td></tr>}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  )
}
