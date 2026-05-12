import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'

const LIFECYCLE_CLS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-blue-100 text-blue-800',
  lead: 'bg-amber-100 text-amber-800',
  paused: 'bg-zinc-100 text-zinc-600',
  past: 'bg-zinc-100 text-zinc-500',
  lost: 'bg-red-50 text-red-700',
}

export default async function FamilyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data: family, error } = await supabase
    .from('families')
    .select(`
      id, family_name, primary_parent, email, phone, emergency_phone,
      address, source, lifecycle_stage, stripe_customer_id, weekly_fee_total,
      notes, tags, created_at,
      students:students!students_family_id_fkey (
        id, first_name, last_name, date_of_birth, total_stars, star_tier
      ),
      subscriptions:subscriptions!subscriptions_family_id_fkey (
        id, plan, weekly_amount, status, current_period_end, next_charge_date
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !family) notFound()

  const students = (family.students ?? []) as Array<{
    id: string
    first_name: string
    last_name: string | null
    date_of_birth: string | null
    total_stars: number
    star_tier: number
  }>
  const subs = (family.subscriptions ?? []) as Array<{
    id: string
    plan: string | null
    weekly_amount: number | null
    status: string
    current_period_end: string | null
    next_charge_date: string | null
  }>

  const activeSubs = subs.filter((s) => s.status === 'active')

  return (
    <DashboardShell
      user={user}
      currentPath="/families"
      pageTitle={family.family_name}
      pageSubtitle={family.primary_parent ?? 'Family profile'}
      pageActions={
        <a
          href="/families"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← All families
        </a>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — contact + lifecycle */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-14 h-14 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-base font-extrabold shrink-0">
                {family.family_name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                {family.lifecycle_stage && (
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${LIFECYCLE_CLS[family.lifecycle_stage] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {family.lifecycle_stage}
                  </span>
                )}
                <div className="text-lg font-extrabold text-zinc-900 mt-1 truncate">
                  {family.family_name}
                </div>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              {family.primary_parent && <Row label="Primary parent" value={family.primary_parent} />}
              {family.email && <Row label="Email" value={family.email} />}
              {family.phone && <Row label="Phone" value={family.phone} />}
              {family.emergency_phone && <Row label="Emergency" value={family.emergency_phone} />}
              {family.address && <Row label="Address" value={family.address} />}
              {family.source && <Row label="Source" value={family.source} />}
            </dl>
            {family.tags && family.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {family.tags.map((t: string) => (
                  <span key={t} className="text-[10px] font-extrabold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Billing */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">
              Billing
            </div>
            <div className="text-2xl font-extrabold text-zinc-900 mb-1">
              ${family.weekly_fee_total ?? 0}/week
            </div>
            {activeSubs.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm">
                {activeSubs.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-bold text-zinc-700 capitalize">{(s.plan ?? '—').replace('_', ' ')}</span>
                    <span className="text-zinc-500">
                      next: {s.next_charge_date ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500 mt-1">No active subscription on file.</p>
            )}
            {family.stripe_customer_id && (
              <div className="mt-3 text-[10px] text-zinc-400 font-mono">
                Stripe: {family.stripe_customer_id}
              </div>
            )}
          </div>
        </div>

        {/* Right — kids + notes */}
        <div className="xl:col-span-2 space-y-6">
          <section>
            <h3 className="text-lg font-extrabold text-zinc-900 mb-3">
              Kids ({students.length})
            </h3>
            {students.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 text-center text-sm text-zinc-500">
                No kids linked to this family yet.
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {students.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`/students/${s.id}`}
                      className="block bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                          {(s.first_name[0] || '?') + (s.last_name?.[0] ?? '')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-zinc-900 truncate">
                            {s.first_name} {s.last_name ?? ''}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {yearsOld(s.date_of_birth) !== null ? `${yearsOld(s.date_of_birth)}y · ` : ''}
                            Tier {s.star_tier}
                          </div>
                          <div className="text-xs mt-1">
                            <span className="text-base">{'⭐'.repeat(s.star_tier)}</span>
                            <span className="text-zinc-500 ml-2 text-[10px] font-bold uppercase tracking-wider">{s.total_stars} stars</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {family.notes && (
            <section className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
                Notes
              </h3>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{family.notes}</p>
            </section>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider font-bold text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-zinc-900 text-right text-sm font-bold truncate">{value}</dd>
    </div>
  )
}

function yearsOld(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}
