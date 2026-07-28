import 'server-only'
import type { createAdminSupabase } from './supabase-admin'

// Turns a Tectonic free-trial form into real kids on the real roll.
//
// The form gives us the parent (already synced), the child names, and the class
// they picked. Previously only the parent came across — the kids sat as text
// inside the waiver and never became students, so they never hit a roll.
//
// Deliberately conservative: we only create a child when the name looks like a
// name, and we only enrol when the form's class maps to a real BSC class.
// We never remove or alter an existing enrolment.

type Admin = ReturnType<typeof createAdminSupabase>

// Words that are never part of a child's name — if one shows up we drop that
// word, and if the whole entry is junk we skip it entirely. Parents type all
// sorts into this box ("N/a", "Anna, 8 yrs, Tuesday 3:45pm"), and a wrong guess
// creates a fake child on a roll, so this errs hard on the side of skipping.
const NOISE = /^(and|or|both|yes|no|n|a|na|nil|tba|tbc|none|null|test|asdf|qwerty|child|children|kid|kids|yr|yrs|year|years|yo|old|age|aged|turning|months?|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|am|pm|st|nd|rd|th|class|classes|circus|drama|aerial|acro|fusion|gymnastic|gymnastics|program|please|thanks|thank|you)$/i

/** Split a messy "Child Name" field into clean first/last names. */
export function parseChildNames(raw: string | null | undefined): { first: string; last: string | null }[] {
  if (!raw) return []
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  const out: { first: string; last: string | null }[] = []
  const seen = new Set<string>()

  for (const part of String(raw).split(/[;\n]|,(?=\s*[A-Za-z])|\s+(?:and|&|\+)\s+/i)) {
    const words = part
      .replace(/\(.*?\)/g, ' ')                                 // "(Arli)"
      .replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, ' ')   // dates
      .replace(/\b\d{1,2}[:.]\d{2}\s*(am|pm)?/gi, ' ')          // times
      .replace(/[^A-Za-z '\-]/g, ' ')                           // digits & symbols
      .split(/\s+/)
      .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
      .filter((w) => w && !NOISE.test(w))

    if (!words.length) continue
    // A real name is letters with at most one internal hyphen/apostrophe.
    const clean = words.filter((w) => /^[A-Za-z][A-Za-z'-]*$/.test(w) && w.length >= 2 && w.length <= 20)
    if (!clean.length) continue
    // "asdf asdf" style repetition, or a single letter — not a name.
    if (clean.length > 1 && new Set(clean.map((w) => w.toLowerCase())).size === 1) continue

    const first = cap(clean[0]!)
    const last = clean.length > 1 ? clean.slice(1, 3).map(cap).join(' ') : null
    const key = (first + '|' + (last ?? '')).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ first, last })
    if (out.length >= 6) break
  }
  return out
}

/** Map a Tectonic "Class Attending" value onto a real BSC class row. */
export function matchClass(
  formValue: string | null | undefined,
  classes: { id: string; name: string; day_of_week: number; start_time: string }[]
): { id: string; name: string } | null {
  if (!formValue) return null
  const v = String(formValue).toLowerCase()
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayIdx = DAYS.findIndex((d) => v.includes(d))
  if (dayIdx < 0) return null

  // Pull the first time like "3:45pm" / "9am" / "4.45pm"
  const t = v.match(/(\d{1,2})[:.]?(\d{2})?\s*(am|pm)/)
  if (!t) return null
  let hour = parseInt(t[1]!, 10)
  const mins = t[2] ? parseInt(t[2], 10) : 0
  if (t[3] === 'pm' && hour !== 12) hour += 12
  if (t[3] === 'am' && hour === 12) hour = 0
  const wanted = hour * 60 + mins

  // Same day, closest start time within 20 minutes. Never match a private lesson.
  let best: { id: string; name: string } | null = null
  let bestDiff = 21
  for (const c of classes) {
    if (c.day_of_week !== dayIdx) continue
    if (/🔒|private/i.test(c.name)) continue
    const [h, m] = c.start_time.split(':').map(Number)
    const diff = Math.abs((h! * 60 + m!) - wanted)
    if (diff < bestDiff) { bestDiff = diff; best = { id: c.id, name: c.name } }
  }
  return best
}

export type IntakeResult = { studentsCreated: number; enrolled: number; skipped: number; detail: string[] }

/**
 * Create students (and enrol them) for every free-trial waiver whose family has
 * no matching child yet. Additive only — nothing is ever removed.
 */
export async function runTrialIntake(admin: Admin, tenantId: string, opts?: { sinceDays?: number }): Promise<IntakeResult> {
  const res: IntakeResult = { studentsCreated: 0, enrolled: 0, skipped: 0, detail: [] }
  const since = new Date(Date.now() - (opts?.sinceDays ?? 30) * 86_400_000).toISOString()

  const { data: classes } = await admin.from('classes').select('id, name, day_of_week, start_time').eq('status', 'active')
  const classList = classes ?? []

  const { data: waivers } = await admin
    .from('signed_waivers')
    .select('id, family_id, children, answers, created_at')
    .eq('tenant_id', tenantId)
    .not('family_id', 'is', null)
    .not('children', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  const today = new Date().toISOString().slice(0, 10)

  for (const w of waivers ?? []) {
    const kids = parseChildNames(w.children)
    if (!kids.length) { res.skipped++; continue }

    const { data: existing } = await admin.from('students').select('id, first_name').eq('family_id', w.family_id)
    const have = new Set((existing ?? []).map((s) => (s.first_name || '').trim().toLowerCase()))

    const answers = (w.answers ?? {}) as { class_attending?: string }
    const cls = matchClass(answers.class_attending, classList)
    // No class named on the form = a birthday/holiday/general enquiry, not a
    // class signup. We do NOT invent a student for those — they'd pile up as
    // records nobody placed. Only real class signups become kids on a roll.
    if (!cls) { res.skipped++; continue }

    for (const kid of kids) {
      if (have.has(kid.first.toLowerCase())) continue
      // Last guard: program/venue words that slip through as "names".
      if (/^(specialcise|adult only|program|birthday|she ll be|robina|college|privates?)$/i.test(`${kid.first} ${kid.last ?? ''}`.trim())) continue
      const { data: made } = await admin
        .from('students')
        .insert({ tenant_id: tenantId, family_id: w.family_id, first_name: kid.first, last_name: kid.last })
        .select('id')
        .single()
      if (!made) continue
      res.studentsCreated++
      have.add(kid.first.toLowerCase())
      let note = `${kid.first} ${kid.last ?? ''}`.trim()

      const { error } = await admin.from('enrolments').insert({
        tenant_id: tenantId, student_id: made.id, class_id: cls.id, status: 'active',
        start_date: today, term: 'Term 3 2026', notes: 'Commitment: Free trial',
      })
      if (!error) { res.enrolled++; note += ` → ${cls.name}` }
      res.detail.push(note)
    }
  }
  return res
}
