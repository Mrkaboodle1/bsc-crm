// BSC CRM — Proxy (formerly middleware in Next 15 and earlier).
// Runs on every request. Two jobs:
//   1. Refresh the Supabase auth cookie so server components have a fresh session.
//   2. Bounce unauthenticated visitors trying to hit /dashboard etc. to /login.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED_PREFIXES = ['/dashboard', '/students', '/families', '/classes', '/roll-call', '/settings']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Touch the user so the cookie is refreshed before downstream renders.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))

  if (needsAuth && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except Next internals, image optimisation, and static files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
