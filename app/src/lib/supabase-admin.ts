import 'server-only'
import { createServerClient } from '@supabase/ssr'

// Service-role client — SERVER ONLY. Bypasses RLS. Never import into a
// client component. Used for credential file storage (private bucket) where
// we authorise the user ourselves in the route/page first.
export function createAdminSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
}

export const CREDENTIALS_BUCKET = 'coach-credentials'

export const CREDENTIAL_TYPES = [
  { value: 'blue_card', label: 'Blue Card', expiryCol: 'blue_card_expiry' },
  { value: 'first_aid', label: 'First Aid Certificate', expiryCol: 'first_aid_expiry' },
  { value: 'ga_accreditation', label: 'Gymnastics Australia Accreditation', expiryCol: null },
  { value: 'public_liability', label: 'Public Liability Insurance', expiryCol: null },
  { value: 'other', label: 'Other document', expiryCol: null },
] as const
