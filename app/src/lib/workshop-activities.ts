import 'server-only'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

export type Activity = {
  id: string; title: string; description: string | null; icon: string | null
  image_url: string | null; video_url: string | null; source_url: string | null; sort_order: number
}
export type RunningOrderRow = {
  id: string; time_label: string; activity: string; activity_id: string | null; sort_order: number
}
export type OrderTemplate = {
  id: string; name: string; items: Array<{ time_label: string; activity: string }>
}

// The standard School Holiday Workshop running order (9am–3pm) — used as the
// starting template a coach can load into a day and then customise.
export const RUNNING_ORDER_TEMPLATE: Array<{ time_label: string; activity: string }> = [
  { time_label: '9:00 AM', activity: 'Sign In / Free Play' },
  { time_label: '9:15 AM', activity: 'Warm Up Games' },
  { time_label: '9:30 AM', activity: 'Circus Skills Rotation 1' },
  { time_label: '10:30 AM', activity: 'Morning Tea' },
  { time_label: '11:00 AM', activity: 'Circus Skills Rotation 2' },
  { time_label: '12:00 PM', activity: 'Lunch' },
  { time_label: '12:30 PM', activity: 'Creative Activity / Craft' },
  { time_label: '1:15 PM', activity: 'Circus Skills Rotation 3' },
  { time_label: '2:15 PM', activity: 'Group Challenge / Show Creation' },
  { time_label: '2:45 PM', activity: 'Pack Up / Parent Collection' },
  { time_label: '3:00 PM', activity: 'Sign Out' },
]

const missing = (msg: string) => msg.includes('does not exist') || msg.includes('relation')

export async function getWorkshopActivities(): Promise<Activity[] | null> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('workshop_activities')
    .select('id, title, description, icon, image_url, video_url, source_url, sort_order')
    .eq('tenant_id', user.tenantId).order('sort_order').order('created_at')
  if (error) return missing(error.message) ? null : []
  return (data ?? []) as Activity[]
}

export async function getRunningOrder(workshopId: string): Promise<RunningOrderRow[]> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('workshop_running_order')
    .select('id, time_label, activity, activity_id, sort_order')
    .eq('workshop_id', workshopId).eq('tenant_id', user.tenantId)
    .order('sort_order').order('created_at')
  if (error) return []
  return (data ?? []) as RunningOrderRow[]
}

export async function getOrderTemplates(): Promise<OrderTemplate[]> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('workshop_order_templates')
    .select('id, name, items').eq('tenant_id', user.tenantId).order('created_at')
  if (error) return []
  return (data ?? []) as OrderTemplate[]
}
