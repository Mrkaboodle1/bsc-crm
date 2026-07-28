'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type Result = { ok: true; id?: string } | { ok: false; error: string }

export async function createTask(input: {
  title: string
  description?: string
  due_at?: string | null  // ISO date or datetime
  priority?: 'urgent' | 'high' | 'normal' | 'low'
  related_family_id?: string | null
  related_student_id?: string | null
}): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Title required' }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      tenant_id: user.tenantId,
      title,
      description: input.description?.trim() || null,
      due_at: input.due_at || null,
      priority: input.priority ?? 'normal',
      status: 'open',
      related_family_id: input.related_family_id ?? null,
      related_student_id: input.related_student_id ?? null,
      created_by_user_id: user.id,
      assigned_to_user_id: user.id, // default-assign to self
    })
    .select('id')
    .single()
  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('relation')) {
      return { ok: false, error: 'tasks table missing — apply schema/008 in Supabase.' }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/contacts/tasks')
  if (input.related_family_id) revalidatePath(`/contacts/${input.related_family_id}`)
  return { ok: true, id: data!.id }
}

export async function setTaskStatus(input: { id: string; status: 'open' | 'in_progress' | 'done' | 'cancelled' }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const patch: Record<string, unknown> = { status: input.status, updated_at: new Date().toISOString() }
  if (input.status === 'done') {
    patch.completed_at = new Date().toISOString()
    patch.completed_by_user_id = user.id
  } else if (input.status === 'open' || input.status === 'in_progress') {
    patch.completed_at = null
    patch.completed_by_user_id = null
  }
  const { error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/contacts/tasks')
  return { ok: true }
}

export async function updateTask(input: {
  id: string
  title?: string
  due_at?: string | null
  priority?: 'urgent' | 'high' | 'normal' | 'low'
}): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.title !== undefined) {
    const t = input.title.trim()
    if (!t) return { ok: false, error: 'Title required' }
    patch.title = t
  }
  if (input.due_at !== undefined) patch.due_at = input.due_at || null
  if (input.priority !== undefined) patch.priority = input.priority
  const { error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/contacts/tasks')
  return { ok: true }
}

export async function deleteTask(input: { id: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/contacts/tasks')
  return { ok: true }
}
