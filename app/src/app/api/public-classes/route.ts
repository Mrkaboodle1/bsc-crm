import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Public GET — the weekly class timetable for the website signup popup.
// Only name / day / time ever leave the server: no kids, no coaches, no money.
// Private lessons, one-off entries and internal rolls are filtered out.

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function isPublicClass(name: string): boolean {
  const n = name.toLowerCase()
  if (n.includes('🔒') || n.includes('private')) return false
  if (n.includes('bubby') || n.includes('toddler')) return false
  if (n.includes('voucher') || n.includes('trainee show')) return false
  if (/\d{6,}/.test(n.replace(/[\s-]/g, ''))) return false // one-off rows with a phone number in the name
  if (/\b\d{1,2}(st|nd|rd|th)\b/.test(n)) return false // one-off dated entries ("29th July …")
  return true
}

export async function GET() {
  try {
    const admin = await createServerSupabaseAdmin()
    const { data: tenant } = await admin.from('tenants').select('id').eq('slug', 'bigstarcircus').maybeSingle()
    if (!tenant) return NextResponse.json({ classes: [] })

    const { data } = await admin
      .from('classes')
      .select('id, name, day_of_week, start_time, duration_minutes')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .order('day_of_week')
      .order('start_time')

    const classes = (data ?? [])
      .filter((c) => isPublicClass(c.name))
      .map((c) => ({
        id: c.id,
        name: c.name,
        day: DAY[c.day_of_week] ?? '',
        time: (c.start_time ?? '').slice(0, 5),
        minutes: c.duration_minutes ?? 60,
      }))

    return NextResponse.json({ classes }, { headers: { 'Cache-Control': 'public, max-age=300' } })
  } catch (e) {
    console.error('public-classes failed', e)
    return NextResponse.json({ classes: [] })
  }
}
