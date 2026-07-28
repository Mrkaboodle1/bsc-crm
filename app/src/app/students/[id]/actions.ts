'use server'

// Edit / delete a student from their profile page. Owner + manager only for
// delete; edit is allowed for staff. Uses the admin client so writes aren't
// blocked by RLS (same pattern as the roll-call actions).

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

type Ok = { ok: true }
type Err = { ok: false; error: string }

export async function updateStudent(input: {
  id: string
  firstName: string
  lastName: string | null
  dob: string | null
  medical: string | null
}): Promise<Ok | Err> {
  const user = await verifySession()
  if (!input.firstName?.trim()) return { ok: false, error: 'First name is required' }
  const admin = await createServerSupabaseAdmin()
  const { error } = await admin
    .from('students')
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName?.trim() || null,
      date_of_birth: input.dob || null,
      medical_notes: input.medical?.trim() || null,
    })
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/students/${input.id}`)
  revalidatePath('/students')
  return { ok: true }
}

// Reassign a student to a different family (fix mis-filed / junk records).
export async function reassignStudentFamily(input: { id: string; familyId: string }): Promise<Ok | Err> {
  const user = await verifySession()
  const admin = await createServerSupabaseAdmin()
  const { error } = await admin
    .from('students')
    .update({ family_id: input.familyId })
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/students/${input.id}`)
  return { ok: true }
}

export async function searchFamiliesForStudent(input: { query: string }): Promise<
  { ok: true; results: Array<{ id: string; name: string; parent: string | null; email: string | null }> } | Err
> {
  const user = await verifySession()
  const q = input.query.trim()
  if (q.length < 2) return { ok: true, results: [] }
  const admin = await createServerSupabaseAdmin()
  const { data, error } = await admin
    .from('families')
    .select('id, family_name, primary_parent, email')
    .eq('tenant_id', user.tenantId)
    .or(`family_name.ilike.%${q}%,primary_parent.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(12)
  if (error) return { ok: false, error: error.message }
  return { ok: true, results: (data ?? []).map((f) => ({ id: f.id, name: f.family_name, parent: f.primary_parent, email: f.email })) }
}

export async function deleteStudent(input: { id: string }): Promise<Ok | Err> {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) {
    return { ok: false, error: 'Only an owner or manager can delete a student' }
  }
  const admin = await createServerSupabaseAdmin()
  // Deleting cascades to enrolments/attendance/stars for this record (schema §7-9).
  const { error } = await admin.from('students').delete().eq('id', input.id).eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/students')
  return { ok: true }
}
