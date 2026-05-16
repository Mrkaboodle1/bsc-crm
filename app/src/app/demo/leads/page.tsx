import { DashboardShell } from '@/components/dashboard-shell'
import { LeadsKanban, type Lead } from '@/components/leads-kanban'
import { demoUser } from '@/lib/demo-data'

// Sample data for the demo workspace. Mirrors the real Lead shape so the
// kanban renders identically.
const DEMO_LEADS: Lead[] = [
  { id: 'l1', kind: 'family', name: 'Okafor', parent: 'Chioma Okafor', email: 'chioma.okafor@example.com', phone: '0412 666 666', source: 'fb_ad',         classification: null, stage: 'new',           receivedAt: '2026-05-11', preview: 'Saw the trampoline reel, interested in aerial', tags: [], action: 'none',    href: '/families/l1' },
  { id: 'l2', kind: 'family', name: 'Patel',  parent: 'Anjali Patel',  email: 'anjali.patel@example.com',  phone: '0412 777 777', source: 'walkin',        classification: null, stage: 'new',           receivedAt: '2026-05-10', preview: null,                                              tags: ['ndis'], action: 'pending', href: '/families/l2' },
  { id: 'l3', kind: 'family', name: 'Quinn',  parent: 'Sean Quinn',    email: 'sean.quinn@example.com',    phone: '0412 888 888', source: 'instagram',     classification: null, stage: 'contacted',     receivedAt: '2026-05-09', preview: 'Replied, asked about Saturday morning availability', tags: [], action: 'sent', href: '/families/l3' },
  { id: 'l4', kind: 'family', name: 'Murphy', parent: 'Brigid Murphy', email: 'brigid.murphy@example.com', phone: '0412 444 444', source: 'instagram',     classification: null, stage: 'trial_booked',  receivedAt: '2026-05-07', preview: 'Trial Sat 17 May 9am',                            tags: [], action: 'sent',    href: '/families/l4' },
  { id: 'l5', kind: 'family', name: 'Nguyen', parent: 'Linh Nguyen',   email: 'linh.nguyen@example.com',   phone: '0412 555 555', source: 'google',        classification: null, stage: 'trial_booked',  receivedAt: '2026-05-06', preview: null,                                              tags: [], action: 'none',    href: '/families/l5' },
  { id: 'l6', kind: 'family', name: 'Sample Smith', parent: 'Pat Smith', email: null,                 phone: '0412 100 200', source: 'open_day',     classification: null, stage: 'trialled',      receivedAt: '2026-05-03', preview: 'Trialled circus fusion, follow-up call due',      tags: [], action: 'pending', href: '/families/l6' },
  { id: 'l7', kind: 'family', name: 'Sample Lin',   parent: 'Wendy Lin',  email: 'wendy@example.com', phone: null,                 source: 'word_of_mouth', classification: null, stage: 'enrolled',      receivedAt: '2026-05-01', preview: 'Enrolled in Wed homeschool, paid first 4 weeks',  tags: ['homeschool'], action: 'sent', href: '/families/l7' },
  { id: 'l8', kind: 'family', name: 'Sample Cole',  parent: 'Maya Cole',  email: 'maya@example.com',  phone: null,                 source: 'fb_ad',         classification: null, stage: 'lost',          receivedAt: '2026-04-28', preview: 'Decided on dance instead — keep on warm list',    tags: [], action: 'none',    href: '/families/l8' },
]

export default function DemoLeadsPage() {
  return (
    <DashboardShell
      user={demoUser}
      currentPath="/leads"
      pageTitle="Leads"
      pageSubtitle={`${DEMO_LEADS.length} sample leads. (Demo mode)`}
    >
      <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-3 text-sm text-amber-900">
        <strong>Demo mode</strong> — sample pipeline. Drag-and-drop between columns comes in Slice 5.
      </div>
      <LeadsKanban leads={DEMO_LEADS} />
    </DashboardShell>
  )
}
