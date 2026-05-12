// Shared visual for the calendar: NextUp hero + grouped Today/Tomorrow/Later list.
// Pure presentational — same component used by /calendar (real) and /demo/calendar (mock).

import { metaFor, formatDateTimeRange, formatRelative, groupByDay, type CalendarItem } from '@/lib/calendar'

export function CalendarView({
  items,
  now,
  newHref = '/calendar/new',
  itemHref = (item: CalendarItem) => item.href,
}: {
  items: CalendarItem[]
  now?: Date
  newHref?: string
  itemHref?: (item: CalendarItem) => string | null
}) {
  const _now = now ?? new Date()

  // Next upcoming item (used by hero card)
  const upcoming = items
    .filter((it) => it.end.getTime() >= _now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const next = upcoming.find((it) => it.start.getTime() >= _now.getTime() || it.end.getTime() >= _now.getTime())
  const groups = groupByDay(upcoming, _now)

  return (
    <div className="space-y-6">
      {/* Next-up hero */}
      {next ? <NextUpHero item={next} now={_now} /> : <EmptyNextUp newHref={newHref} />}

      {/* Day-grouped list */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
          <div className="text-4xl mb-2">📅</div>
          <p className="font-bold text-zinc-700">Nothing else scheduled.</p>
          <p className="text-sm mt-1">
            <a href={newHref} className="text-[#D72027] font-bold hover:underline">Add an appointment</a>
            {' to populate the calendar.'}
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key}>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-500 mb-3">
              {g.label}
            </h3>
            <ul className="bg-white rounded-2xl shadow-sm border border-zinc-200 divide-y divide-zinc-100">
              {g.items.map((it) => {
                const meta = metaFor(it)
                const href = itemHref(it)
                const content = (
                  <div className="flex items-start gap-4 px-5 py-4">
                    <div className="text-3xl">{meta.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-extrabold text-zinc-900 truncate">{it.title}</span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {formatDateTimeRange(it.start, it.end)}
                      </div>
                      {it.location && <div className="text-xs text-zinc-500 mt-0.5">📍 {it.location}</div>}
                      {it.coach && <div className="text-xs text-zinc-500 mt-0.5">Coach: {it.coach}</div>}
                      {it.family && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          With: {it.family.name}{it.student ? ` · ${it.student.firstName}` : ''}
                        </div>
                      )}
                      {it.notes && <p className="text-sm text-zinc-700 mt-2">{it.notes}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                        <span>{formatRelative(it.start, _now)}</span>
                        {it.fee !== null && <span>· ${it.fee}{it.paid ? ' paid' : ''}</span>}
                        {it.alertMinutesBefore !== null && (
                          <span>· 🔔 {it.alertMinutesBefore < 60 ? `${it.alertMinutesBefore}m` : `${it.alertMinutesBefore / 60}h`} before</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
                return (
                  <li key={it.id}>
                    {href ? (
                      <a href={href} className="block hover:bg-zinc-50 transition-colors">
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function NextUpHero({ item, now }: { item: CalendarItem; now: Date }) {
  const meta = metaFor(item)
  const minsAway = Math.round((item.start.getTime() - now.getTime()) / 60_000)
  const inProgress = minsAway <= 0 && item.end.getTime() >= now.getTime()
  const urgent = !inProgress && minsAway <= (item.alertMinutesBefore ?? 60)

  return (
    <div className={`relative rounded-2xl shadow-md overflow-hidden ${urgent || inProgress ? 'bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white' : 'bg-white border border-zinc-200'}`}>
      <div className="p-6">
        <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-3 ${urgent || inProgress ? 'text-amber-200' : 'text-[#D72027]'}`}>
          {inProgress ? '🔴 In progress' : urgent ? '⚡ Next up' : 'Up next'}
        </div>
        <div className="flex items-start gap-4">
          <div className="text-6xl shrink-0">{meta.emoji}</div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${urgent || inProgress ? '' : 'text-zinc-900'}`}>
              {item.title}
            </h2>
            <div className={`mt-2 flex items-baseline gap-3 flex-wrap ${urgent || inProgress ? 'text-amber-100' : 'text-zinc-600'}`}>
              <span className="font-bold text-base">
                {inProgress ? 'happening now' : formatRelative(item.start, now)}
              </span>
              <span className="text-sm">· {formatDateTimeRange(item.start, item.end)}</span>
            </div>
            {item.location && (
              <div className={`mt-2 text-sm ${urgent || inProgress ? 'text-amber-100' : 'text-zinc-600'}`}>
                📍 {item.location}
              </div>
            )}
            {item.family && (
              <div className={`mt-1 text-sm ${urgent || inProgress ? 'text-amber-100' : 'text-zinc-600'}`}>
                With {item.family.name}{item.student ? ` · ${item.student.firstName}` : ''}
              </div>
            )}
            {item.notes && (
              <p className={`mt-3 text-sm ${urgent || inProgress ? 'text-white/90' : 'text-zinc-700'}`}>
                {item.notes}
              </p>
            )}
            {item.href && (
              <a
                href={item.href}
                className={`inline-block mt-4 font-extrabold text-sm px-4 py-2.5 rounded-lg ${urgent || inProgress ? 'bg-white text-[#D72027] hover:bg-amber-50' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
              >
                Open →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyNextUp({ newHref }: { newHref: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 text-center">
      <div className="text-5xl mb-3">🌴</div>
      <h2 className="text-xl font-extrabold text-zinc-900">All clear</h2>
      <p className="text-sm text-zinc-500 mt-1">Nothing on your calendar right now.</p>
      <a
        href={newHref}
        className="inline-block mt-4 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-lg"
      >
        ➕ Add an appointment
      </a>
    </div>
  )
}

export function NextUpBanner({
  item,
  now,
}: {
  item: CalendarItem
  now?: Date
}) {
  const _now = now ?? new Date()
  const meta = metaFor(item)
  const minsAway = Math.round((item.start.getTime() - _now.getTime()) / 60_000)
  const inProgress = minsAway <= 0 && item.end.getTime() >= _now.getTime()
  const urgent = !inProgress && minsAway <= (item.alertMinutesBefore ?? 60)

  return (
    <a
      href="/calendar"
      className={`flex items-center gap-4 rounded-2xl shadow-md p-4 sm:p-5 hover:-translate-y-0.5 transition-all ${urgent || inProgress ? 'bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white' : 'bg-white border border-zinc-200 text-zinc-900'}`}
    >
      <div className="text-4xl shrink-0">{meta.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-0.5 ${urgent || inProgress ? 'text-amber-200' : 'text-[#D72027]'}`}>
          {inProgress ? '🔴 In progress now' : urgent ? '⚡ Coming up' : 'Next up'}
        </div>
        <div className="font-extrabold text-base sm:text-lg truncate">{item.title}</div>
        <div className={`text-xs mt-0.5 ${urgent || inProgress ? 'text-amber-100' : 'text-zinc-500'}`}>
          {inProgress ? 'happening now' : formatRelative(item.start, _now)} · {formatDateTimeRange(item.start, item.end)}
        </div>
      </div>
      <div className={`hidden sm:block text-sm font-bold ${urgent || inProgress ? 'text-amber-100' : 'text-zinc-400'}`}>
        Calendar →
      </div>
    </a>
  )
}
