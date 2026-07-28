import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { StudentListView, type StudentRow } from '@/components/student-list-view'
import { AddStudentButton } from '@/components/add-student-button'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string }>
}) {
  const { q, tier } = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()

  let query = supabase
    .from('students')
    .select(`
      id, first_name, last_name, date_of_birth, total_stars, star_tier, trainee_status,
      family:families!students_family_id_fkey ( id, family_name, lifecycle_stage )
    `)
    .order('first_name', { ascending: true })

  if (q && q.trim()) {
    const term = q.trim()
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
  }
  if (tier && /^[1-5]$/.test(tier)) {
    query = query.eq('star_tier', parseInt(tier, 10))
  }

  const { data, error } = await query

  const { data: famRows } = await supabase.from('families').select('id, family_name, primary_parent').order('family_name')
  const families = (famRows ?? []).map((fm) => ({ id: fm.id, name: fm.primary_parent ? `${fm.family_name} (${fm.primary_parent})` : fm.family_name }))

  const rows: StudentRow[] = (data ?? []).map((s) => {
    const fam = Array.isArray(s.family) ? s.family[0] : s.family
    return {
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      age: yearsOld(s.date_of_birth),
      familyId: fam?.id ?? null,
      familyName: fam?.family_name ?? null,
      lifecycle: fam?.lifecycle_stage ?? null,
      totalStars: s.total_stars,
      starTier: s.star_tier,
      traineeStatus: s.trainee_status,
    }
  })

  return (
    <DashboardShell
      user={user}
      currentPath="/students"
      pageTitle="Students"
      pageSubtitle={`${rows.length} students${q ? ` matching "${q}"` : ''}${tier ? ` · tier ${tier}` : ''}`}
      pageActions={<AddStudentButton families={families} />}
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          {error.message}
        </div>
      )}
      <StudentListView rows={rows} q={q ?? ''} tier={tier ?? ''} withActions />
    </DashboardShell>
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
