// /compliance — Child Safe Compliance Pack hub.
// Documents grouped into 5 logical sections (Foundation, For Staff, For
// Parents, Emergency & Reporting, Forms & Templates), each rendered as a
// clean two-column list. Each row shows the doc code, title, one-line
// description, and a clear "Open" button — much easier to scan than the
// previous packed 3-column grid.

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { StaffBriefing } from '@/components/staff-briefing'
import { PayrollDocs } from '@/components/payroll-docs'
import {
  ShieldCheck, FileText, AlertTriangle, ExternalLink, Printer,
  Users, ClipboardCheck, ScrollText, Flag, ListChecks, BadgeCheck,
  Siren, Globe, BookOpen, ClipboardList, Compass, FileDown,
} from 'lucide-react'

type DocInfo = {
  number: string
  file: string
  title: string
  desc: string
  Icon: typeof FileText
}

type Section = {
  id: string
  title: string
  description: string
  Icon: typeof ShieldCheck
  audience: 'all-staff' | 'staff-only' | 'parents' | 'mixed'
  docs: DocInfo[]
}

const SECTIONS: Section[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    description: 'The big-picture child-safety framework and risk register.',
    Icon: Compass,
    audience: 'all-staff',
    docs: [
      { number: '01', file: '01_Master_Child_Safe_Framework.html',
        title: 'Master Child Safe Framework Manual',
        desc: 'The top-level document. Our commitment, the 10 QFCC standards, governance, safety culture, record keeping.',
        Icon: ShieldCheck },
      { number: '06', file: '06_Risk_Management_Plan.html',
        title: 'Risk Management Plan',
        desc: 'Full risk register: environment, rigging, supervision, online, emergencies — with residual ratings.',
        Icon: AlertTriangle },
    ],
  },
  {
    id: 'staff',
    title: 'For Staff',
    description: 'Onboarding and ongoing operations for every BSC coach, trainee, contractor and volunteer.',
    Icon: Users,
    audience: 'staff-only',
    docs: [
      { number: '02', file: '02_Staff_Handbook.html',
        title: 'Staff Handbook',
        desc: 'Welcome, values, Blue Card + First Aid rules, supervision, Star Reward system, cross-discipline skill matrix.',
        Icon: BookOpen },
      { number: '03', file: '03_Child_Safety_Policy.html',
        title: 'Child Safety Policy',
        desc: 'Zero-tolerance position, child rights, screening, mandatory reporting obligations.',
        Icon: Users },
      { number: '04', file: '04_Staff_Code_of_Conduct.html',
        title: 'Staff Code of Conduct',
        desc: 'Expected vs unacceptable behaviour, physical contact, grooming prevention, breach consequences.',
        Icon: ScrollText },
      { number: '10', file: '10_Staff_Induction_Checklist.html',
        title: 'Staff Induction Checklist',
        desc: 'Eight sections, three signatures. Must be complete before a new starter\'s first shift.',
        Icon: ListChecks },
      { number: '11', file: '11_Blue_Card_Training_Register.html',
        title: 'Blue Card & Training Register',
        desc: 'Master compliance table. Monthly Director sign-off. Live version lives in the CRM.',
        Icon: BadgeCheck },
      { number: '13', file: '13_Online_Social_Media_Safety_Policy.html',
        title: 'Online & Social Media Safety Policy',
        desc: 'Student privacy, messaging boundaries, photo consent, online classes, device usage.',
        Icon: Globe },
    ],
  },
  {
    id: 'parents',
    title: 'For Parents',
    description: 'What we hand to every new family at sign-up.',
    Icon: BookOpen,
    audience: 'parents',
    docs: [
      { number: '05', file: '05_Parent_Code_of_Conduct.html',
        title: 'Parent Code of Conduct',
        desc: 'Respect, pickup procedures, photography rules, social media expectations, raising concerns.',
        Icon: Users },
      { number: '14', file: '14_Parent_Handbook.html',
        title: 'Parent Handbook',
        desc: 'Friendly welcome guide. What to bring, Star Rewards, pricing (Play On + NDIS), child-safety reporting.',
        Icon: BookOpen },
    ],
  },
  {
    id: 'emergency',
    title: 'Emergency & Reporting',
    description: 'The procedures pinned to the studio wall.',
    Icon: Siren,
    audience: 'all-staff',
    docs: [
      { number: '09', file: '09_Reporting_Flowchart.html',
        title: 'Child Safe Reporting Flowchart',
        desc: 'Visual 7-step "if you suspect harm" flow. Emergency contacts (000, 1300 682 254, 1800 811 810).',
        Icon: Siren },
      { number: '12', file: '12_Emergency_Response_Procedures.html',
        title: 'Emergency Response Procedures',
        desc: 'Both studio exits (rear roller door + front office door). Injury, fire, missing child, lockdown, severe weather.',
        Icon: AlertTriangle },
    ],
  },
  {
    id: 'forms',
    title: 'Forms & Templates',
    description: 'Print, fill, file. Use for every incident, complaint and new activity.',
    Icon: ClipboardCheck,
    audience: 'staff-only',
    docs: [
      { number: '07', file: '07_Incident_Report_Form.html',
        title: 'Incident Report Form',
        desc: 'Printable, fillable form. Injury, near-miss, behaviour, child-safety concern.',
        Icon: ClipboardList },
      { number: '08', file: '08_Complaint_Handling_Process.html',
        title: 'Complaint Handling Process',
        desc: 'Seven-step flow. Channels, confidentiality, no retaliation, escalation hierarchy.',
        Icon: Flag },
      { number: '15', file: '15_Risk_Assessment_Templates.html',
        title: 'Risk Assessment Templates',
        desc: 'Six templates: weekly class, holiday workshop, excursion, performance, aerial, community/NDIS.',
        Icon: ClipboardCheck },
    ],
  },
]

