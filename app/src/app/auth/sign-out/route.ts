// BSC CRM — sign-out route.
// POSTed from the dashboard nav. Clears the session cookie, sends user to /login.

import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  const origin = new URL(request.url).origin
  return NextResponse.redirect(new URL('/login', origin), { status: 303 })
}
