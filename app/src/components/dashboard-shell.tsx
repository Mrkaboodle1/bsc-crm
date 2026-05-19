// BSC CRM — Dashboard shell: dark left sidebar (Tectonic-style) + light main area.
// Sidebar is server-rendered so we can highlight the active route via the
// `currentPath` prop and stay accessible without JS.

import type { ReactNode } from 'react'
import type { BscUser } from '@/lib/dal'
import { MusicPlayer } from './music-player'
import { JackyTourMount } from './jacky-tour-mount'

type NavItem = {
  href: string
  label: string
  icon: string
  badge?: string
  // sections used for grouping; first section is unlabeled top section
  section?: 'main' | 'growth' | 'admin'
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: '🏠', section: 'main' },
  { href: '/jacky', label: 'Ask Jacky', icon: '🎪', section: 'main' },
  { href: '/inbox', label: 'Inbox', icon: '✉️', section: 'main' },
  { href: '/roll-call', label: 'Roll Call', icon: '📋', section: 'main' },
  { href: '/conversations', label: 'Conversations', icon: '💬', badge: 'Soon', section: 'main' },
  { href: '/calendar', label: 'Calendar', icon: '📅', badge: 'Soon', section: 'main' },
  { href: '/contacts', label: 'Contacts', icon: '👤', section: 'main' },
  { href: '/students', label: 'Students', icon: '🧒', section: 'main' },
  { href: '/classes', label: 'Classes', icon: '🎪', section: 'main' },
  { href: '/stars', label: 'Star Ledger', icon: '⭐', badge: 'Soon', section: 'main' },

  { href: '/leads', label: 'Leads', icon: '🎯', section: 'growth' },
  { href: '/sites', label: 'Sites', icon: '🪧', section: 'growth' },
  { href: '/media', label: 'Media', icon: '🖼️', section: 'growth' },
  { href: '/bookings', label: 'Bookings', icon: '🎉', badge: 'Soon', section: 'growth' },
  { href: '/marketing', label: 'Marketing', icon: '📣', badge: 'Soon', section: 'growth' },
  { href: '/payments', label: 'Payments', icon: '💳', badge: 'Soon', section: 'growth' },
  { href: '/reporting', label: 'Reporting', icon: '📈', badge: 'Soon', section: 'growth' },

  { href: '/coaches', label: 'Coaches', icon: '🤝', badge: 'Soon', section: 'admin' },
  { href: '/training', label: 'Training', icon: '🎓', section: 'admin' },
  { href: '/settings', label: 'Settings', icon: '⚙️', badge: 'Soon', section: 'admin' },
]

export function DashboardShell({
  user,
  currentPath,
  pageTitle,
  pageSubtitle,
  pageActions,
  children,
}: {
  user: BscUser
  currentPath: string
  pageTitle: string
  pageSubtitle?: string
  pageActions?: ReactNode
  children: ReactNode
}) {
  const mainNav = NAV.filter((n) => n.section === 'main')
  const growthNav = NAV.filter((n) => n.section === 'growth')
  const adminNav = NAV.filter((n) => n.section === 'admin')

  return (
    <div className="min-h-screen bg-zinc-100 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 bg-zinc-900 text-zinc-300 flex-col fixed inset-y-0 left-0 z-30">
        {/* Brand mark — Big Star Circus logo */}
        <div className="px-4 py-5 border-b border-zinc-800 flex flex-col items-center text-center">
          <a href="/dashboard" className="block hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bigstar-logo.png"
              alt="Big Star Circus"
              className="w-32 h-32 object-contain drop-shadow-[0_0_8px_rgba(215,32,39,0.35)]"
            />
          </a>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            CRM v0.1
          </div>
        </div>

        {/* Tenant pill */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/70 rounded-lg">
            <span className="w-7 h-7 rounded-md bg-[#FFC107] text-zinc-900 flex items-center justify-center text-xs font-extrabold">
              BSC
            </span>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-xs font-bold text-white truncate">Big Star Circus</div>
              <div className="text-[10px] text-zinc-400 truncate">Molendinar QLD</div>
            </div>
          </div>
        </div>

        {/* Search (placeholder — wires up in later slice) */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 bg-zinc-800/70 rounded-lg px-3 py-2 text-xs text-zinc-500">
            <span>🔍</span>
            <span>Search…</span>
            <span className="ml-auto text-[10px] bg-zinc-700 px-1.5 py-0.5 rounded font-mono">⌘K</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <NavGroup items={mainNav} currentPath={currentPath} />
          <NavGroup label="Growth" items={growthNav} currentPath={currentPath} />
          <NavGroup label="Admin" items={adminNav} currentPath={currentPath} />
        </nav>

        {/* User card / sign out */}
        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-center gap-2 px-2 py-2">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-xs font-extrabold">
              {initials(user.fullName, user.email)}
            </span>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-xs font-bold text-white truncate">
                {user.fullName || user.email.split('@')[0]}
              </div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{user.role}</div>
            </div>
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                title="Sign out"
                className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-zinc-800"
              >
                ⏏
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar (sidebar collapses below lg) */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-zinc-900 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <a href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bigstar-logo.png" alt="Big Star Circus" className="w-8 h-8 object-contain" />
            <span className="font-extrabold text-sm">BSC CRM</span>
          </a>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="text-xs bg-white/15 px-3 py-1.5 rounded-full font-bold"
            >
              Sign out
            </button>
          </form>
        </div>
        <MobileNavBar currentPath={currentPath} />
      </header>

      {/* Main area */}
      <div className="flex-1 lg:pl-60 pt-[110px] lg:pt-0 min-w-0">
        {/* Page header */}
        <div className="bg-white border-b border-zinc-200">
          <div className="px-4 sm:px-8 py-5 sm:py-6 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-sm text-zinc-500 mt-1">{pageSubtitle}</p>
              )}
            </div>
            {pageActions && <div className="flex items-center gap-2">{pageActions}</div>}
          </div>
        </div>

        {/* Page body */}
        <div className="px-4 sm:px-8 py-6 sm:py-8">{children}</div>
      </div>

      {/* Floating studio music player — clean, ad-free, always on top */}
      <MusicPlayer />

      {/* Floating "tour mode" widget — mounts only when ?tour=<moduleId> */}
      <JackyTourMount />
    </div>
  )
}

function NavGroup({
  label,
  items,
  currentPath,
}: {
  label?: string
  items: NavItem[]
  currentPath: string
}) {
  return (
    <div>
      {label && (
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 px-3 mb-2">
          {label}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active =
            item.href === '/dashboard'
              ? currentPath === '/dashboard'
              : currentPath === item.href || currentPath.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                  active
                    ? 'bg-[#D72027] text-white shadow-md'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-extrabold ${
                      active ? 'bg-white/25 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MobileNavBar({ currentPath }: { currentPath: string }) {
  // Compact horizontal scroller for the most-used routes.
  const mobileItems = NAV.filter((n) => n.section === 'main').slice(0, 6)
  return (
    <nav className="overflow-x-auto border-t border-zinc-800">
      <ul className="flex gap-1 px-3 py-2 min-w-max">
        {mobileItems.map((item) => {
          const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                  active ? 'bg-[#D72027] text-white' : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function initials(fullName: string | null, email: string) {
  const source = fullName || email
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?'
}
