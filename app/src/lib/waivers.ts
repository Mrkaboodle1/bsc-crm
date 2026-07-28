import 'server-only'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

// Editable waiver wording shown on every booking form (free trial, KNO, workshops).
// Stored in tenants.settings.waiver — no schema change needed.
export type Waiver = { liability: string; media: string; medical: string }

export const DEFAULT_WAIVER: Waiver = {
  liability:
    'I understand that circus, acrobatic, aerial and physical activities carry inherent risks, including the risk of injury. ' +
    'I confirm my child is in good health and able to take part. To the extent permitted by law, I release Big Star Circus, its ' +
    'owners, coaches and staff from any liability for injury, harm, loss or damage that may occur while my child is attending or ' +
    'participating in Big Star Circus activities. I agree to follow all safety instructions given by staff.',
  media:
    'I give permission for Big Star Circus to take photos and video of my child during activities and to use them on social media, ' +
    'the Big Star Circus website and in marketing. (You can choose No below — it will not affect your booking.)',
  medical:
    'In the event of an emergency, if I cannot be contacted, I authorise Big Star Circus to arrange any necessary first aid or ' +
    'medical treatment for my child.',
}

export async function getPublicWaiver(): Promise<Waiver> {
  try {
    const sb = await createServerSupabaseAdmin()
    const { data: t } = await sb.from('tenants').select('settings').order('created_at').limit(1).maybeSingle()
    const w = (t?.settings as Record<string, unknown> | null)?.waiver as Partial<Waiver> | undefined
    return { ...DEFAULT_WAIVER, ...(w || {}) }
  } catch { return DEFAULT_WAIVER }
}
