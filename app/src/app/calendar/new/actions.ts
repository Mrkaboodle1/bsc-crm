'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

const VALID_TYPES = new Set([
  'show', 'private_lesson', 'workshop', 'birthday_party',
  'kno', 'meeting', 'personal', 'holiday_programme', 'other',
])

export type CreateAppointmentResult =
  | { ok: true }
  | { ok: false; error: string }

export async function createAppointment(formData: FormData): Promise<CreateAppointmentResult> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const title = String(formData.get('title') ?? '').trim()
  const type = String(formData.get('type') ?? 'other')
  const start = String(formData.get('start_at') ?? '')
  const end = String(formData.get('end_at') ?? '')
  const location = (String(formData.get('location') ?? '').trim() || null)
  const notes = (String(formData.get('notes') ?? '').trim() || null)
  const coachId = String(formData.get('assigned_coach_id') ?? '') || null
  const familyId = String(formData.get('related_family_id') ?? '') || null
  const studentId = String(formData.get('related_student_id') ?? '') || null
  const alertRaw = String(formData.get('alert_minutes_before') ?? '')
  const feeRaw = String(formData.get('fee') ?? '')

  if (!title) return { ok: false, error: 'Title is required' }
  if (!VALID_TYPES.has(type)) return { ok: false, error: 'Invalid type' }
  if (!start || !end) return { ok: false, error: 'Start and end times are required' }

  const startAt = new Date(start)
  const endAt = new Date(end)
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return { ok: false, error: 'Invalid date/time' }
  }
  if (endAt.getTime() < startAt.getTime()) {
    return { ok: false, error: 'End must be after start' }
  }

  const alertMinutes = alertRaw ? parseInt(alertRaw, 10) : null
  const fee = feeRaw ? parseFloat(feeRaw) : null

  const { error } = await supabase.from('appointments').insert({
    tenant_id: user.tenantId,
    title,
    type,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    location,
    notes,
    assigned_coach_id: coachId,
    related_family_id: familyId,
    related_student_id: studentId,
    alert_minutes_before: alertMinutes,
    fee,
    paid: false,
    status: 'scheduled',
    created_by_user_id: user.id,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  redirect('/calendar')
}
