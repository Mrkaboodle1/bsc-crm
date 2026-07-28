// BIGSTAR RADAR — the maths behind the expansion system.
// Scoring, the satellite financial model, and the demand-test thresholds.
// Pure functions, no database — so they're easy to reason about and reuse.

export type Suburb = {
  id: string; name: string; region: string | null; postcode: string | null; lga: string | null
  population: number | null; children_5_16: number | null; population_growth_pct: number | null
  primary_schools: number | null; high_schools: number | null; childcare_centres: number | null
  median_income: number | null; family_household_pct: number | null
  distance_km: number | null; travel_minutes_pm: number | null
  homeschool_activity: string | null; ndis_activity: string | null
  score: number | null; score_breakdown: Record<string, number> | null
  confidence: string; status: string; last_checked: string | null
  main_problem: string | null; bigstar_solution: string | null; marketing_message: string | null
  launch_program: string | null; opening_offer: string | null; notes: string | null
  sources: { label: string; url: string; checked_on?: string }[] | null
}

// ── Scoring weights (editable — these are the starting points Rhett set) ──
export const WEIGHTS = {
  children: 15,     // child & family population
  demand: 20,       // demand-test results — the biggest single factor
  venue: 15,        // venue availability & suitability
  competition: 10,  // competition gap
  community: 10,    // marketing access
  financial: 15,    // financial viability
  travel: 5,        // operational feasibility from HQ
  inclusion: 5,     // inclusion & community need
  strategic: 5,     // strategic value to BigStar
} as const

export const BANDS = [
  { min: 85, label: 'Launch priority', tone: 'green' },
  { min: 70, label: 'Strong opportunity', tone: 'teal' },
  { min: 55, label: 'Keep validating', tone: 'amber' },
  { min: 40, label: 'Watch only', tone: 'orange' },
  { min: 0, label: 'Reject / revisit', tone: 'red' },
] as const

export function band(score: number | null) {
  return BANDS.find((b) => (score ?? 0) >= b.min) ?? BANDS[BANDS.length - 1]!
}

export type ScoreInputs = {
  children_5_16?: number | null
  population_growth_pct?: number | null
  primary_schools?: number | null
  distance_km?: number | null
  travel_minutes_pm?: number | null
  median_income?: number | null
  homeschool_activity?: string | null
  ndis_activity?: string | null
  // gathered from the child tables
  qualifiedLeads?: number
  trialBookings?: number
  venueBest?: number | null      // best venue score 0-100
  venueCount?: number
  competitorPressure?: number    // 0-10 average
  communityReach?: number        // total audience across groups
  weeklyMargin?: number | null   // from the financial model
}

