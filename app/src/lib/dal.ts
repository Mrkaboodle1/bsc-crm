// BSC CRM — Data Access Layer
// Centralised auth + tenant verification. Every server-side data read goes
// through these helpers so we never forget a check.

import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabase } from './supabase-server'

export type BscUser = {
  id: string
  tenantId: string
  email: string
  fullName: string | null
  role: 'owner' | 'manager' | 'coach' | 'parent' | 'support'
}

/**
 * Verify the visitor has a Supabase session AND a corresponding public.users row.
 * Redirects to /login if not signed in.
 * Redirects to /awaiting-access if signed in but no users row (not yet invited).
 *
 * Memoised per render via React cache so multiple components can call it
 * without hitting Supabase multiple times.
 */
export const verifySession = cache(async (): Promise<BscUser> => {
  const supabase = await createServerSupabase()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData?.user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, tenant_id, email, full_name, role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[dal] Failed to load user profile:', profileError.message)
    redirect('/login?error=profile')
  }

  if (!profile) {
    redirect('/awaiting-access')
  }

  return {
    id: profile.id,
    tenantId: profile.tenant_id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  }
})

/** Returns the user if signed in, or null. Does not redirect. */
export const optionalSession = cache(async (): Promise<BscUser | null> => {
  const supabase = await createServerSupabase()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id, email, full_name, role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!profile) return null
  return {
    id: profile.id,
    tenantId: profile.tenant_id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  }
})
