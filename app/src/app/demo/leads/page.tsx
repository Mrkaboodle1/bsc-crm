import { DashboardShell } from '@/components/dashboard-shell'
import { LeadsKanban, type Lead } from '@/components/leads-kanban'
import { demoUser } from '@/lib/demo-data'

const DEMO_LEADS: Lead[] = [
  { id: 'l1', name: 'Okafor', parent: 'Chioma Okafor', email: 'chioma.okafor@example.com', phone: '0412 666 666', source: 'fb_ad', stage: 'new', createdAt: '2026-05-11', notes: 'Saw the trampoline reel, interested in aerial', tags: [] },
  { id: 'l2', name: 'Patel',  parent: 'Anjali Patel',  email: 'anjali.patel@example.com',  phone: '0412 777 777', source: 'walkin', stage: 'new', createdAt: '2026-05-10', notes: null, tags: ['ndis'] },
  { id: 'l3', name: 'Quinn',  parent: 'Sean Quinn',    email: 'sean.quinn@example.com',    phone: '0412 888 888', source: 'instagram', stage: 'contacted', createdAt: '2026-05-09', notes: 'Replied, asked about Saturday morning availability', tags: [] },
  { id: 'l4', name: 'Murphy', parent: 'Brigid Murphy', email: 'brigid.murphy@example.com', phone: '0412 444 444', source: 'instagram', stage: 'trial_booked', createdAt: '2026-05-07', notes: 'Trial Sat 17 May 9am', tags: [] },
  { id: 'l5', name: 'Nguyen', parent: 'Linh Nguyen',   email: 'linh.nguyen@example.com',   phone: '0412 555 555', source: 'google', stage: 'trial_booked', createdAt: '2026-05-06', notes: null, tags: [] },
  { id: 'l6', name: 'Sample Smith', parent: 'Pat Smith', email: null, phone: '0412 100 200', source: 'open_day', stage: 'trialled', createdAt: '2026-05-03', notes: 'Trialled circus fusion, follow-up call due', tags: [] },
  { id: 'l7', name: 'Sample Lin',   parent: 'Wendy Lin',  email: 'wendy@example.com', phone: null, source: 'word_of_mouth', stage: 'enrolled', createdAt: '2026-05-01', notes: 'Enrolled in Wed homeschool, paid first 4 weeks', tags: ['homeschool'] },
  { id: 'l8', name: 'Sample Cole',  parent: 'Maya Cole',  email: 'maya@example.com',  phone: null, source: 'fb_ad', stage: 'lost', createdAt: '2026-04-28', notes: 'Decided on dance instead — keep on warm list', tags: [] },
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
