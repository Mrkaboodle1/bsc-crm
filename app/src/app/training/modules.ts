// Training & Support module content. Each module has a title, an emoji,
// the URL path of the feature it explains (for "Try it now" links), an
// AI-image prompt for the cover art, and the narrated-style script that
// Jacky reads aloud (via the browser's built-in speech synthesis).

export type TrainingModule = {
  id: string
  number: number
  emoji: string
  title: string
  subtitle: string
  tryItPath: string | null
  /** prompt for the AI-generated cover image (Pollinations.ai via /api/ai-image) */
  imagePrompt: string
  /** the narrated-style walkthrough — Jacky reads this when you tap 🔊 */
  script: string
  /** bullet-point summary you can read at a glance */
  bullets: string[]
}

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'welcome',
    number: 1,
    emoji: '👋',
    title: 'Welcome to the Big Star Circus CRM',
    subtitle: 'Meet Jacky — your AI admin partner.',
    tryItPath: '/dashboard',
    imagePrompt: 'a friendly circus mascot character wearing a red top hat with a yellow star on it, smiling, cartoon illustration, bright warm colours, family friendly, against a soft cream background',
    script: `Welcome to the Big Star Circus CRM. I'm Jacky, your AI admin partner. I work twenty-four hours a day on the server, reading your admin email, drafting replies, and pushing them to an approval queue. You're always in charge. Nothing goes out without your tap. This training takes about fifteen minutes. By the end, you'll know how to use every part of the system. Take your time. There's no rush.`,
    bullets: [
      'Jacky runs 24/7 — reads admin@ inbox every 15 minutes',
      'Drafts emails + SMS, but YOU approve every send',
      'All data is yours and lives in your private database',
      'Built specifically for Big Star Circus — no generic tools',
    ],
  },
  {
    id: 'dashboard',
    number: 2,
    emoji: '🏠',
    title: 'The Dashboard — your daily starting point',
    subtitle: 'Open this first thing every morning.',
    tryItPath: '/dashboard',
    imagePrompt: 'a flat illustration of a sunny morning at a circus school, coffee mug on a desk next to a laptop showing a dashboard, friendly warm style, red and yellow accent colours, family friendly',
    script: `Open the dashboard each morning. The top five tiles show what matters: pending approvals waiting for your tap, families, students, active classes, and open leads. If the red number on Pending Approval is more than zero, that's where you start. Below the tiles you'll see today's classes — tap any to take attendance. On the right you'll see Jacky Today, which shows how many emails I read overnight, how many drafts I queued, and what it cost in AI spend. Usually a few cents.`,
    bullets: [
      'Pending approvals tile = your most important number',
      "Today's classes shown at a glance",
      'Jacky Today card = overnight activity + AI cost',
      'Recent leads = high-intent emails Jacky classified',
    ],
  },
  {
    id: 'roll-call',
    number: 3,
    emoji: '📋',
    title: 'Roll Call on iPad — mark attendance',
    subtitle: 'The Excel-style sheet your coaches use during class.',
    tryItPath: '/roll-call',
    imagePrompt: 'an iPad propped up at a circus studio with kids in the background doing acrobatics, the screen showing a colourful class register, red and yellow brand colours, photorealistic, warm afternoon light',
    script: `Roll call lives at slash roll-call. The grid shows your whole week in the Big Star colour scheme — morning at the top, afternoon at the bottom, days running left to right. Today is highlighted in red. Tap any class to open it. Each student gets a row. Tap a week cell to cycle: blank, here with a tick, late with a clock, absent with a cross. Hit Mark All Here Today if everyone showed. Tap the info bubble on a student to see their parent details, payment status, and birthday. Tap the star to award a star for a milestone or great behaviour.`,
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
    id: 'contacts',
    number: 4,
    emoji: '👤',
    title: 'Contacts — every family, lead, and parent',
    subtitle: 'Search, tag, segment, communicate.',
    tryItPath: '/contacts',
    imagePrompt: 'a friendly illustration of a Rolodex card file overflowing with colourful contact cards, each card showing a parent and child silhouette, family friendly cartoon style, warm cream and red palette',
    script: `Contacts is where every family, lead, and parent lives. There are roughly seventeen hundred in here right now — pulled in from Stripe customers, Tectonic exports, and inbound emails. Use the search bar to find anyone in seconds. Use the filter pills for lifecycle, source, or tag. Smart Lists are saved searches you can pin as tabs along the top — try Add Smart List to save your current filter under a name like Friday Aerial parents. Click any contact to open their detail page.`,
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
    id: 'inbox',
    number: 5,
    emoji: '✉️',
    title: 'The Inbox — where drafts wait for your approval',
    subtitle: 'Jacky drafts. You approve. She sends.',
    tryItPath: '/inbox',
    imagePrompt: 'a stylised inbox tray on a wooden desk overflowing with letters tied with red ribbons, warm afternoon light, illustration style, cosy and welcoming',
    script: `The inbox at slash inbox holds every draft Jacky has prepared. Each card shows who it's to, why she drafted it, and what she wants to say. You have three options. Tap the green tick to approve — it sends within sixty seconds via Resend for email or ClickSend for SMS. Tap the pencil to edit the text first, then approve. Tap the red cross to reject — Jacky stops chasing that one. The most important thing to know: nothing ever sends without you. Even when you're asleep, the drafts pile up here, safe.`,
    bullets: [
      'Every draft is one tap from sending',
      'Approve · Edit & Approve · Reject',
      'Approved emails fly via Resend in ≤60 sec',
      'Approved SMS goes via ClickSend',
      'DND-flagged contacts are automatically skipped',
    ],
  },
  {
    id: 'bulk-send',
    number: 6,
    emoji: '📨',
    title: 'Bulk Send — message many at once',
    subtitle: 'Term reminders, payment chases, news.',
    tryItPath: '/marketing/bulk-send',
    imagePrompt: 'an illustration of dozens of paper aeroplanes flying out of a laptop screen towards multiple house silhouettes, red and yellow tones, cheerful and hopeful',
    script: `Bulk send is at slash marketing slash bulk-send. Pick the channel — email or SMS. Filter the recipient list by lifecycle, tag, search. Write your message once. The system swaps in each parent's first name and family name where you put curly braces around them. Hit Create Drafts and every message lands in the inbox as a pending action — one per family. You can approve them individually or use the inbox's batch approval. No surprise auto-sends.`,
    bullets: [
      'Filter by lifecycle, tag, channel reachability',
      'Personalisation tokens: {first_name} and {family_name}',
      'Cost estimate shown before you commit',
      'Drafts go to /inbox — approve one or many',
    ],
  },
  {
    id: 'jacky-chat',
    number: 7,
    emoji: '🎪',
    title: 'Ask Jacky — natural-language CRM control',
    subtitle: 'Talk to your CRM like a friend who happens to run a circus.',
    tryItPath: '/jacky',
    imagePrompt: 'a circus performer holding a magical glowing chat bubble that contains tools and tickets, whimsical illustration, family friendly, warm BSC red and gold palette',
    script: `Ask Jacky is at slash jacky. It's a chat with me where I can actually do things. Ask me to draft a follow-up to a specific family. Ask me who's not subscribed yet. Ask me to look up Alannah Bodman. Ask me to send a Saturday class reminder. I'll use real tools — read your families, queue drafts, update lifecycle stages — and I'll tell you exactly what I did. There's a microphone button too. Tap it, speak naturally. I'll listen and respond.`,
    bullets: [
      'Natural language commands',
      'Voice input via mic button (Chrome/Edge/Safari)',
      'I use real tools — reads + writes your data',
      'Every action shows up in a 🔧 expander for transparency',
      'Drafts still go to /inbox for your approval',
    ],
  },
  {
    id: 'tasks',
    number: 8,
    emoji: '✅',
    title: 'Tasks — never forget a follow-up',
    subtitle: 'To-do list, attached to families.',
    tryItPath: '/contacts/tasks',
    imagePrompt: 'a clipboard with cheerful coloured checkboxes ticking themselves off, sunlight streaming over the desk, productive cosy vibe, BSC red and yellow palette',
    script: `Tasks live at slash contacts slash tasks. Add a task with a title, due date, and priority. Tasks can be linked to a specific contact so you can chase them from their family page. Filter by Open, Due Today, Overdue, Upcoming, or Done. Tap the checkbox to mark complete. Use this for everything: pay chasing, call-backs, follow-ups after a trial.`,
    bullets: [
      'Quick add with due date + priority',
      'Filters: Open · Due Today · 🔥 Overdue · Upcoming · Done',
      'Attached to a family — chase from their profile',
      'Strikethrough + dim when done',
    ],
  },
  {
    id: 'companies',
    number: 9,
    emoji: '🏢',
    title: 'Companies — B2B contacts',
    subtitle: 'Schools, NDIS providers, suppliers, venues, partners.',
    tryItPath: '/contacts/companies',
    imagePrompt: 'a row of cheerful office buildings each labelled with a category — school, clinic, supplier — connected by red ribbons to a central circus tent, illustration style',
    script: `Companies at slash contacts slash companies is for everyone in your business network who isn't a parent. Schools you run incursions at. NDIS plan managers who pay invoices. Suppliers for rigging or props. Venue partners. Each company has a detail page that shows which contact families are linked to it. You can categorise them as school, NDIS provider, supplier, partner, venue, or other.`,
    bullets: [
      'Schools, NDIS providers, suppliers, partners, venues',
      'Linked-contact panel shows families tied to a company',
      'Full address + website + notes',
    ],
  },
  {
    id: 'reports',
    number: 10,
    emoji: '📊',
    title: 'Reports — see what is working',
    subtitle: 'Roll-vs-billing, bulk-action audit log, attribution.',
    tryItPath: '/contacts/bulk-actions',
    imagePrompt: 'a hand-drawn dashboard with friendly pie charts and bar graphs showing growth, red and yellow circus colours, sunny office desk, illustration',
    script: `Reports live in two places. Slash contacts slash bulk-actions shows the campaign audit log — every bulk send, who got it, what was sent, what was pending. It also lists Jacky's daily activity: emails read, drafts queued, AI spend in dollars. The dashboard's Jacky Today card shows the same numbers for the current day. There's also a roll-versus-billing report in the research folder that pairs every kid on the roll with their family's payment status — find the kids whose families haven't subscribed yet.`,
    bullets: [
      'Bulk Actions log = every campaign you ran',
      "Jacky's daily activity (cost-controlled)",
      'Roll vs Billing report = your unsubscribed conversion list',
    ],
  },
  {
    id: 'tips',
    number: 11,
    emoji: '💡',
    title: 'Pro tips + the music player',
    subtitle: 'Small touches that make the day flow.',
    tryItPath: null,
    imagePrompt: 'a vintage radio glowing warmly on a circus dressing room shelf, surrounded by feather boas and rosin chalk, soft warm lighting, illustration',
    script: `A few small tips that make the day easier. The floating Music button bottom-right plays clean curated radio — KIDZ BOP hits, indie pop, ambient — all family-safe. Tap it during warm-ups. The voice mic in Ask Jacky lets you talk to your CRM hands-free. The audit log captures everything we did — useful when you need to remember what was sent two weeks ago. And remember: no decision is permanent. Every send waits for your tap. Every contact you delete asks you to confirm. Take your time, and trust the system. Welcome to the team.`,
    bullets: [
      'Music player: 7 clean stations, $0/month',
      'Voice input in Ask Jacky chat',
      'Audit logs everywhere — undo confidence',
      'Mobile-friendly — works on phone, iPad, laptop',
      "When in doubt, ask Jacky — that's literally what she's for",
    ],
  },
]
