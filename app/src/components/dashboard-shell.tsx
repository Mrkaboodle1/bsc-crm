// BSC CRM — Dashboard shell. Dark slate sidebar + light content area.
// Server-rendered so the active route can be highlighted without JS.
//
// Icons via lucide-react (clean monoline stroked icons — same family used by
// Linear / Vercel / Stripe dashboards). Replaces the previous emoji icons
// that read as amateur in a B2B-resold product.

import type { ReactNode, ComponentType } from 'react'
import type { BscUser } from '@/lib/dal'
import { MusicPlayer } from './music-player'
import { JackyTourMount } from './jacky-tour-mount'
import {
  LayoutDashboard,
  Sparkles,
  Inbox,
  ClipboardList,
  MessagesSquare,
  CalendarDays,
  Users,
  Baby,
  Tent,
  Star,
  Target,
  LayoutPanelTop,
  ImageIcon,
  Megaphone,
  CreditCard,
  TrendingUp,
  Handshake,
  GraduationCap,
  Settings,
  LogOut,
  Search,
  PartyPopper,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  Icon: LucideIcon
  badge?: string
  section?: 'main' | 'growth' | 'admin'
}

const NAV: NavItem[] = [
  { href: '/dashboard',     label: 'Today',          Icon: LayoutDashboard, section: 'main' },
  { href: '/jacky',         label: 'Ask Jacky',      Icon: Sparkles,        section: 'main' },
  { href: '/inbox',         label: 'Inbox',          Icon: Inbox,           section: 'main' },
  { href: '/roll-call',     label: 'Roll Call',      Icon: ClipboardList,   section: 'main' },
  { href: '/conversations', label: 'Conversations',  Icon: MessagesSquare,  badge: 'Soon', section: 'main' },
  { href: '/calendar',      label: 'Calendar',       Icon: CalendarDays,    badge: 'Soon', section: 'main' },
  { href: '/contacts',      label: 'Contacts',       Icon: Users,           section: 'main' },
  { href: '/students',      label: 'Students',       Icon: Baby,            section: 'main' },
  { href: '/classes',       label: 'Classes',        Icon: Tent,            section: 'main' },
  { href: '/stars',         label: 'Star Ledger',    Icon: Star,            badge: 'Soon', section: 'main' },

  { href: '/leads',         label: 'Leads',          Icon: Target,          section: 'growth' },
  { href: '/sites',         label: 'Sites',          Icon: LayoutPanelTop,  section: 'growth' },
  { href: '/media',         label: 'Media',          Icon: ImageIcon,       section: 'growth' },
  { href: '/marketing',     label: 'Marketing',      Icon: Megaphone,       section: 'growth' },
  { href: '/bookings',      label: 'Bookings',       Icon: PartyPopper,     badge: 'Soon', section: 'growth' },
  { href: '/payments',      label: 'Payments',       Icon: CreditCard,      badge: 'Soon', section: 'growth' },
  { href: '/reporting',     label: 'Reporting',      Icon: TrendingUp,      badge: 'Soon', section: 'growth' },

  { href: '/coaches',       label: 'Coaches',        Icon: Handshake,       badge: 'Soon', section: 'admin' },
  { href: '/training',      label: 'Training',       Icon: GraduationCap,   section: 'admin' },
  { href: '/settings',      label: 'Settings',       Icon: Settings,        badge: 'Soon', section: 'admin' },
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
  const mainNav   = NAV.filter((n) => n.section === 'main')
  const growthNav = NAV.filter((n) => n.section === 'growth')
  const adminNav  = NAV.filter((n) => n.section === 'admin')

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 bg-zinc-950 text-zinc-300 flex-col fixed inset-y-0 left-0 z-30 border-r border-zinc-900">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-zinc-900 flex items-center gap-3">
          <a href="/dashboard" className="flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bigstar-logo.png"
              alt="Big Star Circus"
              className="w-9 h-9 rounded-lg object-contain bg-white/5 p-1 ring-1 ring-white/10 group-hover:ring-white/30 transition-shadow"
            />
            <div>
              <div className="text-sm font-bold text-white tracking-tight leading-tight">Big Star</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Circus CRM</div>
            </div>
          </a>
        </div>

        {/* Tenant pill */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2.5 px-2.5 py-2 bg-zinc-900 rounded-lg ring-1 ring-zinc-800">
            <span className="w-7 h-7 rounded-md bg-[#FFC107] text-zinc-950 flex items-center justify-center text-[10px] font-extrabold">
              BSC
            </span>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-xs font-semibold text-white truncate">Big Star Circus</div>
              <div className="text-[10px] text-zinc-500 truncate">Molendinar QLD</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 bg-zinc-900 ring-1 ring-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-500">
            <Search size={14} />
            <span className="flex-1">Search…</span>
            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400">⌘K</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <NavGroup items={mainNav}   currentPath={currentPath} />
          <NavGroup items={growthNav} currentPath={currentPath} label="Growth" />
          <NavGroup items={adminNav}  currentPath={currentPath} label="Admin"  />
        </nav>

        {/* User */}
        <div className="border-t border-zinc-900 p-3">
          <div className="flex items-center gap-2 px-1 py-1.5">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-[11px] font-bold">
              {initials(user.fullName, user.email)}
            </span>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-xs font-semibold text-white truncate">
                {user.fullName || user.email.split('@')[0]}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{user.role}</div>
            </div>
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                title="Sign out"
                className="text-zinc-500 hover:text-white p-1.5 rounded hover:bg-zinc-800"
              >
                <LogOut size={14} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-zinc-950 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <a href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bigstar-logo.png" alt="Big Star Circus" className="w-7 h-7 object-contain" />
            <span className="font-bold text-sm">Big Star CRM</span>
          </a>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md font-semibold"
            >
              Sign out
            </button>
          </form>
        </div>
        <MobileNavBar currentPath={currentPath} />
      </header>

      {/* Main area */}
      <div className="flex-1 lg:pl-60 pt-[100px] lg:pt-0 min-w-0">
        <div className="bg-white border-b border-zinc-200">
          <div className="px-5 sm:px-8 py-5 sm:py-6 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-zinc-900 tracking-tight leading-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-sm text-zinc-500 mt-1">{pageSubtitle}</p>
              )}
            </div>
            {pageActions && <div className="flex items-center gap-2">{pageActions}</div>}
          </div>
        </div>

        <div className="px-5 sm:px-8 py-6 sm:py-8">{children}</div>
      </div>

      <MusicPlayer />
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
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-3 mb-2">
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
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#D72027] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <item.Icon size={16} strokeWidth={active ? 2.5 : 2} aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${
                      active ? 'bg-white/25 text-white' : 'bg-zinc-900 text-zinc-500'
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
  const mobileItems = NAV.filter((n) => n.section === 'main').slice(0, 6)
  return (
    <nav className="overflow-x-auto border-t border-zinc-900">
      <ul className="flex gap-1 px-3 py-2 min-w-max">
        {mobileItems.map((item) => {
          const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`)
          const Icon = item.Icon as ComponentType<{ size?: number }>
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                  active ? 'bg-[#D72027] text-white' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                <Icon size={14} />
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