const AUDIENCE_BADGE: Record<Section['audience'], { label: string; cls: string }> = {
  'all-staff':  { label: 'All staff',  cls: 'bg-zinc-100 text-zinc-700' },
  'staff-only': { label: 'Staff only', cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200' },
  'parents':    { label: 'Parents',    cls: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200' },
  'mixed':      { label: 'Mixed',      cls: 'bg-zinc-100 text-zinc-700' },
}

export default async function CompliancePage() {
  const user = await verifySession()

  return (
    <DashboardShell
      user={user}
      currentPath="/compliance"
      pageTitle="Child Safe Compliance"
      pageSubtitle="Fifteen documents covering the 10 QFCC Queensland Child Safe Standards."
      pageActions={
        <a
          href="/compliance/index.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors"
        >
          <ExternalLink size={14} />
          Open full index
        </a>
      }
    >
      {/* Slim summary banner */}
      <div className="bg-zinc-950 text-white rounded-xl p-5 mb-8 border border-zinc-800 flex items-center gap-5 flex-wrap">
        <div className="w-12 h-12 rounded-lg bg-[#D72027] flex items-center justify-center shrink-0">
          <ShieldCheck size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold tracking-tight">Compliance Pack v1.0</h2>
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
            QFCC-aligned. 15 documents. Audit-ready. Director &amp; Child Safety Officer:
            <strong className="text-white"> Rhett Morrow</strong>. Next review 27 May 2027.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          <span className="inline-flex items-center gap-1.5"><FileText size={12} /> 15 docs</span>
          <span className="text-zinc-700">·</span>
          <span className="inline-flex items-center gap-1.5"><Printer size={12} /> Print to PDF</span>
        </div>
      </div>

      <StaffBriefing />
      <PayrollDocs />

      <section className="mb-8">
        <h2 className="text-sm font-extrabold text-zinc-500 tracking-widest mb-3">COACH &amp; HR AGREEMENTS</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="group bg-white rounded-lg border border-zinc-200 px-4 py-3.5 hover:border-[#D72027] hover:shadow-sm transition-all flex items-start gap-3">
            <span className="w-9 h-9 rounded-md bg-red-50 text-[#D72027] flex items-center justify-center shrink-0 ring-1 ring-inset ring-red-100"><ScrollText size={16} /></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-zinc-900 leading-tight">Coach Training &amp; Commitment Agreement</div>
              <p className="text-xs text-zinc-500 mt-0.5">Training repayment (bond) + confidentiality + reasonable restraint — for coaches you train up. <strong>Have a lawyer review before use.</strong></p>
              <div className="mt-3 flex items-center gap-1.5">
                <a href="/compliance/16_Coach_Training_Agreement.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-md"><ExternalLink size={12} /> Open</a>
                <a href="/compliance/16_Coach_Training_Agreement.html?print=1" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#D72027] hover:bg-[#A0151B] text-white px-3 py-1.5 rounded-md"><Printer size={12} /> Print</a>
              </div>
            </div>
          </div>
          <div className="group bg-white rounded-lg border border-zinc-200 px-4 py-3.5 hover:border-[#D72027] hover:shadow-sm transition-all flex items-start gap-3">
            <span className="w-9 h-9 rounded-md bg-red-50 text-[#D72027] flex items-center justify-center shrink-0 ring-1 ring-inset ring-red-100"><ScrollText size={16} /></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-zinc-900 leading-tight">Non-Compete &amp; Restraint of Trade</div>
              <p className="text-xs text-zinc-500 mt-0.5">QLD cascading restraint — non-solicitation (strong) + non-compete (backup). <strong>Presumed void unless reasonable — lawyer review.</strong></p>
              <div className="mt-3 flex items-center gap-1.5">
                <a href="/compliance/17_Non_Compete_Restraint.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-md"><ExternalLink size={12} /> Open</a>
                <a href="/compliance/17_Non_Compete_Restraint.html?print=1" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#D72027] hover:bg-[#A0151B] text-white px-3 py-1.5 rounded-md"><Printer size={12} /> Print</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-extrabold text-zinc-500 tracking-widest mb-3">MEMBER FEEDBACK</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <a href="/f/membership-feedback" target="_blank" rel="noreferrer" className="group bg-white rounded-lg border border-zinc-200 px-4 py-3.5 hover:border-[#D72027] hover:shadow-sm transition-all flex items-start gap-3">
            <span className="w-9 h-9 rounded-md bg-amber-50 text-[#B45309] flex items-center justify-center shrink-0 ring-1 ring-inset ring-amber-100"><FileText size={16} /></span>
            <div><div className="text-sm font-bold text-zinc-900 leading-tight">Membership Feedback Form</div><p className="text-xs text-zinc-500 mt-0.5">Open to fill, print (Ctrl+P), or share/scan. Parents submit straight into the CRM.</p><span className="text-xs font-semibold text-[#D72027] mt-1 inline-block">Open form →</span></div>
          </a>
          <a href="/marketing/forms" className="group bg-white rounded-lg border border-zinc-200 px-4 py-3.5 hover:border-[#D72027] hover:shadow-sm transition-all flex items-start gap-3">
            <span className="w-9 h-9 rounded-md bg-amber-50 text-[#B45309] flex items-center justify-center shrink-0 ring-1 ring-inset ring-amber-100"><ExternalLink size={16} /></span>
            <div><div className="text-sm font-bold text-zinc-900 leading-tight">Edit form · Results · QR code</div><p className="text-xs text-zinc-500 mt-0.5">Marketing → Forms → Membership Feedback: edit questions, download the QR, see the live tally.</p><span className="text-xs font-semibold text-[#D72027] mt-1 inline-block">Go to Forms →</span></div>
          </a>
        </div>
      </section>

      {/* Section list */}
      <div className="space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.id}>
            <SectionHeader section={s} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {s.docs.map((d) => (
                <DocRow key={d.number} doc={d} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-10 text-xs text-zinc-500 border-t border-zinc-200 pt-4">
        Source files: <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-[11px]">my-assistant/bsc-crm/Child Safe Standards/Published/</code>
        — edit, copy to <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-[11px]">app/public/compliance/</code>, redeploy.
      </div>
    </DashboardShell>
  )
}

function SectionHeader({ section }: { section: Section }) {
  const badge = AUDIENCE_BADGE[section.audience]
  return (
    <div className="flex items-baseline justify-between gap-3 mb-3 pb-2 border-b border-zinc-200">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
          <section.Icon size={16} />
        </span>
        <div>
          <h2 className="text-base font-bold text-zinc-900">{section.title}</h2>
          <p className="text-xs text-zinc-500 leading-snug mt-0.5">{section.description}</p>
        </div>
      </div>
      <span className={`hidden sm:inline-flex shrink-0 items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.cls}`}>
        {badge.label}
      </span>
    </div>
  )
}

function DocRow({ doc }: { doc: DocInfo }) {
  const docxFile = doc.file.replace(/\.html$/, '.docx')
  return (
    <div className="group bg-white rounded-lg border border-zinc-200 px-4 py-3.5 hover:border-zinc-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <span className="w-9 h-9 rounded-md bg-red-50 text-[#D72027] flex items-center justify-center shrink-0 ring-1 ring-inset ring-red-100">
          <doc.Icon size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">
            BSC-CS-{doc.number}
          </div>
          <div className="text-sm font-semibold text-zinc-900 leading-tight">
            {doc.title}
          </div>
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-snug">{doc.desc}</p>

          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <a
              href={`/compliance/${doc.file}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-md transition-colors"
              title="Open document in a new tab"
            >
              <ExternalLink size={12} /> Open
            </a>
            <a
              href={`/compliance/${docxFile}`}
              download
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors"
              title="Download as editable Word document"
            >
              <FileDown size={12} /> Word
            </a>
            <a
              href={`/compliance/${doc.file}?print=1`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#D72027] hover:bg-[#A0151B] text-white px-3 py-1.5 rounded-md transition-colors"
              title="Open and trigger Print to PDF"
              data-print
            >
              <Printer size={12} /> Print
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
