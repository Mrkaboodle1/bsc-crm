// /demo — public landing for the demo experience. No auth required.
// Useful for: showing the product surface to prospects, screenshotting
// without sign-in, sales demos, customer #2 onboarding.

export default function DemoIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-amber-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-3xl text-center">
        <div className="text-6xl mb-4">🎪</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-3 tracking-tight">
          BSC CRM <span className="text-[#D72027]">Demo</span>
        </h1>
        <p className="text-lg text-zinc-600 mb-10 max-w-xl mx-auto">
          A walk-through of what the platform looks like — no sign-in needed.
          Click around. Every tap and star awarded is local-only and won&apos;t save.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <DemoCard href="/demo/dashboard" icon="🏠" title="Dashboard" subtitle="Today's classes, KPI tiles, build progress" />
          <DemoCard href="/demo/roll-call" icon="📋" title="Roll Call" subtitle="The killer feature — pick a class, start marking" />
          <DemoCard href="/demo/stars" icon="⭐" title="Star Ledger" subtitle="Per-student timeline & tier progression" />
        </div>

        <div className="flex justify-center gap-3 flex-wrap">
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-5 py-3 rounded-xl hover:bg-zinc-50"
          >
            ← Back to landing
          </a>
          <a
            href="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-lg"
          >
            Sign in to use real data →
          </a>
        </div>
      </div>
    </div>
  )
}

function DemoCard({ href, icon, title, subtitle }: { href: string; icon: string; title: string; subtitle: string }) {
  return (
    <a
      href={href}
      className="block bg-white rounded-2xl shadow-md border border-zinc-200 p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all text-left"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-extrabold text-zinc-900 mb-1">{title}</div>
      <div className="text-xs text-zinc-500">{subtitle}</div>
    </a>
  )
}
