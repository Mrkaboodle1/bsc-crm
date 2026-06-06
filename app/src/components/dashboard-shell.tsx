// BSC CRM — Dashboard shell (Stage 1 professional rebuild).
// Pattern: left sidebar = DEPARTMENTS, top of content = that department's
// SUB-TABS, then the page. Eyes go left → top → straight ahead (Tectonic-style).
// Clean corporate styling, BSC red/yellow kept only as the brand accent, lucide
// line icons, no emojis. Coaches keep their locked-down Roll-Call-only view.

import type { ReactNode, ComponentType } from 'react'
import { redirect } from 'next/navigation'
import type { BscUser } from '@/lib/dal'
import { MusicPlayer } from './music-player'
import { JackyTourMount } from './jacky-tour-mount'
import { GlobalSearch } from './global-search'
import {
  LayoutDashboard, Users, GraduationCap, Trophy, TrendingUp, CreditCard,
  Handshake, Inbox, Settings, LogOut, Search, ClipboardList, ShieldCheck,
  Gamepad2, BookOpenCheck, MessagesSquare, type LucideIcon,
} from 'lucide-react'

type SubItem = { label: string; href: string }
type Department = { key: string; label: string; Icon: LucideIcon; items: SubItem[]; admin?: boolean }

const DEPARTMENTS: Department[] = [
  { key: 'home', label: 'Home', Icon: LayoutDashboard, items: [{ label: 'Dashboard', href: '/dashboard' }] },
  { key: 'people', label: 'Contacts', Icon: Users, items: [
    { label: 'Contacts', href: '/contacts' }, { label: 'Families', href: '/families' },
    { label: 'Students', href: '/students' }, { label: 'Companies', href: '/contacts/companies' },
  ] },
  { key: 'classes', label: 'Classes', Icon: GraduationCap, items: [
    { label: 'Classes', href: '/classes' }, { label: 'Roll Call', href: '/roll-call' }, { label: 'Calendar', href: '/calendar' },
  ] },
  { key: 'rewards', label: 'Rewards', Icon: Trophy, items: [
    { label: 'Star Rewards', href: '/star-rewards' }, { label: 'Star Ledger', href: '/stars' }, { label: 'StarBand', href: '/starband' },
  ] },
  { key: 'growth', label: 'Growth', Icon: TrendingUp, items: [
    { label: 'Leads', href: '/leads' }, { label: 'Marketing', href: '/marketing/social' }, { label: 'Website', href: '/sites' },
  ] },
  { key: 'finance', label: 'Finance', Icon: CreditCard, items: [{ label: 'Payments', href: '/payments' }] },
  { key: 'team', label: 'Team', Icon: Handshake, items: [
    { label: 'Staff', href: '/coaches' }, { label: 'Credentials', href: '/credentials' }, { label: 'Training', href: '/training' },
  ] },
  { key: 'inbox', label: 'Inbox', Icon: Inbox, items: [
    { label: 'Inbox', href: '/inbox' }, { label: 'Conversations', href: '/conversations' },
  ] },
  { key: 'admin', label: 'Admin', Icon: Settings, admin: true, items: [
    { label: 'Settings', href: '/settings' }, { label: 'Compliance', href: '/compliance' }, { label: 'Reporting', href: '/reporting' },
  ] },
]

// Coaches: locked to these routes; flat sidebar, no departments/sub-tabs.
const COACH_NAV: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: 'Roll Call', href: '/roll-call', Icon: ClipboardList },
  { label: 'My Credentials', href: '/credentials', Icon: ShieldCheck },
  { label: 'Games', href: '/games', Icon: Gamepad2 },
  { label: 'Protocols', href: '/protocols', Icon: BookOpenCheck },
]
const COACH_PATHS = COACH_NAV.map((n) => n.href)
const seg = (p: string) => '/' + (p.split('/')[1] || '')

