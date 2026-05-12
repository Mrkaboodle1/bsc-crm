// Calendar helpers — used by /calendar, /demo/calendar, dashboard banner.

export type CalendarItem = {
  id: string
  kind: 'class' | 'appointment'
  title: string
  type: string // appointment type or class discipline
  start: Date
  end: Date
  location: string | null
  notes: string | null
  coach: string | null
  family: { id: string; name: string } | null
  student: { id: string; firstName: string; lastName: string | null } | null
  alertMinutesBefore: number | null
  fee: number | null
  paid: boolean
  href: string | null
}

export const APPT_TYPE_META: Record<string, { emoji: string; label: string; cls: string }> = {
  show:              { emoji: '🎪', label: 'Show',              cls: 'bg-[#D72027] text-white' },
  private_lesson:    { emoji: '⭐', label: 'Private lesson',    cls: 'bg-amber-100 text-amber-800' },
  workshop:          { emoji: '🧰', label: 'Workshop',          cls: 'bg-purple-100 text-purple-800' },
  birthday_party:    { emoji: '🎂', label: 'Birthday party',    cls: 'bg-pink-100 text-pink-800' },
  kno:               { emoji: '🌙', label: 'Kids Night Out',    cls: 'bg-indigo-100 text-indigo-800' },
  meeting:           { emoji: '👥', label: 'Meeting',           cls: 'bg-zinc-200 text-zinc-800' },
  personal:          { emoji: '🙂', label: 'Personal',          cls: 'bg-emerald-100 text-emerald-800' },
  holiday_programme: { emoji: '🏕', label: 'Holiday programme', cls: 'bg-orange-100 text-orange-800' },
  other:             { emoji: '✨', label: 'Other',             cls: 'bg-zinc-100 text-zinc-700' },
}

export const CLASS_TYPE_META: Record<string, { emoji: string; label: string; cls: string }> = {
  circus_acro:    { emoji: '🤸', label: 'Circus acro',    cls: 'bg-blue-100 text-blue-800' },
  aerial:         { emoji: '🎪', label: 'Aerial',         cls: 'bg-blue-100 text-blue-800' },
  fusion:         { emoji: '✨', label: 'Fusion',         cls: 'bg-blue-100 text-blue-800' },
  drama:          { emoji: '🎭', label: 'Drama',          cls: 'bg-blue-100 text-blue-800' },
  toddler:        { emoji: '🍼', label: 'Toddler',        cls: 'bg-blue-100 text-blue-800' },
  homeschool:     { emoji: '📚', label: 'Homeschool',     cls: 'bg-blue-100 text-blue-800' },
  adult:          { emoji: '🏋️', label: 'Adult',          cls: 'bg-blue-100 text-blue-800' },
  ndis:           { emoji: '💜', label: 'NDIS',           cls: 'bg-blue-100 text-blue-800' },
  private:        { emoji: '🔒', label: 'Private',        cls: 'bg-blue-100 text-blue-800' },
  show_programme: { emoji: '⭐', label: 'Show Programme', cls: 'bg-blue-100 text-blue-800' },
}

export function metaFor(item: CalendarItem) {
  if (item.kind === 'appointment') return APPT_TYPE_META[item.type] ?? APPT_TYPE_META.other
  return CLASS_TYPE_META[item.type] ?? { emoji: '🎪', label: item.type, cls: 'bg-blue-100 text-blue-800' }
}

export function formatDateTimeRange(start: Date, end: Date) {
  const sameDay =
    start.toDateString() === end.toDateString()
  const dateStr = start.toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
    timeZone: 'Australia/Brisbane',
  })
  const startTime = start.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Brisbane' })
  const endTime = end.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Brisbane' })
  if (sameDay) return `${dateStr} · ${startTime}–${endTime}`
  const endDate = end.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane' })
  return `${dateStr} ${startTime} → ${endDate} ${endTime}`
}

