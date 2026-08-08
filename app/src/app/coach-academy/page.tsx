import { CoachAcademyForm } from '@/components/public/coach-academy-form'

// PUBLIC page — deliberately not in proxy.ts PROTECTED_PREFIXES. Teens from
// BigStar and from other dance/gym/cheer/circus schools land here.
export const metadata = {
  title: 'BigStar Coach Academy — become a circus coach on the Gold Coast',
  description: 'Paid coach training for ages 11+. Two days in-studio plus real supervised coaching hours, assessed, with a place on our casual coaching list.',
}

const TIERS = [
  {
    name: 'Star Leaders', age: 'Ages 11–14', price: '$195', accent: '#C8102E',
    lead: 'The stepping stone.',
    points: ['One 5-hour day in the school holidays', 'Six 30-minute assisted leader shifts', 'Learn to help, spot and lead a game', 'Feeds straight into the Junior Coach Certificate'],
  },
  {
    name: 'Junior Coach Certificate', age: 'Ages 14–17', price: '$395', accent: '#FFC107', featured: true,
    lead: 'The flagship — a real qualification for a real job.',
    points: ['Two full days in-studio, 9am–3pm', '10 hours supervised shadow coaching in real classes', 'Assessed on safety, teaching and professionalism', 'Certificate, coach shirt and handbook', 'A place on the BigStar casual coaching list', '$345 for current BigStar students'],
  },
  {
    name: 'Coach Conversion', age: 'Adults 18+', price: '$1,195', accent: '#14213d',
    lead: 'Career changers, parents, uni students.',
    points: ['Four days across two weekends', '30 hours supervised placement', 'First aid subsidised', 'Guaranteed interview on completion'],
  },
]

const FAQ = [
  ['Do I have to train at BigStar?', 'No. Students from other dance, gymnastics, cheer, acrobatics and circus schools are genuinely welcome. Bring what you already know and add coaching to it.'],
  ['Is this a nationally recognised qualification?', 'No, and we won’t pretend otherwise. There is no national accreditation body for circus coaching in Australia — the only nationally recognised circus coaching qualification is a one-year, full-time course in Melbourne costing over $17,000. Ours is a BigStar Circus in-house certificate backed by real assessed, supervised coaching hours, which is what an employer actually wants to see.'],
  ['Will I get a job at the end?', 'We hire from this course first — at our home studio and at every new location we open. Completing it doesn’t guarantee a job, but it puts you on the list and we are actively growing.'],
  ['Am I paid for the shadow hours?', 'No — the shadow hours are training, not work. You are always supervised, never left responsible for children on your own, and never counted in staffing ratios. If you go on to coach for us afterwards, that is paid work under a separate agreement.'],
  ['Do I need a Blue Card?', 'Not to do the course. We teach you what a Blue Card is and walk you through applying — you’ll need one before you coach.'],
  ['What if I’m not ready at the end?', 'You get written feedback on what to work on and one free re-assessment at the next intake. Nobody is failed and forgotten.'],
  ['When do intakes run?', 'Four times a year, in the school holidays, capped at 12 places. Apply below and we’ll tell you the next date.'],
]

