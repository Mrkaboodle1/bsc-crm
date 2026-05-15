'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type Result = { ok: true } | { ok: false; error: string }

export async function approveAction(id: string): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from('pending_actions')
    .update({
      status: 'approved',
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending') // only approve pending; protect against double-tap

  if (error) return { ok: false, error: error.message }
  revalidatePath('/inbox')
  return { ok: true }
}

export async function rejectAction(id: string, reason: string | null): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from('pending_actions')
    .update({
      status: 'rejected',
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
      rejected_reason: reason,
    })
    .eq('id', id)
    .in('status', ['pending', 'snoozed'])

  if (error) return { ok: false, error: error.message }
  revalidatePath('/inbox')
  return { ok: true }
}

export async function editAndApproveAction(input: {
  id: string
  draftSubject: string
  draftBody: string
}): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from('pending_actions')
    .update({
      draft_subject: input.draftSubject,
      draft_body: input.draftBody,
      approved_edits: input.draftBody,
      status: 'approved',
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }
  revalidatePath('/inbox')
  return { ok: true }
}
