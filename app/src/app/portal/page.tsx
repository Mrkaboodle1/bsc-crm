const LINKS = [
  { href: '/f/trial', emoji: '🎪', title: 'Book a free trial', desc: 'Try a class on us' },
  { href: '/shop', emoji: '🎟️', title: 'Shop', desc: 'Passes, tickets & merch' },
  { href: '/f/party', emoji: '🎂', title: 'Birthday parties', desc: 'Enquire about a circus party' },
  { href: '/quiz/class-match', emoji: '❓', title: 'Find the right class', desc: '30-second quiz' },
  { href: '/f/enquiry', emoji: '✉️', title: 'Contact us', desc: 'Ask us anything' },
  { href: '/survey/class-feedback', emoji: '⭐', title: 'Give feedback', desc: 'Tell us how we’re going' },
]

export default function ParentPortal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50">
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="text-center mb-7">
          <div className="text-4xl mb-2">🎪</div>
          <h1 className="text-2xl font-extrabold text-zinc-900">Big Star Circus</h1>
          <p className="text-zinc-600 mt-1">Welcome, families! Everything you need, in one place.</p>
        </div>
        <div className="space-y-3">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 hover:-translate-y-0.5 hover:shadow-md transition-all">
              <span className="text-3xl">{l.emoji}</span>
              <div className="flex-1"><div className="font-bold text-zinc-900">{l.title}</div><div className="text-sm text-zinc-500">{l.desc}</div></div>
              <span className="text-zinc-300 text-xl">→</span>
            </a>
          ))}
        </div>
        <p className="text-center text-xs text-zinc-400 mt-8">Big Star Circus · Molendinar, Gold Coast · bigstarcircus.com.au</p>
      </div>
    </div>
  )
}
