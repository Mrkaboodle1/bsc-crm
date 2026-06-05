import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { PrintButton } from '@/components/print-button'

// /roll-call/print — a clean, brandable weekly timetable for the office wall
// and social media. Standalone (no app shell) so it prints / screenshots well.

const DAYS = [{ d: 1, n: 'Monday' }, { d: 2, n: 'Tuesday' }, { d: 3, n: 'Wednesday' }, { d: 4, n: 'Thursday' }, { d: 5, n: 'Friday' }, { d: 6, n: 'Saturday' }]

function fmt(t: string) {
  const [h, m] = t.split(':'); const hr = parseInt(h, 10)
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`
}

type Row = { id: string; name: string; day_of_week: number; start_time: string; discipline: string; age_min: number | null; age_max: number | null; primary_coach: { full_name: string } | { full_name: string }[] | null }

export default async function RollCallPrintPage() {
  await verifySession()
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('classes')
    .select('id, name, day_of_week, start_time, discipline, age_min, age_max, primary_coach:coaches!classes_primary_coach_id_fkey(full_name)')
    .eq('status', 'active')
    .neq('discipline', 'private')
    .order('start_time')
    .returns<Row[]>()
  const classes = data ?? []

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-6 sm:p-10 print:p-0">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 print:mb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Big Star Circus</h1>
            <p className="text-sm text-zinc-500">Weekly Class Timetable</p>
          </div>
          <PrintButton />
        </div>

        <div className="rounded-2xl overflow-hidden border-4 border-[#D72027] print:border-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 print:grid-cols-6">
            {DAYS.map(({ d, n }) => {
              const dayClasses = classes.filter((c) => c.day_of_week === d)
              return (
                <div key={d} className="border-r border-amber-200 last:border-r-0">
                  <div className="bg-gradient-to-br from-[#D72027] to-[#A0151B] text-white text-center py-2.5 font-extrabold uppercase tracking-wide text-sm">{n}</div>
                  <div className="divide-y divide-amber-100 min-h-[120px]">
                    {dayClasses.length === 0 ? <div className="p-3 text-center text-xs text-zinc-300">—</div> : dayClasses.map((c, i) => {
                      const coach = Array.isArray(c.primary_coach) ? c.primary_coach[0] : c.primary_coach
                      return (
                        <div key={c.id} className={`p-2.5 ${i % 2 ? 'bg-amber-50' : 'bg-white'}`}>
                          <div className="font-bold text-[#D72027] text-sm">{fmt(c.start_time)}</div>
                          <div className="font-semibold text-xs text-zinc-800 leading-tight mt-0.5">{c.name.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat)\s+[\d:.]+\s*(am|pm)?\s*/i, '')}</div>
                          {(c.age_min != null || c.age_max != null) && <div className="text-[10px] text-zinc-500 mt-0.5">Ages {c.age_min ?? '?'}–{c.age_max ?? '?'}</div>}
                          {coach?.full_name && <div className="text-[10px] text-zinc-400">{coach.full_name}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="text-center mt-5 text-sm text-zinc-500 print:mt-3">
          Big Star Circus · Molendinar QLD · bigstarcircus.com.au
        </div>
        <p className="text-center text-xs text-zinc-400 mt-2 print:hidden">Tip: in the print window choose &ldquo;Save as PDF&rdquo; to download, or screenshot for social media.</p>
      </div>
    </div>
  )
}
