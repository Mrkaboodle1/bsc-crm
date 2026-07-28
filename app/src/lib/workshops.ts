import 'server-only'
import { verifySession } from '@/lib/dal'
import { createServerSupabase, createServerSupabaseAdmin } from '@/lib/supabase-server'

export type Booking = {
  id: string; workshop_id: string; parent_name: string | null; email: string | null
  phone: string | null; child_names: string | null; is_member: boolean
  child_count: number; amount_paid: number | null; paid: boolean
  status: 'booked' | 'waitlist' | 'cancelled'; source: string; created_at: string
}
export type Workshop = {
  id: string; date: string; title: string; start_time: string; end_time: string
  capacity: number; member_price: number; public_price: number
  public_opens_at: string | null; status: string; notes: string | null; activity: string | null; kind?: string | null
}
export type StaffMember = { id: string; coach_id: string | null; coach_name: string | null; role: 'coach' | 'trainee' | 'lead'; status: string }
export type WorkshopWithCounts = Workshop & { booked: number; waitlist: number; kids: number; collected: number; bookings: Booking[]; staff: StaffMember[] }

function missing(msg?: string) { return !!msg && (msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache')) }

const isKno = (title: string) => /^Kids Night Out/i.test(title || '')

async function loadWorkshops(filter: (w: Workshop) => boolean): Promise<WorkshopWithCounts[] | null> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: ws, error } = await supabase.from('holiday_workshops')
    .select('*').eq('tenant_id', user.tenantId).order('date')
  if (error) return missing(error.message) ? null : []
  const { data: bk } = await supabase.from('workshop_bookings')
    .select('id, workshop_id, parent_name, email, phone, child_names, is_member, child_count, amount_paid, paid, status, source, created_at')
    .eq('tenant_id', user.tenantId).order('created_at')
  const byWs = new Map<string, Booking[]>()
  for (const b of (bk ?? []) as Booking[]) { const a = byWs.get(b.workshop_id) ?? []; a.push(b); byWs.set(b.workshop_id, a) }
  // Staff roster (table may not exist yet → default to none)
  const staffByWs = new Map<string, StaffMember[]>()
  const { data: staff } = await supabase.from('workshop_staff')
    .select('id, workshop_id, coach_id, coach_name, role, status').eq('tenant_id', user.tenantId)
  for (const s of (staff ?? []) as Array<StaffMember & { workshop_id: string }>) {
    const a = staffByWs.get(s.workshop_id) ?? []; a.push(s); staffByWs.set(s.workshop_id, a)
  }
  return ((ws ?? []) as Workshop[]).filter(filter).map((w) => {
    const list = byWs.get(w.id) ?? []
    const booked = list.filter((b) => b.status === 'booked')
    const kids = booked.reduce((n, b) => n + (Number(b.child_count) || 1), 0)
    const collected = booked.reduce((n, b) => n + (Number(b.amount_paid) || 0), 0)
    return { ...w, bookings: list, booked: booked.length, waitlist: list.filter((b) => b.status === 'waitlist').length, kids, collected, staff: staffByWs.get(w.id) ?? [] }
  })
}

// Holiday workshops only (excludes Kids Night Out + custom events)
export async function getWorkshops(): Promise<WorkshopWithCounts[] | null> {
  return loadWorkshops((w) => !isKno(w.title) && w.kind !== 'event')
}

// Kids Night Out events only
export async function getKidsNightOut(): Promise<WorkshopWithCounts[] | null> {
  return loadWorkshops((w) => isKno(w.title))
}

// Public listing (no session) — open, future days with spots-left + member-only flag.
async function loadPublic(knoOnly: boolean) {
  const sb = await createServerSupabaseAdmin()
  const { data: tenant } = await sb.from('tenants').select('id, name').order('created_at').limit(1).maybeSingle()
  if (!tenant) return { businessName: 'Big Star Circus', workshops: [] as Array<Workshop & { spotsLeft: number; membersOnly: boolean }> }
  const today = new Date().toISOString().slice(0, 10)
  const { data: ws } = await sb.from('holiday_workshops')
    .select('*').eq('tenant_id', tenant.id).eq('status', 'open').gte('date', today).order('date')
  const list = ((ws ?? []) as Workshop[]).filter((w) => isKno(w.title) === knoOnly)
  const out = []
  for (const w of list) {
    const { count } = await sb.from('workshop_bookings').select('id', { count: 'exact', head: true }).eq('workshop_id', w.id).eq('status', 'booked')
    const membersOnly = !!w.public_opens_at && today < w.public_opens_at
    out.push({ ...w, spotsLeft: Math.max(0, w.capacity - (count ?? 0)), membersOnly })
  }
  return { businessName: tenant.name || 'Big Star Circus', workshops: out }
}

export async function getPublicWorkshops() { return loadPublic(false) }
export async function getPublicKno() { return loadPublic(true) }

// Coaches available to roster onto workshop / KNO days.
export type RosterCoach = { id: string; full_name: string; role: string | null; trainee_level: string | null; phone: string | null; email: string | null }
export async function getRosterCoaches(): Promise<RosterCoach[]> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('coaches')
    .select('id, full_name, role, trainee_level, phone, email, status').eq('tenant_id', user.tenantId).order('full_name')
  return ((data ?? []) as Array<RosterCoach & { status: string }>).filter((c) => c.status !== 'departed')
    .map((c) => ({ id: c.id, full_name: c.full_name, role: c.role, trainee_level: c.trainee_level, phone: c.phone, email: c.email }))
}