export default function CoachAcademyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-red-50">
      {/* Hero */}
      <header className="bg-gradient-to-br from-[#14213d] via-[#1b2a5e] to-[#14213d] text-white">
        <div className="max-w-5xl mx-auto px-5 py-14 text-center">
          <div className="text-4xl mb-2">🎪</div>
          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-[#FFD700]">BigStar Coach Academy · Gold Coast</div>
          <h1 className="text-4xl sm:text-5xl font-black mt-3 leading-tight">Turn what you can do<br />into what you can teach.</h1>
          <p className="text-base sm:text-lg text-blue-100 mt-4 max-w-2xl mx-auto">
            Paid coach training for young movers from <b className="text-white">any</b> dance, gymnastics, cheer or circus background — not just ours.
            Two days in the studio, real hours in real classes, and a first job at the end of it.
          </p>
          <a href="#apply" className="inline-block mt-7 bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white font-black px-8 py-4 rounded-xl no-underline hover:from-[#A0151B] hover:to-[#7d1015] shadow-lg">
            Apply now →
          </a>
          <p className="text-xs text-blue-200 mt-3">12 places per intake · No payment until your place is confirmed</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-12">
        {/* Tiers */}
        <h2 className="text-3xl font-black text-zinc-900 text-center">Three ways in</h2>
        <p className="text-center text-zinc-500 mt-2 mb-8 max-w-2xl mx-auto">Start where you are. Star Leaders builds the confidence, the Junior Coach Certificate gets you the job, and Coach Conversion is for adults starting fresh.</p>
        <div className="grid md:grid-cols-3 gap-5">
          {TIERS.map((t) => (
            <div key={t.name} className={`flex flex-col bg-white rounded-2xl border-2 overflow-hidden ${t.featured ? 'border-[#FFC107] shadow-xl md:-mt-3 md:mb-3' : 'border-zinc-200 shadow-sm'}`}>
              {t.featured && <div className="bg-[#FFC107] text-[#14213d] text-[11px] font-black uppercase tracking-wider text-center py-1.5">Most popular</div>}
              <div className="p-5 text-center border-b border-zinc-100">
                <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: t.accent }}>{t.age}</div>
                <h3 className="text-lg font-black text-zinc-900 mt-1 leading-tight">{t.name}</h3>
                <div className="text-4xl font-black text-[#14213d] mt-2">{t.price}</div>
                <p className="text-xs text-zinc-500 mt-1.5 italic">{t.lead}</p>
              </div>
              <ul className="p-5 space-y-2 flex-1">
                {t.points.map((p) => (
                  <li key={p} className="flex gap-2 text-[13px] text-zinc-700 leading-snug">
                    <span className="text-[#D72027] font-black shrink-0">✔</span><span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="px-5 pb-5">
                <a href="#apply" className="block text-center bg-[#14213d] text-white font-black text-sm py-3 rounded-xl no-underline hover:bg-[#1b2a5e]">Apply</a>
              </div>
            </div>
          ))}
        </div>

        {/* What you get */}
        <section className="mt-14 bg-white rounded-2xl border border-zinc-200 p-7">
          <h2 className="text-2xl font-black text-zinc-900">What you walk away with</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 mt-4">
            {[
              ['📜', 'A certificate with your name and number on it'],
              ['👕', 'A BigStar coach shirt'],
              ['📗', 'The coach handbook — warm-ups, games and progressions to keep'],
              ['✍️', 'A written reference for job applications'],
              ['🎯', 'A place on our casual coaching list — we hire from here first'],
              ['🔁', 'A free refresher at any future intake, forever'],
            ].map(([icon, text]) => (
              <div key={text} className="flex gap-2.5 text-sm text-zinc-700"><span className="text-lg shrink-0">{icon}</span><span>{text}</span></div>
            ))}
          </div>
        </section>

        {/* For other schools */}
        <section className="mt-8 bg-[#14213d] text-white rounded-2xl p-7">
          <h2 className="text-2xl font-black">Run a dance, gym or cheer school?</h2>
          <p className="text-blue-100 mt-2.5 leading-relaxed">
            Send us your teenagers. They&apos;ll learn to coach properly — child safety, spotting, lesson planning, behaviour — and take those skills straight back to your studio.
            <b className="text-[#FFD700]"> We pay a referral fee for every student you send</b>, and your studio&apos;s name goes on their certificate.
          </p>
          <p className="text-sm text-blue-200 mt-3">No other circus school in Australia does this. We&apos;d rather grow the coaching pool than guard it. Call Rhett on <b className="text-white">0489 188 179</b>.</p>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-black text-zinc-900 mb-4">Straight answers</h2>
          <div className="space-y-2.5">
            {FAQ.map(([q, a]) => (
              <details key={q} className="bg-white rounded-xl border border-zinc-200 p-4 group">
                <summary className="font-bold text-zinc-900 cursor-pointer text-sm list-none flex justify-between gap-3">
                  {q}<span className="text-[#D72027] group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <p className="text-sm text-zinc-600 mt-2.5 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Apply */}
        <section id="apply" className="mt-12 scroll-mt-6">
          <div className="bg-white rounded-2xl border-2 border-[#D72027]/25 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white px-6 py-5 text-center">
              <div className="text-3xl mb-1">🌟</div>
              <h2 className="text-2xl font-black">Apply for the Coach Academy</h2>
              <p className="text-sm text-amber-100 mt-1">Takes about three minutes. No payment now.</p>
            </div>
            <div className="p-6"><CoachAcademyForm /></div>
          </div>
        </section>

        <p className="text-center text-xs text-zinc-400 mt-10 leading-relaxed">
          BigStar Circus Pty Ltd · Unit 1/14 Harper St, Molendinar QLD 4214 · 0489 188 179 · admin@bigstarcircus.com.au<br />
          All BigStar coaches hold Blue Cards. The BigStar Coach Academy certificate is an in-house certificate and is not a nationally recognised qualification.
        </p>
      </main>
    </div>
  )
}
