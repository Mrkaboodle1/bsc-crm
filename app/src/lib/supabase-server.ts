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
// Service-role client — bypasses RLS. Use ONLY for routes where the
// caller is provably unauthenticated (e.g. public /s/* pages that only
// read `is_published = true` rows) or for trusted server-side jobs.
// Never expose the resulting data without filtering on a published flag.
// ────────────────────────────────────────────────────────────────────
export const createServerSupabaseAdmin = async () => {
  // Lazy import keeps the service-role import path off the client bundle.
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}
