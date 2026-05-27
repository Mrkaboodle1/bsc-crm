// /compliance — Child Safe Compliance Pack hub.
// Lists every BSC-CS-XX document with one-click View and Print-to-PDF buttons.
// The actual HTML documents live in app/public/compliance/ and are linked
// to from here. Print to PDF works in every modern browser via the OS dialog.

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { ShieldCheck, FileText, AlertTriangle, ExternalLink, Printer, Users, Sparkles, ClipboardCheck, ScrollText, Flag, ListChecks, BadgeCheck, Siren, Globe, BookOpen, ClipboardList } from 'lucide-react'

type DocInfo = {
  id: string
  number: string
  file: string
  title: string
  description: string
  audience: 'all-staff' | 'staff-only' | 'parents' | 'public'
  Icon: typeof FileText
}

const DOCS: DocInfo[] = [
  { id: 'master',       number: '01', file: '01_Master_Child_Safe_Framework.html',     title: 'Master Child Safe Framework Manual',  description: 'Top-level framework. 10 QFCC standards, governance, safety culture, record keeping.',              audience: 'all-staff', Icon: ShieldCheck },
  { id: 'staff-handbook', number: '02', file: '02_Staff_Handbook.html',                title: 'Staff Handbook',                       description: 'Welcome, values, Blue Card + First Aid requirements, supervision, Star Reward system, cross-discipline skill matrix.', audience: 'staff-only', Icon: BookOpen },
  { id: 'child-safety', number: '03', file: '03_Child_Safety_Policy.html',             title: 'Child Safety Policy',                  description: 'Zero-tolerance position, child rights, inclusion, screening, mandatory reporting.',                     audience: 'all-staff', Icon: Users },
  { id: 'staff-code',   number: '04', file: '04_Staff_Code_of_Conduct.html',           title: 'Staff Code of Conduct',                description: 'Expected vs unacceptable behaviour, physical contact rules, grooming prevention, photography.',          audience: 'staff-only', Icon: ScrollText },
  { id: 'parent-code',  number: '05', file: '05_Parent_Code_of_Conduct.html',          title: 'Parent Code of Conduct',               description: 'Respect, pickup, photography, social media, raising concerns.',                                          audience: 'parents',   Icon: Users },
  { id: 'risk-mgmt',    number: '06', file: '06_Risk_Management_Plan.html',            title: 'Risk Management Plan',                 description: 'Full risk register: environment, rigging, supervision, online, emergencies.',                            audience: 'all-staff', Icon: AlertTriangle },
  { id: 'incident',     number: '07', file: '07_Incident_Report_Form.html',            title: 'Incident Report Form',                 description: 'Printable form. Injury, near-miss, behaviour, child-safety concerns.',                                   audience: 'staff-only', Icon: ClipboardList },
  { id: 'complaints',   number: '08', file: '08_Complaint_Handling_Process.html',      title: 'Complaint Handling Process',           description: '7-step flow. Channels, confidentiality, no retaliation, escalation hierarchy.',                          audience: 'all-staff', Icon: Flag },
  { id: 'flowchart',    number: '09', file: '09_Reporting_Flowchart.html',             title: 'Child Safe Reporting Flowchart',       description: 'Visual flow. Pin on studio wall. Emergency contacts (000, 1300 682 254, 1800 811 810).',                 audience: 'all-staff', Icon: Siren },
  { id: 'induction',    number: '10', file: '10_Staff_Induction_Checklist.html',       title: 'Staff Induction Checklist',            description: '8 sections. ID, clearances, policies, walkthrough, emergencies, child safety, skill matrix, CRM.',         audience: 'staff-only', Icon: ListChecks },
  { id: 'register',     number: '11', file: '11_Blue_Card_Training_Register.html',     title: 'Blue Card & Training Register',        description: 'Master compliance table. Monthly Director sign-off.',                                                    audience: 'staff-only', Icon: BadgeCheck },
  { id: 'emergency',    number: '12', file: '12_Emergency_Response_Procedures.html',   title: 'Emergency Response Procedures',        description: 'Exits, injury, fire, missing child, medical, lockdown, severe weather, drill record.',                   audience: 'all-staff', Icon: Siren },
  { id: 'online',       number: '13', file: '13_Online_Social_Media_Safety_Policy.html', title: 'Online & Social Media Safety Policy', description: 'Student privacy, messaging, photo consent, online classes, devices.',                                   audience: 'all-staff', Icon: Globe },
  { id: 'parent-handbook', number: '14', file: '14_Parent_Handbook.html',              title: 'Parent Handbook',                      description: 'Welcome doc for new families. What to bring, pickup, Star Rewards, pricing, child-safety reporting.',     audience: 'parents',   Icon: BookOpen },
  { id: 'risk-templates', number: '15', file: '15_Risk_Assessment_Templates.html',     title: 'Risk Assessment Templates',            description: 'Six templates: class, holiday workshop, excursion, performance, aerial, community/NDIS.',                audience: 'staff-only', Icon: ClipboardCheck },
]

