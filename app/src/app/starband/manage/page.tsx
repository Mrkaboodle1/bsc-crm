import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { StarbandAdmin, type SBStudent, type Band, type SBSettings } from '@/components/starband-admin'

export const dynamic = 'force-dynamic'

export default async function StarbandManagePage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const baseCols = 'id, first_name, last_name, photo_url, pin_code, allergies, medical_notes, authorised_pickup'
  // Try with the newer support-needs columns; fall back if migration 017 not applied yet.
  let studentsRaw: Record<string, unknown>[] | null = null
  const first = await supabase.from('students').select(`${baseCols}, support_needs, support_strategy`).eq('tenant_id', user.tenantId).order('first_name').limit(2000)
  let error = first.error
  if (first.error && first.error.message.includes('support_')) {
    const fb = await supabase.from('students').select(baseCols).eq('tenant_id', user.tenantId).order('first_name').limit(2000)
    studentsRaw = fb.data; error = fb.error
  } else {
    studentsRaw = first.data
  }

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

  const students: SBStudent[] = (studentsRaw ?? []).map((s) => {
    const r = s as Record<string, string | null> & { id: string; first_name: string; last_name: string | null }
    return {
      id: r.id,
      name: `${r.first_name}${r.last_name ? ' ' + r.last_name : ''}`,
      photo_url: r.photo_url, pin_code: r.pin_code, allergies: r.allergies,
      medical_notes: r.medical_notes, authorised_pickup: r.authorised_pickup,
      support_needs: r.support_needs ?? null, support_strategy: r.support_strategy ?? null,
      bands: byStudent.get(r.id) ?? [],
    }
  })

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
