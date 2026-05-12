// BSC CRM — magic-link return handler.
// Supabase Auth sends the user back here with ?code=... in the URL. We exchange
// it for a session cookie, then redirect to the dashboard.

import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin))
  }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchange failed:', error.message)
    return NextResponse.redirect(new URL('/login?error=exchange_failed', url.origin))
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