const AUDIENCE_LABEL: Record<DocInfo['audience'], { label: string; cls: string }> = {
  'all-staff':  { label: 'All staff',   cls: 'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200' },
  'staff-only': { label: 'Staff only',  cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200' },
  'parents':    { label: 'For parents', cls: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200' },
  'public':     { label: 'Public',      cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' },
}

export default async function CompliancePage() {
  const user = await verifySession()

  return (
    <DashboardShell
      user={user}
      currentPath="/compliance"
      pageTitle="Child Safe Compliance"
      pageSubtitle="The full BigStar Circus QFCC-aligned compliance pack."
      pageActions={
        <a
          href="/compliance/index.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors"
        >
          <ExternalLink size={14} />
          Open print index
        </a>
      }
    >
      {/* Hero summary */}
      <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 text-white rounded-2xl p-6 mb-6 border border-zinc-800 flex items-start gap-5">
        <div className="w-14 h-14 rounded-xl bg-[#D72027] flex items-center justify-center shrink-0">
          <ShieldCheck size={28} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold tracking-tight">Child Safe Compliance Pack &mdash; Version 1.0</h2>
          <p className="text-sm text-zinc-300 mt-1 leading-relaxed">
            Fifteen aligned documents covering the 10 QFCC Queensland Child Safe Standards. Aligned to{' '}
            <a href="https://www.qfcc.qld.gov.au/childsafe/standards/what-are-child-safe-standards" target="_blank" rel="noreferrer" className="text-amber-300 underline hover:text-amber-200">
              qfcc.qld.gov.au/childsafe/standards
            </a>. Director &amp; Child Safety Officer: Rhett Morrow. Next review 27 May 2027.
          </p>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <Pill icon={<FileText size={12} />} text="15 documents" />
            <Pill icon={<BadgeCheck size={12} />} text="QFCC-aligned" />
            <Pill icon={<Printer size={12} />} text="Print-ready PDF" />
            <Pill icon={<Sparkles size={12} />} text="Audit-ready" />
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-zinc-900">Documents</h3>
        <p className="text-xs text-zinc-500">Click any tile to open. In the open document, use <strong>File &rarr; Print &rarr; Save as PDF</strong> for a print-ready copy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DOCS.map((d) => {
          const audience = AUDIENCE_LABEL[d.audience]
          return (
            <a
              key={d.id}
              href={`/compliance/${d.file}`}
              target="_blank"
              rel="noreferrer"
              className="group bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 ring-1 ring-inset ring-red-100 text-[#D72027] flex items-center justify-center group-hover:bg-[#D72027] group-hover:text-white transition-colors">
                  <d.Icon size={18} />
                </div>
                <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${audience.cls}`}>
                  {audience.label}
                </span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#B71C1C] mb-1">BSC-CS-{d.number}</div>
              <div className="font-bold text-zinc-900 text-base leading-snug mb-1.5 group-hover:text-[#D72027] transition-colors">
                {d.title}
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed flex-1">
                {d.description}
              </p>
              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-500 inline-flex items-center gap-1">
                  <ExternalLink size={12} /> Open
                </span>
                <span className="font-semibold text-zinc-400 inline-flex items-center gap-1">
                  <Printer size={12} /> Print to PDF
                </span>
              </div>
            </a>
          )
        })}
      </div>

      <div className="mt-8 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 text-sm text-amber-900">
        <strong>Source files.</strong> Editable HTML masters live in <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[11px]">my-assistant/bsc-crm/Child Safe Standards/Published/</code>. After editing the source, copy them into <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[11px]">app/public/compliance/</code> and redeploy &mdash; the CRM serves the latest version every time.
      </div>

    </DashboardShell>
  )
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider bg-white/10 ring-1 ring-inset ring-white/20 text-amber-300 px-2.5 py-1 rounded-full">
      {icon}
      {text}
    </span>
  )
}