/** The suburb score out of 100, with a breakdown so nothing is a black box. */
export function scoreSuburb(i: ScoreInputs): { score: number; breakdown: Record<string, number>; missing: string[] } {
  const missing: string[] = []
  const b: Record<string, number> = {}

  // Children & families — 100+ kids aged 5-16 in catchment is a full score
  if (i.children_5_16 == null) { missing.push('children aged 5–16'); b.children = 0 }
  else {
    const base = Math.min(1, i.children_5_16 / 2500)               // 2,500 kids = saturated
    const growth = Math.min(0.2, Math.max(0, (i.population_growth_pct ?? 0) / 10))
    b.children = Math.round(WEIGHTS.children * Math.min(1, base + growth))
  }

  // Demand test — the truth serum. 40 leads + 20 trial bookings = full marks.
  const leads = i.qualifiedLeads ?? 0, trials = i.trialBookings ?? 0
  if (!leads && !trials) { missing.push('demand test not run'); b.demand = 0 }
  else b.demand = Math.round(WEIGHTS.demand * Math.min(1, (leads / 40) * 0.6 + (trials / 20) * 0.4))

  // Venue — best venue found, plus a little for having options
  if (i.venueBest == null) { missing.push('no venue scored'); b.venue = 0 }
  else b.venue = Math.round(WEIGHTS.venue * Math.min(1, (i.venueBest / 100) * 0.85 + Math.min(0.15, (i.venueCount ?? 0) * 0.05)))

  // Competition gap — LOW pressure scores high
  if (i.competitorPressure == null) { missing.push('competitors not researched'); b.competition = Math.round(WEIGHTS.competition * 0.5) }
  else b.competition = Math.round(WEIGHTS.competition * (1 - Math.min(1, i.competitorPressure / 10)))

  // Community marketing access — 5,000 reachable parents = full marks
  b.community = Math.round(WEIGHTS.community * Math.min(1, (i.communityReach ?? 0) / 5000))
  if (!i.communityReach) missing.push('community groups not mapped')

  // Financial viability — $500/week contribution margin = full marks
  if (i.weeklyMargin == null) { missing.push('financials not modelled'); b.financial = 0 }
  else b.financial = Math.round(WEIGHTS.financial * Math.max(0, Math.min(1, i.weeklyMargin / 500)))

  // Travel & catchment. A satellite must reach families who would NOT already
  // drive to Molendinar — otherwise it just moves existing students and adds
  // cost. So being TOO CLOSE is a negative, not a positive. Sweet spot is far
  // enough to be a new catchment (~18–45km) but not so far the coaches suffer.
  const km = i.distance_km ?? null
  const mins = i.travel_minutes_pm ?? (km != null ? km * 1.6 : null)
  if (km == null && mins == null) { missing.push('distance from HQ'); b.travel = 0 }
  else {
    const d = km ?? (mins! / 1.6)
    let f: number
    if (d < 12) f = 0.1          // inside our own ad radius — cannibalises HQ
    else if (d < 18) f = 0.5     // overlapping edge
    else if (d <= 45) f = 1      // genuinely new catchment, still drivable
    else f = Math.max(0, 1 - (d - 45) / 35)  // too far for coaches from HQ
    b.travel = Math.round(WEIGHTS.travel * f)
  }

  // Inclusion & community need — homeschool + NDIS activity is a real BigStar edge
  const strong = (v?: string | null) => /strong|high|yes/i.test(v || '') ? 1 : /some|medium/i.test(v || '') ? 0.5 : 0
  b.inclusion = Math.round(WEIGHTS.inclusion * Math.min(1, (strong(i.homeschool_activity) + strong(i.ndis_activity)) / 2))

  // Strategic value — a NEW catchment that grows the performer pipeline without
  // eating HQ's own students.
  const dkm = i.distance_km ?? (i.travel_minutes_pm != null ? i.travel_minutes_pm / 1.6 : null)
  b.strategic = Math.round(WEIGHTS.strategic * (dkm == null ? 0.5 : dkm < 12 ? 0 : dkm <= 50 ? 1 : 0.5))

  const score = Math.min(100, Object.values(b).reduce((n, v) => n + v, 0))
  return { score, breakdown: b, missing }
}

// ── Venue scoring ─────────────────────────────────────────────────────
export type VenueInputs = {
  ceiling_height_m?: number | null; hall_size_sqm?: number | null; floor_type?: string | null
  rate_nonprofit?: number | null; rate_casual?: number | null
  parking?: string | null; toilets?: boolean | null; accessible?: boolean | null
  air_conditioning?: boolean | null; storage?: string | null
  ok_ground_circus?: boolean | null; ok_acrobatics?: boolean | null; ok_aerial?: boolean | null
  avail_mon?: string | null; avail_tue?: string | null; avail_wed?: string | null
  avail_thu?: string | null; avail_fri?: string | null; avail_sat?: string | null
}

