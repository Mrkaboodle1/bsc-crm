import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { SignedWaiversClient, type Waiver } from '@/components/signed-waivers-client'

export const dynamic = 'force-dynamic'

export default async function SignedWaiversPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('signed_waivers')
    .select('id, event_type, parent_name, email, phone, emergency, children, medical, consent_photo, terms_agreed, signature, signed_at')
    .eq('tenant_id', user.tenantId).order('signed_at', { ascending: false }).limit(3000)
  const missing = !!error && (error.message.includes('does not exist') || error.message.includes('relation'))

  return (
    <DashboardShell
      user={user}
      currentPath="/compliance/signed-waivers"
      pageTitle="✍️ Signed Waivers"
      pageSubtitle="Every signed waiver — imported from Tectonic and ongoing. Search, view and print."
    >
      <div className="max-w-4xl">
        {missing ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            This needs its database table first. Paste migration <strong>043_signed_waivers.sql</strong> into Supabase, then I&apos;ll run the import.
          </div>
        ) : (
          <SignedWaiversClient initial={(data ?? []) as Waiver[]} />
        )}
      </div>
    </DashboardShell>
  )
}
