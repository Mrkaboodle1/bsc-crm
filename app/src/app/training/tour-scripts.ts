// Tour timelines: for each training module, define which DOM elements to
// highlight at which time offsets in the narrated audio. Selectors should
// match a `data-tour="..."` attribute on the target page so the tour stays
// resilient if the page is restyled.
//
// Times are in milliseconds from the start of the module's MP3.

export type TourHighlight = {
  at: number          // ms offset
  selector: string    // CSS selector — prefer [data-tour="..."]
  label: string       // short caption shown in the bouncing tag
}

export type TourScript = {
  moduleId: string
  title: string       // shown in the tour widget header
  pageHref: string    // where the user must be for the tour to make sense
  highlights: TourHighlight[]
}

const TOURS: Record<string, TourScript> = {
  dashboard: {
    moduleId: 'dashboard',
    title: 'Dashboard tour',
    pageHref: '/dashboard',
    // Script (approx. timing from the 30-s narration):
    // 0–2s   "Open the dashboard each morning."
    // 2–7s   "The top five tiles show what matters: pending approvals…"
    // 7–13s  "…families, students, active classes, and open leads."
    // 13–18s "If the red number on Pending Approval is more than zero, that's where you start."
    // 18–25s "Below the tiles you'll see today's classes…"
    // 25–34s "On the right you'll see Jacky Today…"
    highlights: [
      { at:  1500, selector: '[data-tour="kpi-row"]',         label: 'The five tiles' },
      { at:  4500, selector: '[data-tour="kpi-pending"]',     label: 'Pending approvals — start here' },
      { at: 13000, selector: '[data-tour="kpi-pending"]',     label: "If red, that's where you start" },
      { at: 18000, selector: '[data-tour="todays-classes"]',  label: "Today's classes" },
      { at: 25000, selector: '[data-tour="jacky-today"]',     label: 'Jacky Today — overnight activity' },
    ],
  },

  inbox: {
    moduleId: 'inbox',
    title: 'Inbox tour',
    pageHref: '/inbox',
    highlights: [
      { at: 1500, selector: 'main',  label: 'Every draft Jacky has prepared' },
    ],
  },

  contacts: {
    moduleId: 'contacts',
    title: 'Contacts tour',
    pageHref: '/contacts',
    highlights: [
      { at: 1500, selector: 'main', label: 'Every family, lead, and parent' },
    ],
  },

  'roll-call': {
    moduleId: 'roll-call',
    title: 'Roll Call tour',
    pageHref: '/roll-call',
    highlights: [
      { at: 1500, selector: 'main', label: 'Your whole week of classes' },
    ],
  },
}

export function getTour(moduleId: string | null | undefined): TourScript | null {
  if (!moduleId) return null
  return TOURS[moduleId] ?? null
}

export function listToursWithPath(): TourScript[] {
  return Object.values(TOURS)
}
