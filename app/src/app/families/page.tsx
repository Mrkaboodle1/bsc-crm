import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { FamilyListView, type FamilyRow } from '@/components/family-list-view'

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>
}) {
  const { q, stage } = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()

  let query = supabase
    .from('families')
    .select(`
      id, family_name, primary_parent, email, phone,
      source, lifecycle_stage, weekly_fee_total, tags,
      students:students!students_family_id_fkey ( id )
    `)
    .order('family_name', { ascending: true })

  if (q && q.trim()) {
    const term = q.trim()
    query = query.or(`family_name.ilike.%${term}%,primary_parent.ilike.%${term}%,email.ilike.%${term}%`)
  }
  if (stage && stage.trim()) {
    query = query.eq('lifecycle_stage', stage)
  }

  const { data, error } = await query

  const rows: FamilyRow[] = (data ?? []).map((f) => ({
    id: f.id,
    name: f.family_name,
    primaryParent: f.primary_parent,
    email: f.email,
    phone: f.phone,
    lifecycle: f.lifecycle_stage,
    source: f.source,
    weeklyFee: f.weekly_fee_total,
    studentCount: Array.isArray(f.students) ? f.students.length : 0,
    tags: f.tags ?? [],
  }))

  return (
    <DashboardShell
      user={user}
      currentPath="/families"
      pageTitle="Families"
      pageSubtitle={`${rows.length} families${q ? ` matching "${q}"` : ''}${stage ? ` · ${stage}` : ''}`}
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          {error.message}
        </div>
      )}
      <FamilyListView rows={rows} q={q ?? ''} stage={stage ?? ''} />
    </DashboardShell>
  )
}
