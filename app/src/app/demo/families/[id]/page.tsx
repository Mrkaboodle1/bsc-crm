import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { demoUser, demoFamilies, demoStudents } from '@/lib/demo-data'

const LIFECYCLE_CLS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-blue-100 text-blue-800',
  lead: 'bg-amber-100 text-amber-800',
  paused: 'bg-zinc-100 text-zinc-600',
  past: 'bg-zinc-100 text-zinc-500',
  lost: 'bg-red-50 text-red-700',
}

export default async function DemoFamilyProfile({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const family = demoFamilies.find((f) => f.id === id)
  if (!family) notFound()

  const students = demoStudents.filter((s) => s.familyId === family.id)

  return (
    <DashboardShell
      user={demoUser}
      currentPath="/families"
      pageTitle={family.name}
      pageSubtitle={`${family.primaryParent} · (Demo mode)`}
      pageActions={
        <a
          href="/demo/families"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← All families
        </a>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-14 h-14 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-base font-extrabold shrink-0">
                {family.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${LIFECYCLE_CLS[family.lifecycle] ?? 'bg-zinc-100 text-zinc-500'}`}>
                  {family.lifecycle}
                </span>
                <div className="text-lg font-extrabold text-zinc-900 mt-1">{family.name}</div>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Parent" value={family.primaryParent} />
              <Row label="Email" value={family.email} />
              <Row label="Phone" value={family.phone} />
              <Row label="Source" value={family.source} />
            </dl>
            {family.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {family.tags.map((t) => (
                  <span key={t} className="text-[10px] font-extrabold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Billing</div>
            <div className="text-2xl font-extrabold text-zinc-900 mb-1">${family.weeklyFee}/week</div>
            <p className="text-xs text-zinc-500">
              {family.weeklyFee > 0 ? 'Stripe billing active' : 'Not yet billing'}
            </p>
          </div>
        </div>
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
                      href={`/demo/students/${s.id}`}
                      className="block bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                          {s.firstName[0]}{s.lastName[0]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-zinc-900 truncate">{s.firstName} {s.lastName}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{s.age}y · Tier {s.starTier}</div>
                          <div className="text-xs mt-1">
                            <span className="text-base">{'⭐'.repeat(s.starTier)}</span>
                            <span className="text-zinc-500 ml-2 text-[10px] font-bold uppercase tracking-wider">{s.totalStars} stars</span>
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
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Notes</h3>
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
