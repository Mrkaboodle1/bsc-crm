import { redirect } from 'next/navigation'
import { optionalSession } from '@/lib/dal'

export default async function Home() {
  // Already signed in? Skip the landing page.
  const session = await optionalSession()
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-amber-50">
      {/* Top bar */}
      <header className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎪</div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">BSC CRM</h1>
              <p className="text-xs text-amber-100 opacity-90">Big Star Circus operations platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="bg-white text-[#D72027] font-extrabold text-sm px-4 py-2 rounded-full hover:bg-amber-100 shadow-md transition-colors"
            >
              Sign in
            </a>
            <div className="hidden sm:block text-xs bg-white/15 px-3 py-1.5 rounded-full font-bold tracking-wide">
              v0.1 · DEPLOYED
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-extrabold text-zinc-900 mb-4 tracking-tight">
            <span className="text-[#D72027]">Big Star Circus</span> runs on this.
          </h2>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            One platform for every family, student, class, roll call, payment and
            campaign. Made in Australia. Built for circus schools, dance studios and
            gymnastics clubs — starting with one.
          </p>
          <div className="mt-8">
            <a
              href="/login"
              className="inline-block bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-lg px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl transition-shadow"
            >
              Sign in →
            </a>
          </div>
        </div>

        {/* Status panel */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border-l-8 border-[#FFC107]">
          <h3 className="text-sm font-extrabold text-[#D72027] uppercase tracking-widest mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusTile label="Database (Supabase)" value="✅ Connected" sub="10 tables · RLS active · Sydney region" />
            <StatusTile label="Hosting (Vercel)" value="✅ Live" sub="auto-deploys on every push" />
            <StatusTile label="Custom domain" value="⏳ Pending" sub="crm.bigstarcircus.com.au — DNS to wire" />
          </div>
        </div>

        {/* What's inside */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <FeatureCard icon="📱" title="Roll Call on iPad" status="Live" description="Tap-tiles, drag to reschedule, award stars, print the weekly timetable." />
          <FeatureCard icon="📅" title="Calendar & Classes" status="Live" description="Terms, school holidays, public holidays, shows & gigs — your whole diary." />
          <FeatureCard icon="👥" title="Contacts & Chat" status="Live" description="Tectonic-style contacts, smart lists, and one inbox for email + web enquiries." />
          <FeatureCard icon="📣" title="Marketing suite" status="Live" description="Forms, quizzes, surveys, QR codes, store, blog, analytics — capture leads everywhere." />
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-zinc-500 py-8">
          <p className="mb-2">
            Built by <span className="font-bold text-[#D72027]">Jackie</span> with
            <span className="font-bold"> Rhett Morrow</span> · Multi-tenant from day 1.
          </p>
          <p className="text-xs text-zinc-400">
            Founder · Customer #0 · The asset that becomes the SaaS.
          </p>
        </footer>
      </main>
    </div>
  )
}

function StatusTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-zinc-50 rounded-xl p-5">
      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-lg font-extrabold text-zinc-900 mb-1">{value}</div>
      <div className="text-xs text-zinc-600">{sub}</div>
    </div>
  )
}

function FeatureCard({ icon, title, status, description }: { icon: string; title: string; status: string; description: string }) {
  const statusColors: Record<string, string> = {
    "Live": "bg-green-100 text-green-800",
    "In progress": "bg-amber-100 text-amber-800",
    "Next": "bg-blue-100 text-blue-800",
    "Soon": "bg-zinc-100 text-zinc-700",
  }
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-extrabold text-zinc-900">{title}</h4>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[status] || "bg-zinc-100"}`}>
              {status}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-zinc-600 leading-relaxed">{description}</p>
    </div>
  )
}
