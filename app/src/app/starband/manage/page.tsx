import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { StarbandAdmin, type SBStudent, type Band, type SBSettings } from '@/components/starband-admin'

export const dynamic = 'force-dynamic'

export default async function StarbandManagePage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data: studentsRaw, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, photo_url, pin_code, allergies, medical_notes, authorised_pickup')
    .eq('tenant_id', user.tenantId)
    .order('first_name')
    .limit(2000)

  const needsSetup = !!error && (error.message.includes('does not exist') || error.message.includes('schema cache'))

  let tags: { id: string; student_id: string; nfc_uid: string; kind: string; label: string | null }[] = []
  let settings: SBSettings = {}
  if (!needsSetup) {
    const [{ data: t }, { data: tenant }] = await Promise.all([
      supabase.from('nfc_tags').select('id, student_id, nfc_uid, kind, label').eq('tenant_id', user.tenantId).eq('is_active', true),
      supabase.from('tenants').select('settings').eq('id', user.tenantId).maybeSingle(),
    ])
    tags = t ?? []
    settings = (((tenant?.settings ?? {}) as Record<string, unknown>).starband ?? {}) as SBSettings
  }

  const byStudent = new Map<string, Band[]>()
  for (const t of tags) {
    const arr = byStudent.get(t.student_id) ?? []
    arr.push({ id: t.id, nfc_uid: t.nfc_uid, kind: t.kind, label: t.label })
    byStudent.set(t.student_id, arr)
  }

  const students: SBStudent[] = (studentsRaw ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name}${s.last_name ? ' ' + s.last_name : ''}`,
    photo_url: s.photo_url, pin_code: s.pin_code, allergies: s.allergies,
    medical_notes: s.medical_notes, authorised_pickup: s.authorised_pickup,
    bands: byStudent.get(s.id) ?? [],
  }))

  return (
    <DashboardShell user={user} currentPath="/starband/manage" pageTitle="StarBand" pageSubtitle="Manage wristbands, PINs, photos, medical info & pickup — and your check-in settings.">
      {needsSetup ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-5 py-4 text-sm max-w-2xl">
          <strong>One quick database step to switch this on.</strong> Ask Jacky to finish the StarBand admin setup (a single paste) — then you&apos;ll manage every child&apos;s band, PIN, photo, allergies and authorised pickup right here.
        </div>
      ) : (
        <StarbandAdmin students={students} settings={settings} />
      )}
    </DashboardShell>
  )
}
