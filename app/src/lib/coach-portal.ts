import 'server-only'
import { verifySession } from '@/lib/dal'
import { createServerSupabase, createServerSupabaseAdmin } from '@/lib/supabase-server'

// The standard School Holiday Workshop running order (9am–3pm).
export const RUNNING_ORDER: Array<{ time: string; activity: string }> = [
  { time: '9:00 AM', activity: 'Sign In / Free Play' },
  { time: '9:15 AM', activity: 'Warm Up Games' },
  { time: '9:30 AM', activity: 'Circus Skills Rotation 1' },
  { time: '10:30 AM', activity: 'Morning Tea' },
  { time: '11:00 AM', activity: 'Circus Skills Rotation 2' },
  { time: '12:00 PM', activity: 'Lunch' },
  { time: '12:30 PM', activity: 'Creative Activity / Craft' },
  { time: '1:15 PM', activity: 'Circus Skills Rotation 3' },
  { time: '2:15 PM', activity: 'Group Challenge / Show Creation' },
  { time: '2:45 PM', activity: 'Pack Up / Parent Collection' },
  { time: '3:00 PM', activity: 'Sign Out' },
]

export type AttendanceRow = {
  id: string; child_name: string; parent_name: string | null; parent_contact: string | null
  medical: string | null; status: 'expected' | 'present' | 'absent'
  signed_in_at: string | null; signed_out_at: string | null; signed_out_to: string | null
  incident: string | null; notes: string | null
}
export type CoachDay = {
  id: string; date: string; title: string; start_time: string; end_time: string
  activity: string | null; kids: number; isKno: boolean; category: 'workshop' | 'kno' | 'event'
}

const isKno = (t: string) => /^Kids Night Out/i.test(t || '')

// Pull a medical/allergy note out of a free-text "child_names" field, e.g. "(Allergies: nuts)".
const parseMedical = (childNames: string | null): string | null => childNames?.match(/\(([^)]*(?:allerg|medical|dietary)[^)]*)\)/i)?.[1] || null

// ─────────────────────────────────────────────────────────────────────────
// AUTO-SYNC: keep the coach roll (workshop_attendance) in step with the
// bookings for a day — every time anyone views it. Adds kids for new bookings,
// removes kids whose booking was deleted/moved, and NEVER touches a child who's
// already signed in or one added by hand on the day. This is the single source
// of truth so the count and the roll can never drift apart again.
// ─────────────────────────────────────────────────────────────────────────
type AdminClient = Awaited<ReturnType<typeof createServerSupabaseAdmin>>
const isPlaceholderName = (n: string | null | undefined) => !n || /'s child(\s*\d+)?$/i.test(String(n).trim())
const childNamesOf = (raw: string | null) => String(raw || '').replace(/\([^)]*\)/g, '').split(/,|&|\band\b/i).map((s) => s.trim()).filter(Boolean)