export function DashboardShell({ user, currentPath, pageTitle, pageSubtitle, pageActions, children }: {
  user: BscUser; currentPath: string; pageTitle: string; pageSubtitle?: string; pageActions?: ReactNode; children: ReactNode
}) {
  const isCoach = user.role === 'coach'
  const coachAllowed = COACH_PATHS.some((p) => currentPath === p || currentPath.startsWith(`${p}/`))
  if (isCoach && !coachAllowed) redirect('/roll-call')
  const homeHref = isCoach ? '/roll-call' : '/dashboard'

  // Work out the active department + sub-tab from the URL.
  const allItems = DEPARTMENTS.flatMap((d) => d.items.map((it) => ({ ...it, dept: d.key })))
  const active =
    allItems.find((it) => currentPath === it.href) ||
    allItems.find((it) => currentPath.startsWith(it.href + '/')) ||
    allItems.find((it) => seg(it.href) === seg(currentPath))
  const activeDept = DEPARTMENTS.find((d) => d.key === active?.dept) || DEPARTMENTS[0]!
  const subTabs = activeDept.items

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-56 bg-zinc-950 text-zinc-300 flex-col fixed inset-y-0 left-0 z-30 border-r border-zinc-900">
        <div className="px-4 py-4 border-b border-zinc-900">
          <a href={homeHref} className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bigstar-logo.png" alt="Big Star Circus" className="w-8 h-8 rounded-md object-contain bg-white/5 p-1 ring-1 ring-white/10" />
            <div>
              <div className="text-sm font-bold text-white tracking-tight leading-tight">Big Star</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">HQ</div>
            </div>
          </a>
        </div>

        <div className="px-3 pt-3"><GlobalSearch /></div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
          {isCoach ? (
            COACH_NAV.map((it) => <SideLink key={it.href} href={it.href} label={it.label} Icon={it.Icon} active={currentPath === it.href || currentPath.startsWith(it.href + '/')} />)
          ) : (
            <>
              {DEPARTMENTS.filter((d) => !d.admin).map((d) => (
                <SideLink key={d.key} href={d.items[0]!.href} label={d.label} Icon={d.Icon} active={activeDept.key === d.key} />
              ))}
              <div className="pt-2 mt-2 border-t border-zinc-900">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-2.5 mb-1">Admin</div>
                {DEPARTMENTS.filter((d) => d.admin).map((d) => (
                  <SideLink key={d.key} href={d.items[0]!.href} label={d.label} Icon={d.Icon} active={activeDept.key === d.key} />
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="border-t border-zinc-900 p-3">
          <div className="flex items-center gap-2 px-1 py-1">
            <span className="w-8 h-8 rounded-full bg-[#D72027] text-white flex items-center justify-center text-[11px] font-bold">{initials(user.fullName, user.email)}</span>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-xs font-semibold text-white truncate">{user.fullName || user.email.split('@')[0]}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{user.role}</div>
            </div>
            <form action="/auth/sign-out" method="post">
              <button type="submit" title="Sign out" className="text-zinc-500 hover:text-white p-1.5 rounded hover:bg-zinc-800"><LogOut size={14} /></button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-zinc-950 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <a href={homeHref} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bigstar-logo.png" alt="Big Star Circus" className="w-7 h-7 object-contain" />
            <span className="font-bold text-sm">Big Star HQ</span>
          </a>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md font-semibold">Sign out</button>
          </form>
        </div>
        <MobileNavBar currentPath={currentPath} isCoach={isCoach} activeDeptKey={activeDept.key} />
      </header>

      {/* Main area */}
      <div className="flex-1 lg:pl-56 pt-[96px] lg:pt-0 min-w-0">
        <div className="bg-white border-b border-zinc-200">
          {!isCoach && (
            <div className="px-5 sm:px-8 pt-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-0.5 overflow-x-auto">
                {subTabs.length > 1 && subTabs.map((it) => {
                  const on = active?.href === it.href
                  return (
                    <a key={it.href} href={it.href} className={`px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${on ? 'border-[#D72027] text-[#D72027]' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>{it.label}</a>
                  )
                })}
              </div>
              <a
                href="/conversations"
                title="Chat — replies from Facebook, Instagram & email in one place"
                className="shrink-0 mb-1.5 inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-3.5 py-1.5 rounded-lg shadow-sm"
              >
                <MessagesSquare size={15} /> Chat
              </a>
            </div>
          )}
          <div className="px-5 sm:px-8 py-5 sm:py-6 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-[26px] font-bold text-zinc-900 tracking-tight leading-tight">{pageTitle}</h1>
              {pageSubtitle && <p className="text-sm text-zinc-500 mt-1">{pageSubtitle}</p>}
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

function SideLink({ href, label, Icon, active }: { href: string; label: string; Icon: LucideIcon; active: boolean }) {
  return (
    <a href={href} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#D72027] text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
      <Icon size={17} strokeWidth={active ? 2.4 : 2} aria-hidden />
      <span className="flex-1 truncate">{label}</span>
    </a>
  )
}

function MobileNavBar({ currentPath, isCoach, activeDeptKey }: { currentPath: string; isCoach?: boolean; activeDeptKey?: string }) {
  const items = isCoach
    ? COACH_NAV.map((c) => ({ label: c.label, href: c.href, Icon: c.Icon }))
    : DEPARTMENTS.filter((d) => !d.admin).map((d) => ({ label: d.label, href: d.items[0]!.href, Icon: d.Icon }))
  return (
    <nav className="overflow-x-auto border-t border-zinc-900">
      <ul className="flex gap-1 px-3 py-2 min-w-max">
        {items.map((item) => {
          const Icon = item.Icon as ComponentType<{ size?: number }>
          const on = isCoach ? (currentPath === item.href || currentPath.startsWith(item.href + '/')) : (DEPARTMENTS.find((d) => d.key === activeDeptKey)?.items[0]?.href === item.href)
          return (
            <li key={item.href}>
              <a href={item.href} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${on ? 'bg-[#D72027] text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                <Icon size={14} /><span>{item.label}</span>
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
  return source.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?'
}
