import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { AppointmentForm } from './appointment-form'
import { createAppointment } from './actions'

export default async function NewAppointmentPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Load options for the form
  const [{ data: coaches }, { data: families }, { data: students }] = await Promise.all([
    supabase.from('coaches').select('id, full_name').eq('status', 'active').order('full_name'),
    supabase.from('families').select('id, family_name').order('family_name'),
    supabase.from('students').select('id, first_name, last_name, family_id').order('first_name'),
  ])

  return (
    <DashboardShell
      user={user}
      currentPath="/calendar"
      pageTitle="New appointment"
      pageSubtitle="Add a show, private lesson, party, meeting or personal block."
      pageActions={
        <a
          href="/calendar"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← Cancel
        </a>
      }
    >
      <AppointmentForm
        coaches={coaches ?? []}
        families={families ?? []}
        students={(students ?? []).map((s) => ({
          id: s.id,
          name: `${s.first_name}${s.last_name ? ' ' + s.last_name : ''}`,
          familyId: s.family_id,
        }))}
        action={createAppointment}
      />
    </DashboardShell>
  )
}
