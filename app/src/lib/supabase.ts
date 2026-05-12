// BSC CRM — Supabase BROWSER client only.
// Server-side helpers live in ./supabase-server.ts so client bundles don't
// pull in next/headers (which the App Router forbids in client components).

import { createBrowserClient } from '@supabase/ssr'

export const createBrowserSupabase = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
