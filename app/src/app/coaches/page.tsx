import { verifySession } from '@/lib/dal'
import { createServerSupabase, createServerSupabaseAdmin } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CoachesClient, type Coach, type ClassLite } from '@/components/coaches-client'

export const dynamic = 'force-dynamic'

export default async function CoachesPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const baseCols = 'id, full_name, email, phone, role, employment_type, pay_rate, skills, blue_card_number, blue_card_expiry, first_aid_expiry, ga_accreditation, status'
  let coachRows: Coach[] | null = null
  const first = await supabase.from('coaches').select(`${baseCols}, abn, tfn_held, super_paid, pay_note`).order('role').order('full_name')
  let error = first.error
  if (first.error && /abn|tfn_held|super_paid|pay_note/.test(first.error.message)) {
    const fb = await supabase.from('coaches').select(baseCols).order('role').order('full_name')
    coachRows = (fb.data as Coach[] | null); error = fb.error
  } else {
    coachRows = (first.data as Coach[] | null)
  }

  const { data: classRows } = await supabase
    .from('classes')
    .select('id, name, day_of_week, start_time, primary_coach_id')
    .eq('status', 'active')
    .order('day_of_week').order('start_time')
    .returns<ClassLite[]>()

  // Which coach emails already have a login (public.users row).
  let loginEmails: string[] = []
  try {
    const admin = await createServerSupabaseAdmin()
    const { data: us } = await admin.from('users').select('email').eq('tenant_id', user.tenantId)
    loginEmails = (us ?? []).map((u) => (u.email || '').toLowerCase()).filter(Boolean)
  } catch { /* ignore */ }

  const coaches = (coachRows ?? []).filter((c) => c.status !== 'departed')
  const canManage = ['owner', 'manager'].includes(user.role)

  return (
    <DashboardShell user={user} currentPath="/coaches" pageTitle="Coaches" pageSubtitle={`${coaches.length} active coaches`}>
      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">{error.message}</div>}
      <CoachesClient coaches={coaches} classes={classRows ?? []} loginEmails={loginEmails} canManage={canManage} />
    </DashboardShell>
  )
}
