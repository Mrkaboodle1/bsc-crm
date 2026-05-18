'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type Result = { ok: true; id?: string } | { ok: false; error: string }

// Form-action variant: redirects to /contacts/companies/<id> on success
// (React form actions return void). On error we redirect back to the form
// with ?error= query param so the user can see what went wrong.
export async function createCompany(formData: FormData): Promise<void> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) redirect('/contacts/companies/new?error=' + encodeURIComponent('Name is required'))
  const category = String(formData.get('category') ?? '').trim() || null
  const payload = {
    tenant_id: user.tenantId,
    name,
    category,
    email: String(formData.get('email') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    website: String(formData.get('website') ?? '').trim() || null,
    address: String(formData.get('address') ?? '').trim() || null,
    city: String(formData.get('city') ?? '').trim() || null,
    state: String(formData.get('state') ?? '').trim() || null,
    postal_code: String(formData.get('postal_code') ?? '').trim() || null,
    description: String(formData.get('description') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  }
  const { data, error } = await supabase.from('companies').insert(payload).select('id').single()
  if (error) {
    const msg = error.message.includes('does not exist') || error.message.includes('relation')
      ? 'Apply migration 008 first.'
      : error.message
    redirect('/contacts/companies/new?error=' + encodeURIComponent(msg))
  }
  revalidatePath('/contacts/companies')
  redirect(`/contacts/companies/${data!.id}`)
}

export async function updateCompany(input: { id: string; patch: Record<string, string | null> }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('companies')
    .update(input.patch)
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/contacts/companies/${input.id}`)
  return { ok: true }
}

export async function deleteCompany(input: { id: string }): Promise<Result> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/contacts/companies')
  return { ok: true }
}
