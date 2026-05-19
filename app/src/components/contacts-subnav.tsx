// Shared sub-nav for the Contacts module — Tectonic-style horizontal tabs
// at the top of every /contacts/* page.

const TABS = [
  { href: '/contacts',               label: 'Smart Lists' },
  { href: '/contacts/bulk-actions',  label: 'Bulk Actions' },
  { href: '/contacts/tasks',         label: 'Tasks' },
  { href: '/contacts/companies',     label: 'Companies' },
] as const

export function ContactsSubnav({ active }: { active: typeof TABS[number]['href'] }) {
  return (
    <div className="border-b border-zinc-200 mb-5 -mt-2">
      <nav className="flex items-center gap-1">
        {TABS.map((tab) => {
          const isActive = active === tab.href
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-[#D72027] text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </a>
          )
        })}
      </nav>
    </div>
  )
}
