// BSC CRM — Data Access Layer
// Centralised auth + tenant verification. Every server-side data read goes
// through these helpers so we never forget a check.

import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabase } from './supabase-server'

export type TenantBranding = {
  name: string
  slug: string | null
  logoUrl: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  abn: string | null
  primaryColour: string
  accentColour: string
  tagline: string | null
  mission: string | null
  location: string | null
  ownerName: string | null
  socials: { facebook?: string; instagram?: string; youtube?: string; tiktok?: string }
}

export type BscUser = {
  id: string
  tenantId: string
  email: string
  fullName: string | null
  role: 'owner' | 'manager' | 'coach' | 'parent' | 'support'
  tenant?: TenantBranding
}

type SettingsProfile = { tagline?: string; mission?: string; headerLocation?: string; ownerName?: string; socials?: TenantBranding['socials'] }

/** Cached per render — the tenant's branding/profile used across the app chrome. */
export const getTenantBranding = cache(async (tenantId: string): Promise<TenantBranding> => {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('tenants')
    .select('name, slug, logo_url, phone, email, website, address, abn, primary_colour, accent_colour, settings')
    .eq('id', tenantId)
    .maybeSingle()
  const settings = (data?.settings ?? {}) as { profile?: SettingsProfile }
  const profile = settings.profile ?? {}
  return {
    name: data?.name ?? 'Your Business',
    slug: data?.slug ?? null,
    logoUrl: data?.logo_url ?? null,
    phone: data?.phone ?? null,
    email: data?.email ?? null,
    website: data?.website ?? null,
    address: data?.address ?? null,
    abn: data?.abn ?? null,
    primaryColour: data?.primary_colour ?? '#D72027',
    accentColour: data?.accent_colour ?? '#FFC107',
    tagline: profile.tagline ?? null,
    mission: profile.mission ?? null,
    location: profile.headerLocation ?? null,
    ownerName: profile.ownerName ?? null,
    socials: profile.socials ?? {},
  }
})

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

  const tenant = await getTenantBranding(profile.tenant_id)
  return {
    id: profile.id,
    tenantId: profile.tenant_id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    tenant,
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
