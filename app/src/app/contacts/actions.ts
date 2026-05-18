'use server'

// Server actions for the /contacts list — Smart List CRUD lives here.

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type Result = { ok: true; id?: string } | { ok: false; error: string }

export async function createSmartList(input: {
  name: string
  criteria: Record<string, unknown>
}): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Name is required' }

  // Compute next sort_order (append to end)
  const { count } = await supabase
    .from('smart_lists')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId)

  const { data, error } = await supabase
    .from('smart_lists')
    .insert({
      tenant_id: user.tenantId,
      name,
      criteria: input.criteria,
      sort_order: (count ?? 0) + 1,
      is_pinned: false,
      created_by_user_id: user.id,
    })
    .select('id')
    .single()
  if (error) {
    const msg = error.message
    if (msg.includes('does not exist') || msg.includes('relation')) {
      return { ok: false, error: 'smart_lists table missing — apply schema/008 in Supabase.' }
    }
    return { ok: false, error: msg }
  }
  revalidatePath('/contacts')
  return { ok: true, id: data!.id }
}

export async function deleteSmartList(input: { id: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('smart_lists')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/contacts')
  return { ok: true }
}
