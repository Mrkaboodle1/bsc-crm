// Module data for the Remotion compositions.
// Kept in sync with app/src/app/training/modules.ts by hand — re-paste when
// scripts/bullets change, then re-render with `npm run render`.

export type TrainingModule = {
  id: string
  number: number
  emoji: string
  title: string
  subtitle: string
  bullets: string[]
}

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'welcome', number: 1, emoji: '👋',
    title: 'Welcome to the Big Star Circus CRM',
    subtitle: 'Meet Jacky — your AI admin partner.',
    bullets: [
      'Jacky runs 24/7 — reads admin@ inbox every 15 minutes',
      'Drafts emails + SMS, but YOU approve every send',
      'All data is yours and lives in your private database',
      'Built specifically for Big Star Circus — no generic tools',
    ],
  },
  {
    id: 'dashboard', number: 2, emoji: '🏠',
    title: 'The Dashboard — your daily starting point',
    subtitle: 'Open this first thing every morning.',
    bullets: [
      'Pending approvals tile = your most important number',
      "Today's classes shown at a glance",
      'Jacky Today card = overnight activity + AI cost',
      'Recent leads = high-intent emails Jacky classified',
    ],
  },
  {
    id: 'roll-call', number: 3, emoji: '📋',
    title: 'Roll Call on iPad — mark attendance',
    subtitle: 'The Excel-style sheet your coaches use during class.',
    bullets: [
      'Week 1 to Week 10 columns with real dates',
      'Tap a cell to cycle: blank → ✓ here → ⏰ late → ✕ absent',
      'Mark All Here button = one tap for the whole class',
      'Info button shows parent + payment status',
      'Star button awards stars for milestones',
      'Year + term tabs let you view any historic class',
    ],
  },
  {
    id: 'contacts', number: 4, emoji: '👤',
    title: 'Contacts — every family, lead, and parent',
    subtitle: 'Search, tag, segment, communicate.',
    bullets: [
      '1700+ contacts already imported',
      'Tag picker with + Create on the fly',
      'Smart Lists save your common filters as tabs',
      'Click a contact for full profile + composer + DND',
      'Internal notes = admin-only, never sent',
      'Delete contact (with type-to-confirm safety)',
    ],
  },
  {
    id: 'inbox', number: 5, emoji: '✉️',
    title: 'The Inbox — where drafts wait for your approval',
    subtitle: 'Jacky drafts. You approve. She sends.',
    bullets: [
      'Every draft is one tap from sending',
      'Approve · Edit & Approve · Reject',
      'Approved emails fly via Resend in ≤60 sec',
      'Approved SMS goes via ClickSend',
      'DND-flagged contacts are automatically skipped',
    ],
  },
  {
    id: 'bulk-send', number: 6, emoji: '📨',
    title: 'Bulk Send — message many at once',
    subtitle: 'Term reminders, payment chases, news.',
    bullets: [
      'Filter by lifecycle, tag, channel reachability',
      'Personalisation tokens: {first_name} and {family_name}',
      'Cost estimate shown before you commit',
      'Drafts go to /inbox — approve one or many',
    ],
  },
  {
    id: 'jacky-chat', number: 7, emoji: '🎪',
    title: 'Ask Jacky — natural-language CRM control',
    subtitle: 'Talk to your CRM like a friend who happens to run a circus.',
    bullets: [
      'Natural language commands',
      'Voice input via mic button (Chrome/Edge/Safari)',
      'I use real tools — reads + writes your data',
      'Every action shows up in a 🔧 expander for transparency',
      'Drafts still go to /inbox for your approval',
    ],
  },
  {
    id: 'tasks', number: 8, emoji: '✅',
    title: 'Tasks — never forget a follow-up',
    subtitle: 'To-do list, attached to families.',
    bullets: [
      'Quick add with due date + priority',
      'Filters: Open · Due Today · 🔥 Overdue · Upcoming · Done',
      'Attached to a family — chase from their profile',
      'Strikethrough + dim when done',
    ],
  },
  {
    id: 'companies', number: 9, emoji: '🏢',
    title: 'Companies — B2B contacts',
    subtitle: 'Schools, NDIS providers, suppliers, venues, partners.',
    bullets: [
      'Schools, NDIS providers, suppliers, partners, venues',
      'Linked-contact panel shows families tied to a company',
      'Full address + website + notes',
    ],
  },
  {
    id: 'reports', number: 10, emoji: '📊',
    title: 'Reports — see what is working',
    subtitle: 'Roll-vs-billing, bulk-action audit log, attribution.',
    bullets: [
      'Bulk Actions log = every campaign you ran',
      "Jacky's daily activity (cost-controlled)",
      'Roll vs Billing report = your unsubscribed conversion list',
    ],
  },
  {
    id: 'tips', number: 11, emoji: '💡',
    title: 'Pro tips + the music player',
    subtitle: 'Small touches that make the day flow.',
    bullets: [
      'Music player: 7 clean stations, $0/month',
      'Voice input in Ask Jacky chat',
      'Audit logs everywhere — undo confidence',
      'Mobile-friendly — works on phone, iPad, laptop',
      "When in doubt, ask Jacky — that's literally what she's for",
    ],
  },
]