/** Venue score out of 100 — can we actually teach circus in it, affordably? */
export function scoreVenue(v: VenueInputs): { score: number; breakdown: Record<string, number>; missing: string[] } {
  const missing: string[] = []
  const b: Record<string, number> = {}

  // Space & ceiling (30) — aerial needs real height
  const h = v.ceiling_height_m ?? null
  if (h == null) { missing.push('ceiling height'); b.space = 0 }
  else b.space = Math.round(30 * Math.min(1, (h - 2.5) / 3.5))     // 6m+ = full marks
  if (v.hall_size_sqm != null) b.space = Math.min(30, b.space + (v.hall_size_sqm >= 150 ? 5 : 0))
  else missing.push('hall size')

  // What we can actually run (25)
  const can = [v.ok_ground_circus, v.ok_acrobatics, v.ok_aerial].filter(Boolean).length
  b.activities = Math.round(25 * (can / 3))
  if (can === 0) missing.push('confirm what can be rigged/run')

  // Cost (20) — $35/hr non-profit is the good case, $80+ is poor
  const rate = v.rate_nonprofit ?? v.rate_casual ?? null
  if (rate == null) { missing.push('hire rate'); b.cost = 0 }
  else b.cost = Math.round(20 * Math.max(0, Math.min(1, (80 - rate) / 45)))

  // Availability in after-school slots (15)
  const slots = [v.avail_mon, v.avail_tue, v.avail_wed, v.avail_thu, v.avail_fri, v.avail_sat]
  const free = slots.filter((s) => s && !/no|unavailable|booked|full/i.test(s)).length
  b.availability = Math.round(15 * Math.min(1, free / 4))
  if (!slots.some(Boolean)) missing.push('day availability')

  // Practicalities (10)
  const nice = [v.parking && !/no|none/i.test(v.parking), v.toilets, v.accessible, v.air_conditioning, v.storage && !/no|none/i.test(v.storage)].filter(Boolean).length
  b.practical = Math.round(10 * (nice / 5))

  // Floor — sprung/timber is kind to bodies; concrete is a real negative
  if (/concrete/i.test(v.floor_type || '')) b.practical = Math.max(0, b.practical - 4)

  const score = Math.min(100, Object.values(b).reduce((n, x) => n + x, 0))
  return { score, breakdown: b, missing }
}

// ── Satellite financial model ─────────────────────────────────────────
export type FinanceInputs = {
  hallRate: number; hoursPerWeek: number
  coachRate: number; assistantRate: number; coachTravelHours: number; kmAllowance: number; kmPerWeek: number
  equipmentOnce: number; equipmentLifeWeeks: number
  insurancePerWeek: number; adminPerWeek: number; marketingPerWeek: number
  feePerStudent: number; students: number; classesPerWeek: number
  processingPct: number
}

export const DEFAULT_FINANCE: FinanceInputs = {
  hallRate: 35, hoursPerWeek: 4,
  coachRate: 37, assistantRate: 25, coachTravelHours: 2, kmAllowance: 0.88, kmPerWeek: 60,
  equipmentOnce: 4000, equipmentLifeWeeks: 104,
  insurancePerWeek: 25, adminPerWeek: 40, marketingPerWeek: 50,
  feePerStudent: 30, students: 40, classesPerWeek: 4,
  processingPct: 1.9,
}

export function modelSatellite(i: FinanceInputs) {
  const revenue = i.students * i.feePerStudent
  const processing = revenue * (i.processingPct / 100)
  const hall = i.hallRate * i.hoursPerWeek
  const coaching = i.coachRate * i.hoursPerWeek + i.assistantRate * i.hoursPerWeek * 0.5
  const travel = i.coachRate * i.coachTravelHours + i.kmAllowance * i.kmPerWeek
  const equipment = i.equipmentOnce / Math.max(1, i.equipmentLifeWeeks)
  const overhead = i.insurancePerWeek + i.adminPerWeek + i.marketingPerWeek
  const costs = hall + coaching + travel + equipment + overhead + processing
  const margin = revenue - costs

  // Break-even = students needed to cover the fixed weekly costs
  const perStudentNet = i.feePerStudent * (1 - i.processingPct / 100)
  const fixed = hall + coaching + travel + equipment + overhead
  const breakEvenStudents = perStudentNet > 0 ? Math.ceil(fixed / perStudentNet) : 0

  return {
    revenue: +revenue.toFixed(2),
    costs: +costs.toFixed(2),
    breakdown: {
      hall: +hall.toFixed(2), coaching: +coaching.toFixed(2), travel: +travel.toFixed(2),
      equipment: +equipment.toFixed(2), overhead: +overhead.toFixed(2), processing: +processing.toFixed(2),
    },
    weeklyMargin: +margin.toFixed(2),
    monthlyProfit: +(margin * 4.33).toFixed(2),
    annualProfit: +(margin * 52).toFixed(2),
    breakEvenStudents,
    revenuePerHallHour: i.hoursPerWeek ? +(revenue / i.hoursPerWeek).toFixed(2) : 0,
    perStudentMargin: i.students ? +(margin / i.students).toFixed(2) : 0,
    paybackWeeks: margin > 0 ? Math.ceil(i.equipmentOnce / margin) : null,
    risk: margin <= 0 ? 'high' : breakEvenStudents > i.students * 0.8 ? 'medium' : 'low',
  }
}

