import { createAdminSupabase } from '@/lib/supabase-admin'
import { OnboardingForm } from './onboarding-form'
import { DEFAULT_WELCOME_SECTIONS, type WelcomeSection } from '@/lib/coach-welcome-sections'

// Public new-coach sign-up page — reached via the invite link. No login.
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminSupabase()
  const { data: invite } = await admin.from('coach_invites').select('status, tenant_id').eq('token', token).maybeSingle()

  const invalid = !invite
  const used = invite?.status === 'submitted'

  // The welcome pages Rhett edits in the CRM (fallback to the built-in defaults)
  let sections: WelcomeSection[] = DEFAULT_WELCOME_SECTIONS
  if (invite && !used) {
    const { data: rows } = await admin.from('coach_welcome_sections').select('title, body, active').eq('tenant_id', invite.tenant_id).order('sort')
    if (rows && rows.length) sections = rows.filter((r) => r.active !== false).map((r) => ({ title: r.title, body: r.body }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D72027] to-[#A0151B] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bigstar-logo.png" alt="BigStar Circus" className="h-20 w-auto mx-auto bg-white rounded-2xl p-2 shadow-lg" />
          <h1 className="text-white text-3xl font-black mt-4">Join the BigStar Circus team 🎪</h1>
          <p className="text-white/85 mt-1">Fill this in once and you&apos;re all set up. Takes about 10 minutes.</p>
        </div>

        {invalid || used ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-5xl mb-3">{used ? '✅' : '🔗'}</div>
            <h2 className="text-xl font-black text-zinc-900">{used ? 'This link has already been used' : 'This link isn’t valid'}</h2>
            <p className="text-zinc-500 mt-2">{used ? 'Thanks — your sign-up is already complete. If you need to change something, contact Rhett.' : 'Please ask Rhett for a fresh sign-up link.'}</p>
          </div>
        ) : (
          <OnboardingForm token={token} sections={sections} />
        )}

        <p className="text-center text-white/60 text-xs mt-6">BigStar Circus · Gold Coast · your details are kept private and used only to set up your coaching.</p>
      </div>
    </div>
  )
}
