// BSC CRM — Supabase client helpers
// Two clients: browser (for client components) and server (for server components / API routes)

import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createBrowserSupabase = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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
            // Server components can't set cookies; safe to ignore
          }
        },
      },
    }
  )
}
