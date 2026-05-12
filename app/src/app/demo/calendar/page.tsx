import { DashboardShell } from '@/components/dashboard-shell'
import { CalendarView } from '@/components/calendar-view'
import { demoUser } from '@/lib/demo-data'
import type { CalendarItem } from '@/lib/calendar'

// Force dynamic so the demo times are computed at request time (not build time)
// — otherwise everyone sees the same "starts in 45 min" baked in at deploy time.
export const dynamic = 'force-dynamic'

function inMinutes(min: number): Date {
  return new Date(Date.now() + min * 60_000)
}

function inHours(h: number): Date {
  return new Date(Date.now() + h * 3_600_000)
}

function inDays(d: number, h = 0, m = 0): Date {
  const base = new Date()
  base.setDate(base.getDate() + d)
  base.setHours(h, m, 0, 0)
  return base
}

export default function DemoCalendarPage() {
  const now = new Date()

  const items: CalendarItem[] = [
    {
      id: 'a1', kind: 'appointment',
      title: 'Private lesson — Lily Chen (aerial)',
      type: 'private_lesson',
      start: inMinutes(45),
      end: inMinutes(105),
      location: 'Big Star Studio · Molendinar',
      notes: 'Working on crucifix sequence',
      coach: 'Rhett Morrow',
      family: { id: 'f3', name: 'Chen' },
      student: { id: 's4', firstName: 'Lily', lastName: 'Chen' },
      alertMinutesBefore: 30,
      fee: 60, paid: false,
      href: '/demo/families/f3',
    },
    {
      id: 'a2', kind: 'appointment',
      title: 'Wed 4:45 Circus Fusion 8-15',
      type: 'fusion',
      start: inHours(4),
      end: inMinutes(4 * 60 + 60),
      location: 'Big Star Studio · Molendinar',
      notes: null,
      coach: 'Aliyah',
      family: null, student: null,
      alertMinutesBefore: null,
      fee: null, paid: false,
      href: '/demo/roll-call/c-wed-5',
    },
    {
      id: 'a3', kind: 'appointment',
      title: 'Holy Spirit Spring Fair show',
      type: 'show',
      start: inDays(4, 11, 0),
      end: inDays(4, 11, 45),
      location: 'Holy Spirit School, Mudgeeraba',
      notes: 'Roving entertainment + balloon — bring backup speaker',
      coach: 'Rhett Morrow',
      family: null, student: null,
      alertMinutesBefore: 120,
      fee: 350, paid: false,
      href: null,
    },
    {
      id: 'a4', kind: 'appointment',
      title: 'Mudgeeraba Street Party & Parade',
      type: 'show',
      start: inDays(4, 14, 0),
      end: inDays(4, 17, 0),
      location: 'Mudgeeraba town centre',
      notes: 'Set: stilts + roving balloon + parade walk. Bump-in 1pm.',
      coach: 'Rhett Morrow',
      family: null, student: null,
      alertMinutesBefore: 180,
      fee: 800, paid: false,
      href: null,
    },
    {
      id: 'a5', kind: 'appointment',
      title: 'Private lesson — Arjun Iyer (trainee prep)',
      type: 'private_lesson',
      start: inDays(2, 17, 0),
      end: inDays(2, 18, 0),
      location: 'Big Star Studio · Molendinar',
      notes: 'Show Programme audition piece',
      coach: 'Rhett Morrow',
      family: { id: 'f9', name: 'Iyer' },
      student: { id: 's11', firstName: 'Arjun', lastName: 'Iyer' },
      alertMinutesBefore: 30,
      fee: 60, paid: false,
      href: '/demo/families/f9',
    },
    {
      id: 'a6', kind: 'appointment',
      title: 'Sophie’s 8th birthday party',
      type: 'birthday_party',
      start: inDays(5, 10, 0),
      end: inDays(5, 12, 0),
      location: 'Big Star Studio · Molendinar',
      notes: 'Sophie M, 8 kids, balloon twisting + circus games. $250 paid deposit.',
      coach: 'Rhett Morrow',
      family: null, student: null,
      alertMinutesBefore: 120,
      fee: 500, paid: false,
      href: null,
    },
    {
      id: 'a7', kind: 'appointment',
      title: 'Kids Night Out — Superhero Circus',
      type: 'kno',
      start: inDays(17, 18, 0),
      end: inDays(17, 21, 0),
      location: 'Big Star Studio · Molendinar',
      notes: 'Theme: Superhero Circus. Need parent helper for sign-in.',
      coach: 'Rhett Morrow',
      family: null, student: null,
      alertMinutesBefore: 1440,
      fee: null, paid: false,
      href: null,
    },
    {
      id: 'a8', kind: 'appointment',
      title: 'Coaches monthly meeting',
      type: 'meeting',
      start: inDays(7, 9, 0),
      end: inDays(7, 10, 0),
      location: 'Big Star Studio · Molendinar',
      notes: 'Term 2 mid-point review, payroll Q&A',
      coach: null,
      family: null, student: null,
      alertMinutesBefore: 30,
      fee: null, paid: false,
      href: null,
    },
    {
      id: 'a9', kind: 'appointment',
      title: 'Personal — Gym',
      type: 'personal',
      start: inDays(1, 6, 0),
      end: inDays(1, 7, 0),
      location: 'Tribe Gold Coast',
      notes: 'Don\'t book over this slot',
      coach: null,
      family: null, student: null,
      alertMinutesBefore: 15,
      fee: null, paid: false,
      href: null,
    },
  ]

  return (
    <DashboardShell
      user={demoUser}
      currentPath="/calendar"
      pageTitle="Calendar"
      pageSubtitle="Shows, private lessons, classes, parties, personal. (Demo mode)"
      pageActions={
        <a
          href="/login"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
        >
          ➕ Sign in to add
        </a>
      }
    >
      <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-3 text-sm text-amber-900">
        <strong>Demo mode</strong> — sample upcoming events. The hero card up top is your &quot;next up&quot; warning — it goes <span className="bg-[#D72027] text-white font-extrabold px-1.5 py-0.5 rounded">red</span> when an event is within the alert window.
      </div>
      <CalendarView items={items} now={now} newHref="/login" itemHref={(it) => it.href} />
    </DashboardShell>
  )
}