export async function reconcileDay(admin: AdminClient, tenantId: string, workshopId: string): Promise<void> {
  const { data: bookings } = await admin.from('workshop_bookings')
    .select('id, parent_name, email, phone, child_names, child_count, status').eq('workshop_id', workshopId).eq('status', 'booked')
  const { data: attend } = await admin.from('workshop_attendance')
    .select('id, booking_id, signed_in_at, child_name, parent_name, parent_contact, medical').eq('workshop_id', workshopId)
  const bookingIds = new Set((bookings ?? []).map((b) => b.id))

  // 1) Remove kids whose booking is gone (deleted/moved) — unless already signed in.
  const orphans = (attend ?? []).filter((a) => a.booking_id && !bookingIds.has(a.booking_id) && !a.signed_in_at).map((a) => a.id)
  if (orphans.length) await admin.from('workshop_attendance').delete().in('id', orphans)
  const live = (attend ?? []).filter((a) => !orphans.includes(a.id))

  const toInsert: Record<string, unknown>[] = []
  for (const b of bookings ?? []) {
    const count = Number(b.child_count) || 1
    const medical = parseMedical(b.child_names)
    const contact = b.phone || b.email || null
    const firstParent = (b.parent_name || '').split(' ')[0] || 'Booking'
    const rawNames = childNamesOf(b.child_names)
    const rows = live.filter((a) => a.booking_id === b.id).sort((x, y) => String(x.id).localeCompare(String(y.id)))

    // 2) UPDATE existing roll rows so ADMIN EDITS (real names, parent, phone/email, medical)
    //    flow straight through to what the coaches see. We only replace a roll name when the
    //    booking now has a REAL name for that child (never clobber a real name with a placeholder).
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const wantName = rawNames[i]
      const patch: Record<string, unknown> = {}
      if (wantName && !isPlaceholderName(wantName) && wantName !== r.child_name) patch.child_name = wantName
      if ((b.parent_name || null) !== r.parent_name) patch.parent_name = b.parent_name || null
      if (contact !== r.parent_contact) patch.parent_contact = contact
      if ((medical || null) !== (r.medical || null)) patch.medical = medical || null
      if (Object.keys(patch).length) await admin.from('workshop_attendance').update(patch).eq('id', r.id)
    }

    // 3) Add a roll spot for any booked child who isn't on the roll yet.
    for (let i = rows.length; i < count; i++) {
      const name = rawNames[i] || (count > 1 ? `${firstParent}'s child ${i + 1}` : `${firstParent}'s child`)
      toInsert.push({ tenant_id: tenantId, workshop_id: workshopId, booking_id: b.id, child_name: name, parent_name: b.parent_name, parent_contact: contact, medical, status: 'expected' })
    }
  }
  if (toInsert.length) await admin.from('workshop_attendance').insert(toInsert)
}

export async function getCoachDays(): Promise<CoachDay[] | null> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const { data: ws, error } = await supabase.from('holiday_workshops')
    .select('*').eq('tenant_id', user.tenantId).gte('date', today).order('date')
  if (error) return (error.message.includes('does not exist') || error.message.includes('relation')) ? null : []
  const ids = (ws ?? []).map((w) => w.id)
  const counts: Record<string, number> = {}
  if (ids.length) {
    // Auto-sync every upcoming day so the roll reflects the latest bookings, then
    // count the roll itself — the number and the names are now the SAME data.
    const admin = await createServerSupabaseAdmin()
    await Promise.all(ids.map((id) => reconcileDay(admin, user.tenantId, id).catch(() => {})))
    const { data: att } = await supabase.from('workshop_attendance').select('workshop_id').in('workshop_id', ids)
    for (const a of att ?? []) counts[a.workshop_id] = (counts[a.workshop_id] || 0) + 1
  }
  return (ws ?? []).map((w) => {
    const category: CoachDay['category'] = isKno(w.title) ? 'kno' : (w.kind === 'event' ? 'event' : 'workshop')
    return { id: w.id, date: w.date, title: w.title, start_time: w.start_time, end_time: w.end_time, activity: w.activity ?? null, kids: counts[w.id] || 0, isKno: category === 'kno', category }
  })
}

// Ensure one attendance row per booked child for this day, then return them.
export async function getCoachDay(workshopId: string) {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const admin = await createServerSupabaseAdmin()

  const { data: day } = await supabase.from('holiday_workshops').select('*').eq('id', workshopId).eq('tenant_id', user.tenantId).maybeSingle()
  if (!day) return null

  // Auto-sync the roll to the latest bookings (adds new kids, removes deleted/moved
  // ones, keeps anyone signed in) — so what the coach sees is always up to date.
  await reconcileDay(admin, user.tenantId, workshopId)

  const { data: students } = await supabase.from('workshop_attendance')
    .select('id, child_name, parent_name, parent_contact, medical, status, signed_in_at, signed_out_at, signed_out_to, incident, notes')
    .eq('workshop_id', workshopId).order('child_name')

  // rostered staff for the day
  const { data: staff } = await supabase.from('workshop_staff').select('coach_name, role').eq('workshop_id', workshopId)

  return {
    day: { id: day.id, date: day.date, title: day.title, start_time: day.start_time, end_time: day.end_time, activity: day.activity ?? null, isKno: isKno(day.title) },
    students: (students ?? []) as AttendanceRow[],
    staff: (staff ?? []) as Array<{ coach_name: string | null; role: string }>,
    runningOrder: RUNNING_ORDER,
  }
}
