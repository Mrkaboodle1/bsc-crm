// BSC CRM — Supabase SERVER-SIDE client.
// Read cookies via next/headers; safe to call from server components, route
// handlers, and server actions. Never import from a client component.

import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createServerSupabase = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server components can't set cookies; safe to ignore.
          }
        },
      },
    }
  )
}

// ────────────────────────────────────────────────────────────────────
// Service-role client — bypasses RLS. Currently unused: the /s/* public
// renderer uses the regular anon client with a public-read RLS policy
// (see schema/009c_sites_public_read.sql). Kept here as a stub for any
// future background job that needs to write across tenant boundaries —
// at which point SUPABASE_SERVICE_ROLE_KEY must be added to env.
// ────────────────────────────────────────────────────────────────────
export const createServerSupabaseAdmin = async () => {
  const { createClient } = await import('@supabase/supabase-js')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY not configured. Add it to .env.local and Vercel env to use the admin client.',
    )
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
