import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { LessonPlansClient, type StudentLite } from '@/components/lesson-plans-client'
import { TraineeLessonPlan } from '@/components/coaching-hub'

export const dynamic = 'force-dynamic'

export default async function LessonPlansPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const user = await verifySession()
  const { student: initialStudentId } = await searchParams
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('students').select('id, first_name, last_name').eq('tenant_id', user.tenantId).order('first_name').limit(1000)
  const students: StudentLite[] = (data ?? []).map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name ?? ''}`.trim() }))

  return (
    <DashboardShell
      user={user}
      currentPath="/coach-portal/lessons"
      pageTitle="📝 Lesson Plans"
      pageSubtitle="Private-lesson plans & progress — write it up, download it, send it to the parent"
      pageActions={<a href="/coach-portal" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50">← Coach Events</a>}
    >
      <div className="max-w-3xl space-y-5">
        {/* Trainees look for their lesson-plan sheet here before they look in
            the Coach Academy — so it lives in both places. */}
        <TraineeLessonPlan />
        <LessonPlansClient students={students} initialStudentId={initialStudentId} />
      </div>
    </DashboardShell>
  )
}