// ── Demand-test thresholds (editable) ─────────────────────────────────
export const DEMAND_THRESHOLDS = {
  qualifiedLeads: 40,
  trialBookings: 20,
  attendees: 12,
  foundingMembers: 8,
  studentsBy6Months: 40,
  studentsBy18Months: 70,
}

export function demandVerdict(d: { leads: number; trials: number; attended: number; joined: number }) {
  const t = DEMAND_THRESHOLDS
  const checks = [
    { label: `${t.qualifiedLeads} qualified leads`, got: d.leads, need: t.qualifiedLeads },
    { label: `${t.trialBookings} trial bookings`, got: d.trials, need: t.trialBookings },
    { label: `${t.attendees} actually attended`, got: d.attended, need: t.attendees },
    { label: `${t.foundingMembers} founding members`, got: d.joined, need: t.foundingMembers },
  ]
  const passed = checks.filter((c) => c.got >= c.need).length
  return { checks, passed, total: checks.length, verdict: passed === checks.length ? 'pass' : passed >= 2 ? 'promising' : 'not yet' }
}

// The repeatable launch workflow — shown as a checklist on each suburb.
export const PLAYBOOK: { step: number; title: string; detail: string }[] = [
  { step: 1, title: 'Pick the suburb', detail: 'Add it to the radar with region, postcode and LGA.' },
  { step: 2, title: 'Demographics', detail: 'Kids aged 5–16, growth, schools, income, family share. Record sources.' },
  { step: 3, title: 'Competitors', detail: 'Circus, gymnastics, dance, cheer, ninja, martial arts, aerial. Note waitlists.' },
  { step: 4, title: 'Community groups', detail: 'Mums groups, school P&Cs, homeschool + NDIS groups, markets, libraries.' },
  { step: 5, title: 'Find 5+ venues', detail: 'Halls, churches, scouts, PCYC, school gyms, dance studios with dead time.' },
  { step: 6, title: 'Organic demand test', detail: '"BigStar may be coming to [suburb]" — collect expressions of interest.' },
  { step: 7, title: 'Paid demand test', detail: 'Small Meta lead campaign, $50–$150. Measure cost per qualified local lead.' },
  { step: 8, title: 'Contact top venues', detail: 'Ask rates, availability, ceiling height, rigging, storage, insurance.' },
  { step: 9, title: 'Inspect the top two', detail: 'Measure the ceiling. Check the floor. Photograph everything.' },
  { step: 10, title: 'Run a pop-up class', detail: 'One-off or 4-week trial before signing anything long.' },
  { step: 11, title: 'Model the money', detail: 'Break-even students, weekly margin, payback on equipment.' },
  { step: 12, title: 'Approve or reject', detail: 'Against the demand thresholds — not gut feel.' },
  { step: 13, title: 'Founding-member campaign', detail: 'Launch offer to the leads already collected.' },
  { step: 14, title: 'Start classes', detail: 'Turn the hall into a BigStar Studio. Put a star on the board.' },
  { step: 15, title: 'Review at 30/60/90/180 days', detail: 'Students, retention, margin, coach rating, referrals.' },
]
