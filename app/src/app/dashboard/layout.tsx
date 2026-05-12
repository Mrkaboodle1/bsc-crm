import { verifySession } from '@/lib/dal'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await verifySession()

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <a href="/dashboard" className="flex items-center gap-3 hover:opacity-90">
            <span className="text-2xl">🎪</span>
            <div className="leading-tight">
              <div className="text-lg font-extrabold tracking-tight">BSC CRM</div>
              <div className="text-[10px] text-amber-100/90 uppercase tracking-widest">
                Big Star Circus
              </div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-1 text-sm font-bold">
            <NavLink href="/dashboard">Today</NavLink>
            <NavLink href="/roll-call">Roll Call</NavLink>
            <NavLink href="/students">Students</NavLink>
            <NavLink href="/families">Families</NavLink>
            <NavLink href="/classes">Classes</NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-xs font-bold">{user.fullName || user.email}</div>
              <div className="text-[10px] uppercase tracking-widest text-amber-100/80">
                {user.role}
              </div>
            </div>
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full font-bold tracking-wide transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">{children}</main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-2 rounded-lg hover:bg-white/15 transition-colors"
    >
      {children}
    </a>
  )
}