export function formatRelative(start: Date, now: Date = new Date()): string {
  const ms = start.getTime() - now.getTime()
  if (ms < 0) {
    const past = -ms
    if (past < 60_000) return 'started just now'
    if (past < 3_600_000) return `started ${Math.round(past / 60_000)}m ago`
    return 'in progress'
  }
  const mins = Math.round(ms / 60_000)
  if (mins < 1) return 'in less than a minute'
  if (mins < 60) return `in ${mins} min`
  const hours = mins / 60
  if (hours < 24) {
    const h = Math.floor(hours)
    const m = mins - h * 60
    return `in ${h}h${m ? ` ${m}m` : ''}`
  }
  const days = Math.round(hours / 24)
  if (days === 1) return 'tomorrow'
  if (days < 7) return `in ${days} days`
  return start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane' })
}

// Convert a recurring class into a one-off occurrence on a target date.
export function expandClass(
  cls: {
    id: string
    name: string
    discipline: string
    day_of_week: number
    start_time: string
    duration_minutes: number
    primary_coach: { full_name: string }[] | { full_name: string } | null
  },
  targetDate: Date
): CalendarItem {
  // Build a Date in Australia/Brisbane tz for the target date + class start_time.
  // Brisbane is UTC+10 year-round (no DST).
  const [h, m] = cls.start_time.split(':').map((x) => parseInt(x, 10))
  const y = targetDate.getFullYear()
  const mo = targetDate.getMonth()
  const d = targetDate.getDate()
  // Construct UTC for Brisbane local
  const startUtcMs = Date.UTC(y, mo, d, h - 10, m, 0)
  const start = new Date(startUtcMs)
  const end = new Date(startUtcMs + cls.duration_minutes * 60_000)
  const coach = Array.isArray(cls.primary_coach) ? cls.primary_coach[0]?.full_name : cls.primary_coach?.full_name
  return {
    id: `class-${cls.id}-${y}-${mo + 1}-${d}`,
    kind: 'class',
    title: cls.name,
    type: cls.discipline,
    start,
    end,
    location: 'Big Star Studio · Molendinar',
    notes: null,
    coach: coach ?? null,
    family: null,
    student: null,
    alertMinutesBefore: null,
    fee: null,
    paid: false,
    href: `/roll-call/${cls.id}`,
  }
}

// Group items by date label (Today / Tomorrow / weekday / date)
export function groupByDay(items: CalendarItem[], now: Date = new Date()) {
  const today = brisbaneDateKey(now)
  const tomorrow = brisbaneDateKey(new Date(now.getTime() + 86_400_000))
  const groups = new Map<string, { label: string; key: string; items: CalendarItem[] }>()
  for (const it of items) {
    const key = brisbaneDateKey(it.start)
    if (!groups.has(key)) {
      const date = new Date(it.start)
      let label: string
      if (key === today) label = 'Today'
      else if (key === tomorrow) label = 'Tomorrow'
      else label = date.toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'short',
        timeZone: 'Australia/Brisbane',
      })
      groups.set(key, { label, key, items: [] })
    }
    groups.get(key)!.items.push(it)
  }
  // Sort each day's items
  for (const g of groups.values()) {
    g.items.sort((a, b) => a.start.getTime() - b.start.getTime())
  }
  // Return in chronological order
  return Array.from(groups.values()).sort((a, b) => a.key.localeCompare(b.key))
}

function brisbaneDateKey(d: Date): string {
  // YYYY-MM-DD in Australia/Brisbane
  const parts = d.toLocaleString('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: 'Australia/Brisbane',
  })
  return parts // en-CA gives ISO-ish YYYY-MM-DD
}

// Compute next-up-within-window. Returns the next CalendarItem starting
// within `windowMinutes` from now, plus how-many-minutes-away.
export function nextWithin(items: CalendarItem[], windowMinutes: number, now: Date = new Date()) {
  const horizonMs = now.getTime() + windowMinutes * 60_000
  for (const it of items) {
    if (it.start.getTime() >= now.getTime() && it.start.getTime() <= horizonMs) {
      return { item: it, minutesAway: Math.round((it.start.getTime() - now.getTime()) / 60_000) }
    }
  }
  return null
}
