import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'

type CoachRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: string | null
  employment_type: string | null
  pay_rate: number | null
  skills: string[]
  blue_card_number: string | null
  blue_card_expiry: string | null
  first_aid_expiry: string | null
  ga_accreditation: string | null
  status: string
}

const ROLE_CLS: Record<string, string> = {
  head: 'bg-[#D72027] text-white',
  adult: 'bg-blue-100 text-blue-800',
  trainee: 'bg-amber-100 text-amber-800',
  casual: 'bg-zinc-100 text-zinc-700',
}

export default async function CoachesPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })
    .returns<CoachRow[]>()

  const today = new Date()
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30)
  const in60 = new Date(today); in60.setDate(in60.getDate() + 60)

  const coaches = (data ?? []).filter((c) => c.status !== 'departed')
  const expiringBlue = coaches.filter((c) => c.blue_card_expiry && new Date(c.blue_card_expiry) <= in60).length
  const expiringFirstAid = coaches.filter((c) => c.first_aid_expiry && new Date(c.first_aid_expiry) <= in60).length

  return (
    <DashboardShell
      user={user}
      currentPath="/coaches"
      pageTitle="Coaches"
      pageSubtitle={`${coaches.length} active coaches`}
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          {error.message}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat icon="🤝" label="Active coaches" value={coaches.length} />
        <Stat icon="👤" label="Head coaches" value={coaches.filter((c) => c.role === 'head').length} />
        <Stat icon="🛡" label="Blue card expiring (60d)" value={expiringBlue} alert={expiringBlue > 0} />
        <Stat icon="🚑" label="First aid expiring (60d)" value={expiringFirstAid} alert={expiringFirstAid > 0} />
      </section>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3">Coach</th>
              <th className="px-4 py-3 hidden md:table-cell">Skills</th>
              <th className="px-4 py-3 hidden lg:table-cell">Blue card</th>
              <th className="px-4 py-3 hidden lg:table-cell">First aid</th>
              <th className="px-4 py-3 hidden xl:table-cell">GA</th>
              <th className="px-4 py-3 text-right">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {coaches.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                      {initials(c.full_name)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-zinc-900 truncate">{c.full_name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.role && (
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${ROLE_CLS[c.role] ?? 'bg-zinc-100 text-zinc-700'}`}>
                            {c.role}
                          </span>
                        )}
                        {c.employment_type && (
                          <span className="text-[10px] text-zinc-500 truncate">{c.employment_type.replace('_', ' ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(c.skills ?? []).slice(0, 5).map((s) => (
                      <span key={s} className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-bold">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs">
                  <ExpiryPill date={c.blue_card_expiry} />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs">
                  <ExpiryPill date={c.first_aid_expiry} />
                </td>
                <td className="px-4 py-3 hidden xl:table-cell text-xs text-zinc-600 capitalize">
                  {c.ga_accreditation && c.ga_accreditation !== 'none' ? c.ga_accreditation : '—'}
                </td>
                <td className="px-4 py-3 text-right font-extrabold text-zinc-900">
                  {c.pay_rate !== null ? `$${c.pay_rate}` : '—'}
                </td>
              </tr>
            ))}
            {coaches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                  No coaches yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  )
}

function ExpiryPill({ date }: { date: string | null }) {
  if (!date) return <span className="text-zinc-400">—</span>
  const exp = new Date(date)
  const today = new Date()
  const days = Math.ceil((exp.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return <span className="bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded">Expired {date}</span>
  if (days <= 30) return <span className="bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded">{date} ({days}d)</span>
  if (days <= 60) return <span className="bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded">{date} ({days}d)</span>
  return <span className="text-zinc-600">{date}</span>
}

function Stat({ icon, label, value, alert }: { icon: string; label: string; value: number; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${alert ? 'border-amber-300' : 'border-zinc-200'} p-4 relative overflow-hidden`}>
      {alert && <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" aria-hidden />}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-2xl font-extrabold text-zinc-900 leading-none">{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-1">{label}</div>
        </div>
      </div>
    </div>
  )
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'
}
