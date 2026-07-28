'use client'

import { useState, useEffect, useRef } from 'react'
import { Printer, Pencil, Check, RotateCcw, Mail } from 'lucide-react'

// ── Reusable printable / editable document wrapper ──────────────────────────
// Renders a beautifully designed circus-themed doc. Rhett can flip on "Edit",
// change any wording inline, Save (kept on this device), Print / Save-as-PDF to
// email, or Reset back to the BigStar default.
function PrintableDoc({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)
  const [customHtml, setCustomHtml] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [emailHelp, setEmailHelp] = useState(false)

  useEffect(() => {
    try { const s = localStorage.getItem(storageKey); if (s) setCustomHtml(s) } catch { /* ignore */ }
    setLoaded(true)
  }, [storageKey])

  function save() {
    if (!ref.current) return
    try { localStorage.setItem(storageKey, ref.current.innerHTML) } catch { /* ignore */ }
    setCustomHtml(ref.current.innerHTML)
    setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  function reset() {
    if (!confirm('Reset this document back to the BigStar default? Your edits on this device will be cleared.')) return
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
    setCustomHtml(null); setEditing(false)
  }

  if (!loaded) return null

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .doc-page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; page-break-after: always; }
          body { background: white !important; }
        }
        .doc-editing [data-edit]:hover { outline: 2px dashed #FFC10788; outline-offset: 3px; }
      `}</style>

      <div className="flex items-center justify-end gap-2 mb-4 no-print flex-wrap">
        {editing ? (
          <>
            <button onClick={save} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-3.5 py-2 rounded-lg">{saved ? <><Check size={15} /> Saved</> : <><Check size={15} /> Save changes</>}</button>
            <button onClick={() => setEditing(false)} className="text-sm font-semibold text-zinc-500 px-3 py-2 hover:bg-zinc-100 rounded-lg">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 hover:border-[#D72027] hover:text-[#D72027] text-sm font-bold px-3.5 py-2 rounded-lg"><Pencil size={14} /> Edit text</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white text-sm font-bold px-3.5 py-2 rounded-lg"><Printer size={15} /> Print / Save as PDF</button>
            <button onClick={() => setEmailHelp((v) => !v)} className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-sm font-bold px-3.5 py-2 rounded-lg"><Mail size={14} /> How to email</button>
            {customHtml && <button onClick={reset} className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-700 text-sm font-semibold px-2 py-2"><RotateCcw size={13} /> Reset</button>}
          </>
        )}
      </div>

      {emailHelp && (
        <div className="no-print mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-900">
          <div className="font-bold mb-1">📎 To email this pack:</div>
          <ol className="list-decimal ml-5 space-y-0.5">
            <li>Click <strong>Print / Save as PDF</strong> above, and in the print window choose <strong>“Save as PDF”</strong> as the printer. This saves a PDF file to your computer.</li>
            <li>Open your email (Outlook / Gmail), start a new message, and <strong>attach that saved PDF</strong>.</li>
          </ol>
          <p className="mt-1.5 text-xs text-blue-700">Websites aren’t allowed to attach a file to your email for you — so it’s this quick two-step. <a className="underline font-semibold" href="mailto:">Open a blank email →</a></p>
        </div>
      )}

      {editing && <div className="no-print mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">✏️ <strong>Edit mode on.</strong> Click any text to change it. Hit <strong>Save changes</strong> when done.</div>}

      {customHtml !== null ? (
        <div ref={ref} contentEditable={editing} suppressContentEditableWarning className={editing ? 'doc-editing outline-none' : 'outline-none'} dangerouslySetInnerHTML={{ __html: customHtml }} />
      ) : (
        <div ref={ref} contentEditable={editing} suppressContentEditableWarning className={editing ? 'doc-editing outline-none' : 'outline-none'}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Circus decoration bits (inline SVG — self-contained, print-safe) ────────
function BigTop({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden>
      <path d="M60 6 L112 40 H8 Z" fill="#D72027" />
      <path d="M60 6 L112 40 H86 L60 6 Z" fill="#A0151B" opacity="0.6" />
      <rect x="20" y="40" width="80" height="44" fill="#fff" stroke="#D72027" strokeWidth="2" />
      {[28, 44, 60, 76, 92].map((x, i) => <path key={i} d={`M${x} 40 v44`} stroke="#D72027" strokeWidth="1" opacity="0.35" />)}
      <path d="M52 84 v-20 a8 8 0 0 1 16 0 v20 Z" fill="#FFC107" />
      <circle cx="60" cy="6" r="4" fill="#FFC107" />
    </svg>
  )
}
function StarRow() {
  return <div style={{ letterSpacing: 4 }} className="text-[#FFC107] text-lg select-none">★ ★ ★ ★ ★</div>
}
function Cover({ eyebrow, title, subtitle, footer }: { eyebrow: string; title: string; subtitle: string; footer: string }) {
  return (
    <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white text-center px-8 py-14">
      <div className="absolute inset-x-0 top-0 h-6 flex">
        {Array.from({ length: 16 }).map((_, i) => <div key={i} className={`flex-1 ${i % 2 ? 'bg-white/90' : 'bg-[#FFC107]'}`} />)}
      </div>
      <div className="mx-auto mb-4 mt-6 inline-flex items-center justify-center bg-white rounded-2xl shadow-lg p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bigstar-logo.png" alt="BigStar Circus" className="h-16 w-auto" />
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#FFC107]" data-edit>{eyebrow}</div>
      <h1 className="text-4xl font-black mt-3 leading-tight drop-shadow" data-edit>{title}</h1>
      <p className="mt-3 text-white/90 max-w-md mx-auto" data-edit>{subtitle}</p>
      <div className="mt-5 flex justify-center"><StarRow /></div>
      <div className="mt-6 text-xs uppercase tracking-widest text-white/70" data-edit>{footer}</div>
    </div>
  )
}
function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white font-black flex items-center justify-center">{n}</span>
        <h2 className="text-2xl font-black text-zinc-900" data-edit>{title}</h2>
      </div>
      <div className="text-[15px] leading-relaxed text-zinc-700 space-y-2 pl-1" data-edit>{children}</div>
    </section>
  )
}
function Page({ children }: { children: React.ReactNode }) {
  return <div className="doc-page bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden max-w-3xl mx-auto">{children}</div>
}

// ── Shared pay + engagement content (one source of truth, used everywhere) ──
export const PAY_LADDER: Array<{ stage: string; who: string; rate: string }> = [
  { stage: 'Shadow / Trainee Coach', who: 'Learning, always supervised, assisting classes', rate: '$30–31/hr' },
  { stage: 'Coach', who: 'Delivers classes with backup, knows the drills', rate: '$33/hr' },
  { stage: 'Lead Coach', who: 'Runs classes solo, owns the roll & structure', rate: '$37/hr' },
  { stage: 'Senior / Head Coach', who: 'Programs, mentors coaches, directs shows', rate: '$40/hr+' },
]

// The engagement facts Rhett + his accountant confirmed. Shown across every doc.
export function EngagementCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4" data-edit>
      <div className="font-black text-emerald-900 mb-1.5">💼 How you&apos;re engaged &amp; paid</div>
      <ul className="list-none space-y-1 text-[14px] text-emerald-900">
        <li>✅ You&apos;re engaged as an <strong>independent contractor</strong> — you&apos;ll need an <strong>ABN</strong> and you send a simple <strong>invoice</strong> for the hours you coach.</li>
        <li>✅ You&apos;re paid <strong>every fortnight</strong>, like clockwork — no chasing us.</li>
        <li>✅ We pay your <strong>superannuation every fortnight</strong>, on top of your hourly rate.</li>
        {!compact && <li className="text-emerald-700 text-xs pt-1">Don&apos;t have an ABN or super fund yet? We&apos;ll help you set them up — see the Onboarding steps in the Trainee Pathway tab.</li>}
      </ul>
    </div>
  )
}

export function PayLadder() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden" data-edit>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">
          <tr><th className="px-4 py-2.5">Stage</th><th className="px-4 py-2.5 hidden sm:table-cell">What they do</th><th className="px-4 py-2.5 text-right">Rate</th></tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {PAY_LADDER.map((t) => (
            <tr key={t.stage}>
              <td className="px-4 py-2.5 font-bold text-zinc-900">{t.stage}<div className="text-xs text-zinc-400 font-normal sm:hidden">{t.who}</div></td>
              <td className="px-4 py-2.5 text-zinc-600 hidden sm:table-cell">{t.who}</td>
              <td className="px-4 py-2.5 text-right font-black text-[#D72027]">{t.rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 text-[11px] text-zinc-400 bg-zinc-50">Your pay grows as your skills grow — every circus discipline you&apos;re signed off to teach earns more. Rates reviewed yearly.</div>
    </div>
  )
}

// ── New-coach sign-up link generator (admin) ────────────────────────────────
export function NewCoachLink() {
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function create() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/coach-invite', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error || 'Could not create a link'); setBusy(false); return }
      setLink(`${window.location.origin}/join/${j.token}`)
    } catch { setError('Could not create a link — try again.') }
    setBusy(false)
  }
  return (
    <div className="bg-gradient-to-br from-[#D72027] to-[#A0151B] rounded-2xl p-5 sm:p-6 text-white mb-5">
      <h3 className="text-lg font-black flex items-center gap-2">🔗 Sign up a new coach</h3>
      <p className="text-white/85 text-sm mt-1 mb-3 max-w-xl">Create a private link and send it to a new coach. They fill in their details, super &amp; bank, and upload their cards — and they&apos;re set up in BigStar automatically, with reminders before each card expires. Each link works once.</p>
      {!link ? (
        <button onClick={create} disabled={busy} className="bg-white text-[#D72027] font-black text-sm px-4 py-2.5 rounded-lg hover:bg-amber-50 disabled:opacity-60">{busy ? 'Creating…' : '＋ Create sign-up link'}</button>
      ) : (
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wider font-black text-white/70 mb-1">Send this link to your new coach</div>
          <div className="flex gap-2 flex-wrap">
            <input readOnly value={link} className="flex-1 min-w-[220px] bg-white text-zinc-800 text-sm rounded-lg px-3 py-2 font-mono" onFocus={(e) => e.currentTarget.select()} />
            <button onClick={() => { navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }} className="bg-white text-[#D72027] font-black text-sm px-4 py-2 rounded-lg">{copied ? 'Copied!' : 'Copy'}</button>
            <button onClick={() => setLink(null)} className="text-white/80 text-sm font-bold px-3">New link</button>
          </div>
        </div>
      )}
      {error && <div className="mt-2 text-sm bg-white/15 rounded px-3 py-2">{error}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 1. WELCOME PACK  — handed to every coach at interview / day one
// ════════════════════════════════════════════════════════════════════════════
export function WelcomePack() {
  return (
    <PrintableDoc storageKey="bsc_welcome_pack_v3">
      <Page>
        <Cover eyebrow="You're invited to join the family" title="The BigStar Coach Welcome Pack" subtitle="Children first. Circus second. Confidence always." footer="BigStar Circus · Gold Coast" />

        <div className="p-8 sm:p-10">
          <Section n="1" title="Welcome from Rhett">
            <p><strong>Welcome to BigStar Circus.</strong> I'm Rhett, the founder — and if you're reading this, it's because we think you might be one of us.</p>
            <p>BigStar didn't start as a business. It started because I believe every child deserves to feel confident, capable and celebrated. Circus is simply the most magical way I've found to do that. We don't build the world's best performers — we build the world's most confident kids.</p>
            <p><strong>Our mission:</strong> to build confident, creative and capable young people through circus.<br /><strong>Our vision:</strong> a BigStar in every community, changing how children see themselves.<br /><strong>Our values:</strong> Children first · Confidence always · Warmth · Growth · Safety · Team.</p>
          </Section>

          <Section n="2" title="What makes a BigStar coach different">
            <p>Anyone can teach a cartwheel. A BigStar coach teaches a child to believe they can do the cartwheel — and then cheers like it's the Olympics when they land it.</p>
            <p className="font-bold text-[#D72027]">Children first. Circus second. Confidence always.</p>
            <p>We hire for heart. Skills we can teach. The way you make a nervous 5-year-old feel brave — that's the magic, and that's you.</p>
          </Section>

          <Section n="3" title="Our expectations">
            <div className="space-y-1">
              {['★ Always arrive early', '★ Smile — every single class', '★ Know every child’s name', '★ Talk to the parents', '★ Wear your uniform with pride', '★ Be professional', '★ Be positive', '★ Keep learning', '★ Keep every child safe', '★ Represent the brand'].map((x) => <div key={x}>{x}</div>)}
            </div>
          </Section>

          <Section n="4" title="Our culture">
            <p>Four things we never compromise on:</p>
            <ul className="list-none space-y-1">
              <li>🚫 <strong>No egos.</strong> The kids are the stars, not us.</li>
              <li>🤝 <strong>Support your teammates.</strong> Always.</li>
              <li>🎉 <strong>Celebrate wins</strong> — theirs and each other's.</li>
              <li>💛 <strong>Leave every child better than you found them.</strong></li>
            </ul>
          </Section>

          <Section n="5" title="Our teaching philosophy">
            <p>We teach <strong>confidence</strong>, using circus as the tool. That means:</p>
            <ul className="list-none space-y-1">
              <li>⭐ We celebrate <strong>effort</strong>, not just achievement.</li>
              <li>🌱 We coach a <strong>growth mindset</strong> — "you can't do it <em>yet</em>."</li>
              <li>💬 We use <strong>encouragement</strong> and <strong>positive reinforcement</strong> first, always.</li>
              <li>🎯 Every child leaves each class having felt one clear moment of success.</li>
            </ul>
          </Section>

          <Section n="6" title="The BigStar child">
            <p>Every child who walks out of a BigStar class should leave:</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
              {['Feeling confident', 'Feeling included', 'Feeling successful', 'Feeling safe', 'Wanting to come back'].map((x) => <div key={x} className="bg-[#FFC107]/15 border border-[#FFC107]/40 rounded-xl px-2 py-3 text-center text-sm font-bold text-zinc-800">{x}</div>)}
            </div>
          </Section>

          <Section n="7" title="The parent experience">
            <p>Parents are trusting us with the most precious thing in their world. We earn that trust every class:</p>
            <ul className="list-none space-y-1">
              <li>👋 <strong>Greet</strong> every parent by name where you can.</li>
              <li>💬 <strong>Answer questions</strong> warmly and honestly.</li>
              <li>📣 Share a <strong>win</strong> about their child at pickup.</li>
              <li>🤝 Handle any <strong>complaint</strong> calmly — listen, apologise, fix, tell Rhett.</li>
            </ul>
          </Section>

          <Section n="8" title="Coach development">
            <p>You're not taking a job — you're stepping onto a pathway. Every BigStar coach works through the <strong>BigStar Coach Academy</strong> (40 hours across 4 weeks), then grows:</p>
            <p className="font-bold text-[#D72027]">Shadow → Coach → Lead Coach → Senior / Head Coach</p>
            <p>Every new circus discipline you master earns you more, and as we open new locations, today's coaches become tomorrow's leaders. (Your pay ladder is in Section 10.)</p>
          </Section>

          <Section n="9" title="Professional standards">
            <div className="space-y-1">
              {['✔ Blue Card (Working with Children) — always current', '✔ Child protection is everyone’s job', '✔ Confidentiality — what happens here stays here', '✔ Phones away during class', '✔ No posting children on social media', '✔ Wear the uniform, look the part', '✔ Safety checks before every session', '✔ Report every incident, no matter how small'].map((x) => <div key={x}>{x}</div>)}
            </div>
          </Section>

          <Section n="10" title="Your pay, super & getting set up">
            <p>Clear and simple — here's exactly how your pay works and grows at BigStar:</p>
            <div className="my-3"><PayLadder /></div>
            <div className="my-3"><EngagementCard /></div>
            <p className="text-sm text-zinc-600">Before your first pay we'll help you get an <strong>ABN</strong> (free) and give you a short <strong>details form</strong> for your bank + super fund, so we can pay you and your super every fortnight. It takes about 15 minutes and we'll walk you through it.</p>
          </Section>

          {/* The pledge / signature page */}
          <div className="doc-page mt-10 -mx-8 sm:-mx-10 -mb-8 sm:-mb-10 bg-gradient-to-b from-[#FFF9E6] to-white border-t-4 border-[#FFC107] px-8 sm:px-10 py-10 text-center">
            <div className="flex justify-center mb-2"><StarRow /></div>
            <h2 className="text-2xl font-black text-zinc-900" data-edit>The BigStar Promise</h2>
            <div className="max-w-lg mx-auto mt-4 text-[15px] leading-relaxed text-zinc-800 italic space-y-1" data-edit>
              <p>"I promise to always put children first.</p>
              <p>I promise to create confidence.</p>
              <p>I promise to protect every child.</p>
              <p>I promise to keep learning.</p>
              <p>I promise to represent BigStar Circus with pride."</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-8 max-w-lg mx-auto mt-10 text-left">
              <div><div className="border-b-2 border-zinc-400 h-8" /><div className="text-xs text-zinc-500 mt-1">Coach signature</div></div>
              <div><div className="border-b-2 border-zinc-400 h-8" /><div className="text-xs text-zinc-500 mt-1">Date</div></div>
            </div>
            <div className="mt-8 text-[11px] uppercase tracking-widest text-zinc-400">Welcome to the family · BigStar Circus</div>
          </div>
        </div>
      </Page>
    </PrintableDoc>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 2. ACADEMY MANUAL — the 200-page IP system. Starts as Table of Contents.
// ════════════════════════════════════════════════════════════════════════════
export function AcademyManual() {
  return (
    <PrintableDoc storageKey="bsc_academy_manual_v1">
      <Page>
        <Cover eyebrow="The complete coach system" title="BigStar Coach Recruitment & Academy Manual" subtitle="Recruit · Interview · Assess · Onboard · Train · Develop — every future BigStar coach, the same way, everywhere." footer="Intellectual Property of BigStar Circus" />

        <div className="p-8 sm:p-10">
          <div className="bg-[#D72027]/5 border border-[#D72027]/15 rounded-xl p-5 mb-8 text-[15px] text-zinc-700 leading-relaxed" data-edit>
            <p className="font-bold text-zinc-900 mb-1">The concept</p>
            <p>This is not a hiring guide — it is the complete, repeatable system that lets BigStar grow to many locations while keeping the same culture and teaching quality. We do not recruit circus performers; we recruit <strong>movement educators who love children</strong> and teach them the circus magic. Circus skills can be taught. Personality cannot.</p>
          </div>

          <div className="mb-8"><EngagementCard /></div>

          <div className="space-y-8">
            {TOC.map((part) => (
              <div key={part.n} className="break-inside-avoid">
                <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-[#D72027]/20">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white font-black flex items-center justify-center shrink-0">{part.n}</span>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#D72027]" data-edit>Part {part.n}</div>
                    <div className="text-xl font-black text-zinc-900 leading-tight" data-edit>{part.title}</div>
                  </div>
                </div>
                <div className="space-y-3 pl-1">
                  {part.items.map((it, i) => (
                    <div key={i} className="break-inside-avoid">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-[#D72027] shrink-0">{part.n}.{i + 1}</span>
                        <span className="font-bold text-zinc-900" data-edit>{it.t}</span>
                      </div>
                      <p className="text-[14px] leading-relaxed text-zinc-600 pl-6 mt-0.5" data-edit>{it.b}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-zinc-950 text-white rounded-xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#FFC107] mb-2">Every chapter will include</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-sm">
              {['Learning objectives', 'Step-by-step procedures', 'Examples', 'Photos to shoot', 'Videos to film', 'QR codes', 'Worksheets', 'Coach reflections', 'Assessments & quizzes', 'Common mistakes', 'Practical checklists', 'Competency sign-off'].map((x) => <div key={x} className="flex items-center gap-1.5"><span className="text-[#FFC107]">★</span>{x}</div>)}
            </div>
          </div>

          <p className="text-center text-xs text-zinc-400 mt-8" data-edit>Say the word and I'll build any chapter in full — starting with Part 1: BigStar Culture.</p>
        </div>
      </Page>
    </PrintableDoc>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 3. INTERVIEW KIT — printable interview sheet + /100 scorecard (reusable)
// ════════════════════════════════════════════════════════════════════════════
function FillLine({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 shrink-0">{label}</span>
      <span className="flex-1 border-b-2 border-zinc-300 h-6" />
    </div>
  )
}
function QBlock({ q, why }: { q: string; why?: string }) {
  return (
    <div className="mb-4 break-inside-avoid">
      <p className="font-bold text-zinc-900" data-edit>{q}</p>
      {why && <p className="text-xs text-amber-700 mb-1" data-edit>Listen for: {why}</p>}
      <div className="border-b border-dashed border-zinc-300 h-5" />
      <div className="border-b border-dashed border-zinc-300 h-5" />
      <div className="mt-1 flex items-center gap-1 text-xs text-zinc-400">Score <span className="border border-zinc-300 rounded px-2">&nbsp;&nbsp;</span>/5</div>
    </div>
  )
}

export function InterviewKit() {
  return (
    <PrintableDoc storageKey="bsc_interview_kit_v3">
      <Page>
        <Cover eyebrow="Hire the right heart" title="BigStar Coach Interview Kit" subtitle="One sheet to interview, assess and score every candidate — the same way, every time." footer="Print one per candidate · BigStar Circus" />
        <div className="p-8 sm:p-10">
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <FillLine label="Candidate" />
            <FillLine label="Date" />
            <FillLine label="Role" />
            <FillLine label="Interviewer" />
          </div>

          <Section n="1" title="Warm-up & phone screen">
            <QBlock q="Why do you coach children?" why="A love of kids and their growth — not stage time." />
            <QBlock q="Tell me about a child you helped grow." why="Specific, warm, remembers the child by name." />
            <QBlock q="Do you hold a current Blue Card and First Aid? Real availability for weekday afternoons + Saturday mornings?" why="Cleared to start now; genuinely available." />
          </Section>

          <Section n="2" title="Face-to-face — coaching heart">
            <QBlock q="How would PARENTS describe you?" why="Warm, reliable, communicative." />
            <QBlock q="How would CHILDREN describe you?" why="Fun, kind, patient, safe." />
            <QBlock q="A child refuses to participate — what do you do?" why="Patience, choice, never force; makes it a game." />
            <QBlock q="Tell me about a coaching mistake you made." why="Owns it, learned from it, no blame." />
            <QBlock q="What excites you more — winning competitions, or helping children become confident?" why="⭐ THE key question. Confidence answer = hire. Trophy answer = pass." />
          </Section>

          <Section n="3" title="The scenario question">
            <div className="bg-[#D72027]/5 border border-[#D72027]/15 rounded-xl p-4 mb-2" data-edit>
              <p className="font-bold text-zinc-900 mb-1">"Walk me through this class:"</p>
              <p className="text-sm">20 children · it's raining (indoors, high energy) · one child has autism · one has ADHD · one is crying · one parent is watching · and a child has just hurt themselves.</p>
            </div>
            <p className="text-xs text-amber-700 mb-2" data-edit>This reveals their whole coaching philosophy: Do they go to the hurt child <em>first</em> (safety)? Do they keep the group engaged? Do they include the neurodiverse kids without singling them out? Do they stay calm with a parent watching? There's no perfect answer — you're watching how their instincts prioritise <strong>safety → children → calm → inclusion</strong>.</p>
            <div className="border-b border-dashed border-zinc-300 h-5" />
            <div className="border-b border-dashed border-zinc-300 h-5" />
            <div className="border-b border-dashed border-zinc-300 h-5" />
          </Section>

          <Section n="4" title="Practical assessment (20 min · ~10 children)">
            <p data-edit>Have them run a short session. You're assessing the <strong>coach</strong>, not circus tricks:</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
              {['Energy', 'Leadership', 'Safety', 'Communication', 'Connection', 'Confidence', 'Patience', 'Organisation', 'Fun', 'Movement knowledge'].map((x) => <div key={x} className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-2 text-center text-xs font-bold text-zinc-700">{x}</div>)}
            </div>
          </Section>

          <Section n="5" title="If it's going well — tell them about pay">
            <p data-edit>Once you like them, this is the moment to walk the candidate through how pay works and grows here:</p>
            <div className="my-2"><PayLadder /></div>
            <div className="mt-2"><EngagementCard /></div>
          </Section>

          {/* Scorecard page */}
          <div className="doc-page mt-8 -mx-8 sm:-mx-10 bg-gradient-to-b from-[#FFF9E6] to-white border-t-4 border-[#FFC107] px-8 sm:px-10 py-8">
            <h2 className="text-2xl font-black text-zinc-900 mb-1" data-edit>Coach Scorecard</h2>
            <p className="text-sm text-zinc-500 mb-4" data-edit>Score each out of 10. 70+ = strong hire · 55–69 = trial shift · under 55 = pass.</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-200">
                {[
                  ['Loves kids', 'The whole game. Low here = pass, no matter the skills.'],
                  ['Energy', 'Can they lift a room of tired kids?'],
                  ['Communication', 'Clear with kids AND parents.'],
                  ['Growth mindset', 'Coaches effort; "not yet" not "can\'t".'],
                  ['Reliability', 'Turns up early, every time.'],
                  ['Leadership', 'Commands a group with warmth.'],
                  ['Parent confidence', 'Would you trust them with your own child?'],
                  ['Child safety', 'Instincts go to safety first. Non-negotiable.'],
                  ['Movement knowledge', 'Body awareness, spotting, progressions.'],
                  ['Circus potential', 'Excited to learn silks/lyra/juggling.'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-2 pr-2"><div className="font-bold text-zinc-900" data-edit>{k}</div><div className="text-[11px] text-zinc-500" data-edit>{v}</div></td>
                    <td className="py-2 w-16 text-right"><span className="inline-block border-2 border-zinc-300 rounded-lg px-3 py-1 font-black text-zinc-400">/10</span></td>
                  </tr>
                ))}
                <tr className="bg-[#D72027]/5">
                  <td className="py-3 pr-2 font-black text-[#D72027] text-lg" data-edit>TOTAL</td>
                  <td className="py-3 text-right"><span className="inline-block border-2 border-[#D72027] rounded-lg px-3 py-1 font-black text-[#D72027]">/100</span></td>
                </tr>
              </tbody>
            </table>
            <div className="mt-5"><FillLine label="Decision (hire / trial / pass)" /></div>
            <div className="mt-3"><FillLine label="Notes" /></div>
          </div>
        </div>
      </Page>
    </PrintableDoc>
  )
}

// ── Onboarding: ABN / TFN / super links + printable details form ────────────
export function OnboardingKit() {
  const links = [
    { emoji: '🧾', title: 'Get a free ABN (contractors)', desc: 'Every coach paid as a contractor needs an Australian Business Number. It’s free and takes ~15 min.', href: 'https://register.business.gov.au/', cta: 'Apply for an ABN' },
    { emoji: '🔢', title: 'Get a Tax File Number (TFN)', desc: 'If a young trainee is engaged as an employee instead, they’ll need a TFN (also free).', href: 'https://www.ato.gov.au/individuals-and-families/tax-file-number/apply-for-a-tfn', cta: 'Apply for a TFN' },
    { emoji: '💰', title: 'Super — Standard Choice form', desc: 'The official ATO form to nominate a super fund. No fund yet? They can open one first, then fill this in.', href: 'https://www.ato.gov.au/forms-and-instructions/superannuation-standard-choice-form', cta: 'Open the super form' },
  ]
  return (
    <div className="space-y-4">
      <EngagementCard />
      <div className="grid sm:grid-cols-3 gap-3">
        {links.map((l) => (
          <div key={l.title} className="bg-white rounded-xl border border-zinc-200 p-4 flex flex-col">
            <div className="text-2xl mb-1">{l.emoji}</div>
            <div className="font-bold text-zinc-900 text-sm leading-tight">{l.title}</div>
            <p className="text-xs text-zinc-500 mt-1 flex-1">{l.desc}</p>
            <a href={l.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center justify-center bg-[#D72027] hover:bg-[#A0151B] text-white text-xs font-bold px-3 py-2 rounded-lg">{l.cta} →</a>
          </div>
        ))}
      </div>
      <SuperContractorForm />
    </div>
  )
}

// Printable form the accountant needs from every new contractor.
function FormField({ label }: { label: string }) {
  return (
    <div className="mb-3">
      <div className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1" data-edit>{label}</div>
      <div className="border-2 border-zinc-300 rounded-lg h-9" />
    </div>
  )
}
function SuperContractorForm() {
  return (
    <PrintableDoc storageKey="bsc_super_contractor_form_v1">
      <Page>
        <Cover eyebrow="For the accountant" title="New Contractor & Super Details" subtitle="Every new coach fills this in so we can pay you — and your super — every fortnight." footer="BigStar Circus · give to Rhett / accountant" />
        <div className="p-8 sm:p-10">
          <div className="mb-6"><EngagementCard compact /></div>

          <h2 className="text-lg font-black text-zinc-900 mb-3" data-edit>Your details</h2>
          <div className="grid sm:grid-cols-2 gap-x-6">
            <FormField label="Full name" />
            <FormField label="ABN" />
            <FormField label="Date of birth" />
            <FormField label="Phone number" />
            <FormField label="Email" />
            <FormField label="Address" />
          </div>

          <h2 className="text-lg font-black text-zinc-900 mt-5 mb-3" data-edit>Superannuation fund</h2>
          <div className="grid sm:grid-cols-2 gap-x-6">
            <FormField label="Name of super fund" />
            <FormField label="Member number" />
            <FormField label="Super fund ABN" />
            <FormField label="Super fund USI" />
          </div>

          <h2 className="text-lg font-black text-zinc-900 mt-5 mb-3" data-edit>Bank account (for pay)</h2>
          <div className="grid sm:grid-cols-3 gap-x-6">
            <FormField label="Account name" />
            <FormField label="BSB" />
            <FormField label="Account number" />
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-8">
            <div><div className="border-b-2 border-zinc-400 h-8" /><div className="text-xs text-zinc-500 mt-1">Signature</div></div>
            <div><div className="border-b-2 border-zinc-400 h-8" /><div className="text-xs text-zinc-500 mt-1">Date</div></div>
          </div>
          <p className="mt-6 text-xs text-zinc-400" data-edit>We use these details only to pay you and your superannuation. Kept confidential.</p>
        </div>
      </Page>
    </PrintableDoc>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 4. COACH AGREEMENT — Confidentiality · IP · Non-solicit · Restraint (DRAFT)
// ════════════════════════════════════════════════════════════════════════════
export function CoachAgreement() {
  return (
    <PrintableDoc storageKey="bsc_coach_agreement_v1">
      <Page>
        <Cover eyebrow="Protecting the BigStar system" title="BigStar Coach Confidentiality & Protection Agreement" subtitle="Confidentiality · Intellectual Property · Non-Solicitation · Restraint of Trade" footer="DRAFT — have a QLD lawyer review before signing" />
        <div className="p-8 sm:p-10">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-6 text-sm text-amber-900" data-edit>
            <p className="font-black mb-1">⚠️ Important — this is a starting draft, not legal advice</p>
            <p>I&apos;m not a lawyer. This gives you a strong, plain-English starting point built around Queensland law — but you <strong>must have a Queensland employment lawyer review and finalise it</strong> before Tiffany (or any coach) signs. A well-drafted agreement is worth the ~$500–$1,500 it costs. See the plain-English notes I&apos;ve written you in the chat for how each part works and what to set the blanks to.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <FillLine label="Coach name" />
            <FillLine label="ABN (contractor)" />
            <FillLine label="Start date" />
            <FillLine label="Studio" />
          </div>
          <div className="mb-6"><EngagementCard compact /></div>

          <Section n="1" title="Confidential Information & Trade Secrets">
            <p>The Coach acknowledges that BigStar Circus&apos;s methods, training manuals, the BigStar Coach Academy, lesson plans and progressions, the Star Rewards system, class formats, pricing, marketing systems, the BigStar CRM, and all student and family information are <strong>confidential and the property of BigStar Circus</strong>.</p>
            <p>The Coach will not, during or after their engagement, use or disclose this confidential information for any purpose other than performing their role for BigStar Circus.</p>
          </Section>

          <Section n="2" title="Intellectual Property">
            <p>All materials, lesson content, choreography, videos, photos and systems created by the Coach in the course of working for BigStar Circus are <strong>owned by BigStar Circus</strong>. The Coach assigns all such intellectual property to BigStar Circus.</p>
          </Section>

          <Section n="3" title="Non-Solicitation">
            <p>For a period of <strong>[ 12 ] months</strong> after their engagement ends, the Coach will not directly or indirectly:</p>
            <ul className="list-none space-y-1 pl-1">
              <li>• solicit, entice away or teach any BigStar Circus student or family they came to know through BigStar;</li>
              <li>• solicit or entice away any BigStar Circus coach or staff member.</li>
            </ul>
            <p className="text-xs text-zinc-500">(This protects your client relationships and goodwill — the interest Queensland courts most reliably uphold.)</p>
          </Section>

          <Section n="4" title="Restraint of Trade">
            <p>To protect BigStar Circus&apos;s legitimate business interests, for a period after the engagement ends the Coach will not establish, own, or work for a competing children&apos;s circus / movement business within the following area. The restraint applies to whichever of the following is found reasonable (a &quot;cascading&quot; ladder):</p>
            <div className="grid sm:grid-cols-3 gap-2 my-2 text-center text-sm">
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2"><div className="font-black text-zinc-900">[ 10 ] km</div><div className="text-xs text-zinc-500">for [ 12 ] months</div></div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2"><div className="font-black text-zinc-900">[ 5 ] km</div><div className="text-xs text-zinc-500">for [ 6 ] months</div></div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2"><div className="font-black text-zinc-900">[ 2 ] km</div><div className="text-xs text-zinc-500">for [ 3 ] months</div></div>
            </div>
            <p className="text-xs text-zinc-500">(Queensland courts won&apos;t &quot;read down&quot; an over-broad restraint — so a ladder of reasonable options gives a court a valid one to enforce. Keep the radius and time modest and genuinely tied to protecting the studio.)</p>
          </Section>

          <Section n="5" title="Return of Materials">
            <p>On ending their engagement, the Coach will return or delete all BigStar Circus materials, manuals, keys, uniforms and access to the CRM and any BigStar accounts.</p>
          </Section>

          <Section n="6" title="Acknowledgement">
            <p>The Coach acknowledges that these terms are reasonable and necessary to protect BigStar Circus, and that BigStar has invested significant time and cost in their training. The Coach has had the opportunity to seek independent legal advice.</p>
          </Section>

          <div className="doc-page mt-8 -mx-8 sm:-mx-10 bg-gradient-to-b from-[#FFF9E6] to-white border-t-4 border-[#FFC107] px-8 sm:px-10 py-8">
            <div className="grid sm:grid-cols-2 gap-8">
              <div><div className="border-b-2 border-zinc-400 h-8" /><div className="text-xs text-zinc-500 mt-1">Coach signature</div></div>
              <div><div className="border-b-2 border-zinc-400 h-8" /><div className="text-xs text-zinc-500 mt-1">Date</div></div>
              <div><div className="border-b-2 border-zinc-400 h-8" /><div className="text-xs text-zinc-500 mt-1">For BigStar Circus (Rhett Morrow)</div></div>
              <div><div className="border-b-2 border-zinc-400 h-8" /><div className="text-xs text-zinc-500 mt-1">Date</div></div>
            </div>
          </div>
        </div>
      </Page>
    </PrintableDoc>
  )
}

const TOC: Array<{ n: number; title: string; items: Array<{ t: string; b: string }> }> = [
  { n: 1, title: 'About BigStar & Coach DNA', items: [
    { t: 'Why BigStar exists — children are the mission', b: 'BigStar is not trying to create the world’s best circus performers. We exist to build confident, creative and capable young people, and circus is simply the most joyful tool we’ve found to do it. Every coach must understand this before they teach a single skill: the child is the mission, the trick is just the vehicle.' },
    { t: 'The 9 traits of a BigStar coach', b: 'Our ideal coach loves children, brings high energy, is warm and approachable, is confident demonstrating movement, loves learning, is a team player, communicates brilliantly, is deeply patient, and is comfortable with technology. Skills can be taught — these traits are why we hire.' },
    { t: 'Children first, circus second', b: 'When a coaching decision is unclear, this rule breaks the tie. A quieter class where every child felt included beats a flashy class where two kids shone and five felt lost. We measure a class by how the children left feeling, not by what they achieved.' },
    { t: 'Culture & values that must scale', b: 'As BigStar grows to new locations, the culture must arrive intact: no egos, support your teammates, celebrate wins, and leave every child better than you found them. This manual exists so a coach in our fifth studio delivers the same magic as our first.' },
  ] },
  { n: 2, title: 'Who We Recruit', items: [
    { t: 'Our target backgrounds', b: 'We hunt for movement educators, not performers: gymnastics, rhythmic gymnastics, cheer, acrobatics, trampoline and parkour coaches first; acro-dance and dance teachers with acro experience, and ninja coaches close behind. They already have body awareness, safe progressions and the ability to manage a group of children.' },
    { t: 'Why we don’t recruit performers first', b: 'Performing and coaching are different passions. A brilliant aerialist may crave the stage, not a room of 5-year-olds. We welcome circus performers, but they are not our primary target — we recruit people whose joy is a child’s progress. BigStar will teach the circus.' },
    { t: 'Where to find them', b: 'Gymnastics and dance studios, cheer gyms, PE and university movement courses, and local performing-arts networks. Word of mouth from current coaches is gold. Post where movement educators already gather, not just generic job boards.' },
    { t: 'The BigStar SEEK / social ad system', b: 'Our ready-to-use ad (in the Hiring Kit) sells the career path, not just the shift: “you don’t need circus experience — we’ll teach the magic; what we can’t teach is the coaching-first heart.” It filters for attitude and repels stage-first applicants.' },
  ] },
  { n: 3, title: 'The Interview System', items: [
    { t: 'Phone screen', b: 'A 10-minute call to check the essentials before you spend time in person: do they light up talking about children, do they hold (or can quickly get) a Blue Card and First Aid, and are they genuinely available for your class times? Score warmth and energy even over the phone.' },
    { t: 'Face-to-face interview', b: 'The heart of the process. You’re reading their coaching philosophy through their stories — how they describe children, how they handle a child refusing to join in, and what excites them more: winning, or a child’s confidence. Use the Interview Kit sheet and score as you go.' },
    { t: 'Practical coaching assessment', b: 'A 20-minute session with ~10 children. You are assessing the coach, not circus tricks — energy, leadership, safety, communication, connection, confidence, patience, organisation, fun and movement knowledge. A great gymnastics coach will shine here even with zero circus skills.' },
    { t: 'Reference checks', b: 'Call two references and ask the questions that matter: were they reliable, how were they with the children, and would you hire them again? Listen for hesitation as much as praise.' },
    { t: 'Trial shift', b: 'A paid trial in a real class before any commitment. It shows you punctuality, how they take direction, how they fit the team, and — most importantly — how the children respond to them.' },
    { t: 'Probation review', b: 'A structured check-in at the end of the probation period against the same scorecard, with clear feedback and a genuine two-way conversation about fit, growth and next steps.' },
  ] },
  { n: 4, title: 'Interview Questions', items: [
    { t: 'The core question bank', b: 'Why do you coach children? Describe a child you helped grow. How would parents describe you? How would children describe you? Tell me about a coaching mistake. Each answer reveals whether their focus is the child or themselves.' },
    { t: 'The rainy-day scenario question', b: '“20 children, it’s raining, one has autism, one has ADHD, one is crying, a parent is watching, and a child has just hurt themselves — walk me through it.” There’s no perfect answer; you’re watching whether their instincts prioritise safety, then children, then calm, then inclusion.' },
    { t: 'Reading a candidate’s coaching philosophy', b: 'The tell-tale question: “What excites you more — winning competitions, or helping children become confident?” If they light up about the children’s progress, hire. If it’s about trophies or their own stage time, pass — no matter how skilled they are.' },
    { t: 'Red & green flags', b: 'Green: names specific children, celebrates effort, calm under pressure, curious to learn. Red: talks only about themselves, impatient, vague about child safety, sees coaching as a gap-filler between performances.' },
  ] },
  { n: 5, title: 'The Coach Scorecard', items: [
    { t: 'The printable /100 scorecard', b: 'Ten categories scored out of ten — Loves Kids, Energy, Communication, Growth Mindset, Reliability, Leadership, Parent Confidence, Child Safety, Movement Knowledge and Circus Potential — for one clear, comparable number per candidate. The ready sheet lives in the Interview Kit tab.' },
    { t: 'How to interpret every score', b: 'Loves Kids and Child Safety are non-negotiable — a low score there is an automatic pass regardless of the total. Circus Potential can be low if everything else is high (we teach the circus). Movement Knowledge and Communication predict how fast they’ll be class-ready.' },
    { t: 'The hire / no-hire threshold', b: '70+ = strong hire. 55–69 = worth a trial shift. Under 55 = pass. Always sanity-check the number against your gut on the two non-negotiables before you decide.' },
  ] },
  { n: 6, title: 'Academy Week 1 — Culture', items: [
    { t: 'Mission, vision, values', b: 'Day one grounds every new coach in why we exist and the four values that never bend. Objective: the coach can explain, in their own words, why the child comes before the trick. Assessment: they retell the BigStar mission to a teammate.' },
    { t: 'Child safety & Blue Card', b: 'Working-with-Children obligations, recognising and reporting concerns, safe physical contact and spotting boundaries, and supervision ratios. Objective: the coach knows exactly what to do and who to tell if a child safety concern arises. Checklist: Blue Card sighted and recorded.' },
    { t: 'Communication & professionalism', b: 'How we speak to children (clear, warm, positive) and to parents (professional, reassuring). Phones away, uniform on, arrive early. Objective: the coach models the BigStar tone in a role-play with a “nervous parent”.' },
    { t: 'Customer service & expectations', b: 'The ten BigStar expectations, the parent-pickup win, and handling a complaint calmly. Objective: the coach can greet, reassure and share a child’s win with a parent. Checklist: completes a mock pickup conversation.' },
  ] },
  { n: 7, title: 'Academy Week 2 — Circus Foundations', items: [
    { t: 'Juggling, flower sticks, poi, hoops, plate spinning', b: 'The core prop skills, taught as teachable progressions — not performance level, but confident enough to demonstrate and break down for a child. Objective: coach teaches a 3-step progression for one prop. Assessment: leads a 5-minute prop station.' },
    { t: 'Games & class structure', b: 'The BigStar class shape — welcome, warm-up game, skill blocks, challenge, celebration — and a bank of high-energy circus games. Objective: coach runs an energising warm-up game that lands the room. Checklist: can name the class structure from memory.' },
    { t: 'Equipment & set-up', b: 'Safe set-up and pack-down, equipment checks, and matching apparatus to age and ability. Objective: coach sets up and safety-checks a station unaided. Checklist: completes the pre-class equipment check.' },
  ] },
  { n: 8, title: 'Academy Week 3 — Movement', items: [
    { t: 'Forward rolls, cartwheels, handstands', b: 'Foundational gymnastic movements broken into child-friendly progressions, with common errors and how to fix them. Objective: coach teaches a cartwheel in safe, staged steps. Assessment: demonstrates and coaches each of the three skills.' },
    { t: 'Spotting & progressions', b: 'Safe, confident spotting technique and how to move a child up a progression only when they’re ready. Objective: coach spots a peer through a skill with correct hand placement. Checklist: signed off on spotting competency.' },
    { t: 'Conditioning', b: 'Age-appropriate strength and flexibility woven into fun, plus why we never over-train young bodies. Objective: coach runs a playful conditioning game. Checklist: can list conditioning do’s and don’ts for children.' },
    { t: 'Safety & risk management', b: 'Dynamic risk assessment, matting, injury response and our incident-report process (the big red button on the roll). Objective: coach identifies three risks in a set-up and mitigates them. Checklist: can complete an incident report correctly.' },
  ] },
  { n: 9, title: 'Academy Week 4 — Teaching', items: [
    { t: 'Behaviour management', b: 'The BigStar way with behaviour — redirect, include, never shame — and tools for the child who won’t join in. Objective: coach turns a “refusing” child into a willing participant in a role-play. Assessment: handles a staged behaviour scenario.' },
    { t: 'Parent communication', b: 'Building trust at drop-off and pickup, sharing wins, and handling a worried or unhappy parent with calm and care. Objective: coach delivers a pickup win and fields a tricky question. Checklist: mock complaint handled to standard.' },
    { t: 'NDIS & inclusion', b: 'Coaching neurodiverse and disabled children brilliantly — adapting activities, sensory awareness, and making every child feel they belong. Objective: coach adapts one activity three ways for different needs. Checklist: can describe an inclusive class.' },
    { t: 'Class management & shadow coaching', b: 'Running the room end-to-end while shadowing a lead coach, then leading with support. Objective: coach co-leads a full class. Checklist: shadow hours logged in the trainee logbook.' },
    { t: 'Final assessment & graduation', b: 'A full solo class observed against the competency checklist, then graduation into the coaching team and the pay pathway. Objective: coach passes the final observed class. Milestone: signs the BigStar Promise.' },
  ] },
  { n: 10, title: 'The BigStar Way', items: [
    { t: 'How we greet children & parents', b: 'Every child greeted by name with genuine delight; every parent met with warmth and professionalism. The first 30 seconds set the tone for the whole class — we never phone them in.' },
    { t: 'How we celebrate & give feedback', b: 'We celebrate effort loudly and specifically (“I saw you try that three times — that’s a champion”), and give feedback as a next step, never a criticism. Stars are earned for trying, not just winning.' },
    { t: 'How we teach confidence', b: 'We stack small, guaranteed wins so every child tastes success each class, and we replace “I can’t” with “I can’t yet.” Confidence is the product; circus is the packaging.' },
    { t: 'How we handle behaviour & keep children safe', b: 'We include rather than exclude, stay calm and consistent, and put safety first, always. A BigStar room is one where every child feels safe enough to be brave.' },
  ] },
]
