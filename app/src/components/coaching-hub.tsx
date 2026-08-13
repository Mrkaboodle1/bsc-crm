'use client'

import { useState, useEffect } from 'react'
import { GraduationCap, DollarSign, UserPlus, Printer, Check, AlertTriangle, PlayCircle, TrendingUp, NotebookPen, BookHeart, BookMarked, ClipboardCheck, ShieldCheck } from 'lucide-react'
import { ACADEMY, PAY_TIERS, INCENTIVES, COMPLIANCE_NOTE, PERFECT_COACH, KEY_INTERVIEW_QUESTION, COACH_VIDEOS, TRAINEE_PATHWAY, ZERO_TALENT } from '@/lib/coaching-hub'
import { WelcomePack, AcademyManual, CoachAgreement, OnboardingKit, EngagementCard, NewCoachLink } from '@/components/coach-manuals'
import { InterviewLog } from '@/components/interview-log'
import { WizardPagesEditor } from '@/components/wizard-pages-editor'

type Tab = 'academy' | 'pathway' | 'videos' | 'pay' | 'hiring' | 'interview' | 'welcome' | 'agreement' | 'manual'

export function CoachingHub() {
  const [tab, setTab] = useState<Tab>('academy')
  const tabs: { id: Tab; label: string; Icon: typeof GraduationCap }[] = [
    { id: 'academy', label: 'Coach Academy', Icon: GraduationCap },
    { id: 'pathway', label: 'Trainee Pathway', Icon: TrendingUp },
    { id: 'videos', label: 'Video Course', Icon: PlayCircle },
    { id: 'pay', label: 'Pay & Progression', Icon: DollarSign },
    { id: 'hiring', label: 'Hiring Kit', Icon: UserPlus },
    { id: 'interview', label: 'Interview Kit', Icon: ClipboardCheck },
    { id: 'welcome', label: 'Welcome Pack', Icon: BookHeart },
    { id: 'agreement', label: 'Coach Agreement', Icon: ShieldCheck },
    { id: 'manual', label: 'Academy Manual', Icon: BookMarked },
  ]
  return (
    <div>
      <style>{`@media print { .no-print{display:none!important} }`}</style>
      <div className="flex items-center justify-between gap-3 mb-5 no-print flex-wrap">
        <div className="flex gap-1.5 bg-zinc-100 p-1 rounded-xl">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg ${tab === t.id ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'}`}><t.Icon size={15} /> {t.label}</button>
          ))}
        </div>
        {tab !== 'welcome' && tab !== 'manual' && tab !== 'interview' && tab !== 'agreement' && (
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50"><Printer size={15} /> Print this tab</button>
        )}
      </div>

      {tab === 'academy' && <Academy />}
      {tab === 'pathway' && <Pathway />}
      {tab === 'videos' && <Videos />}
      {tab === 'pay' && <Pay />}
      {tab === 'hiring' && <Hiring />}
      {tab === 'interview' && <InterviewLog />}
      {tab === 'welcome' && <><NewCoachLink /><WizardPagesEditor /><WelcomePack /></>}
      {tab === 'agreement' && <CoachAgreement />}
      {tab === 'manual' && <AcademyManual />}
    </div>
  )
}

function Academy() {
  return (
    <div className="space-y-4">
      <Banner>The BSC Coach Academy — every coach works through these. Print it, or read on the studio tablet.</Banner>
      {ACADEMY.map((m) => (
        <div key={m.n} className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#D72027] text-white font-extrabold flex items-center justify-center shrink-0">{m.n}</span>
            <div className="min-w-0">
              <h3 className="font-extrabold text-zinc-900">{m.title}</h3>
              <p className="text-sm text-zinc-500">{m.summary}</p>
              <ul className="mt-3 space-y-1.5">
                {m.points.map((p, i) => <li key={i} className="flex items-start gap-2 text-sm text-zinc-700"><Check size={15} className="text-emerald-500 mt-0.5 shrink-0" /> {p}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// The trainee lesson-plan worksheet — a print-and-write form every trainee
// fills in before the class they're helping with. Lives in public storage so
// any admin can grab it from any machine without hunting through Downloads.
const LESSON_PLAN_URL = 'https://dbpbfcxhbaeyoyoyllfp.supabase.co/storage/v1/object/public/marketing/coach-academy/BigStar-Trainee-Coach-Lesson-Plan.pdf'

export function TraineeLessonPlan() {
  const SECTIONS = [
    'Team meeting — quick chat before class', 'Class control & coach authority', 'Participant needs & safety',
    'Time management', 'Plan ahead', 'Warm-up game', 'Stretches & body preparation',
    'Tumbling', 'Circus / manipulation', 'Aerial', 'Finish the class', 'Coach reflection + supervisor feedback',
  ]
  return (
    <div className="bg-white rounded-xl border-2 border-[#D72027]/25 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-extrabold text-zinc-900 mb-1">📋 Trainee Coach Lesson Plan</h3>
          <p className="text-sm text-zinc-500 mb-1">
            The worksheet every trainee fills in <b>before</b> the class they&apos;re helping with — 5 pages, 12 sections,
            finishing with their own reflection and the supervising coach&apos;s feedback.
          </p>
          <p className="text-xs text-zinc-400">Print it, hand it over, and collect it signed. Keep completed sheets with the trainee&apos;s logbook.</p>
        </div>
        <div className="flex gap-2 shrink-0 no-print">
          <a href={LESSON_PLAN_URL} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-4 py-2.5 rounded-lg no-underline">
            <Printer size={15} /> Open &amp; print
          </a>
          <a href={LESSON_PLAN_URL} download="BigStar-Trainee-Coach-Lesson-Plan.pdf"
            className="inline-flex items-center gap-1.5 bg-white border border-zinc-300 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg no-underline hover:bg-zinc-50">
            ⬇ Download
          </a>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 mt-3 pt-3 border-t border-zinc-100">
        {SECTIONS.map((s, i) => (
          <div key={s} className="flex gap-1.5 text-[12px] text-zinc-600">
            <span className="font-black text-[#D72027] shrink-0">{i + 1}.</span><span>{s}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-400 mt-3">
        Print-and-write worksheet — trainees fill it in by hand. Want a version they can type into on a tablet? Ask Jacky and I&apos;ll build it.
      </p>
    </div>
  )
}

function Pathway() {
  return (
    <div className="space-y-4">
      <Banner>The trainee journey — Trainee Trainer → Junior → Assistant → Trainer. Each trainee keeps a logbook of hours.</Banner>
      <a href="/coaching/logbook" className="inline-flex items-center gap-2 bg-zinc-900 text-white font-semibold text-sm px-4 py-2 rounded-lg"><NotebookPen size={15} /> Open trainee logbooks</a>

      <TraineeLessonPlan />

      <div className="bg-white rounded-xl border-2 border-emerald-200 p-5">
        <h3 className="font-extrabold text-zinc-900 mb-1">🚀 Onboarding — before a coach&apos;s first pay</h3>
        <p className="text-sm text-zinc-500 mb-3">Everything a new coach or trainee needs to get set up and paid — plus the printable form your accountant needs.</p>
        <OnboardingKit />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {TRAINEE_PATHWAY.map((lvl, i) => (
          <div key={lvl.key} className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-zinc-900"><span className="text-zinc-400">{i + 1}.</span> {lvl.title}</h3>
              <span className="text-sm font-extrabold text-[#D72027]">{lvl.pay}</span>
            </div>
            <ul className="mt-2 space-y-1">{lvl.duties.map((d, x) => <li key={x} className="flex items-start gap-2 text-sm text-zinc-700"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> {d}</li>)}</ul>
            {lvl.note && <p className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2">⚠ {lvl.note}</p>}
          </div>
        ))}
      </div>
      <div className="bg-zinc-950 text-white rounded-xl p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">9 things that require zero talent</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ZERO_TALENT.map((t, i) => <div key={i} className="text-sm font-semibold flex items-center gap-2"><span className="text-amber-400">{i + 1}.</span> {t}</div>)}
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">Pay figures are a guide — confirm each meets the Fitness Award junior minimum for the trainee&apos;s age, and that any &quot;unpaid&quot; stage is genuine observation only (not real work). Your accountant signs off.</p>
      </div>
    </div>
  )
}

function Videos() {
  return (
    <div className="space-y-4">
      <Banner>Coach onboarding videos — recorded by Rhett. New coaches watch these on day one. Filming in progress.</Banner>
      <div className="grid sm:grid-cols-2 gap-3">
        {COACH_VIDEOS.map((v) => (
          <div key={v.n} className="bg-white rounded-xl border border-zinc-200 p-4 flex gap-3 items-start">
            <div className="relative w-24 h-16 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
              <PlayCircle size={26} className="text-white/60" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400">EP {v.n} · {v.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Coming soon</span>
              </div>
              <div className="text-sm font-bold text-zinc-900 mt-0.5 leading-tight">{v.title}</div>
              <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-400">Scripts for each video are ready in the assistant folder (<code className="bg-zinc-100 px-1 rounded">coach-training/video-scripts.md</code>).</p>
    </div>
  )
}

function Pay() {
  return (
    <div className="space-y-4">
      <Banner>Our coach pay ladder — clear steps, real rises. Coaches earn more as they grow.</Banner>
      <EngagementCard />
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
            <tr><th className="px-4 py-3">Stage</th><th className="px-4 py-3 hidden sm:table-cell">Who</th><th className="px-4 py-3">Award</th><th className="px-4 py-3 text-right">Rate</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {PAY_TIERS.map((t) => (
              <tr key={t.stage}>
                <td className="px-4 py-3 font-bold text-zinc-900">{t.stage}<div className="text-xs text-zinc-400 font-normal sm:hidden mt-0.5">{t.who}</div></td>
                <td className="px-4 py-3 text-zinc-600 hidden sm:table-cell">{t.who}</td>
                <td className="px-4 py-3 text-zinc-600">{t.level}</td>
                <td className="px-4 py-3 text-right font-extrabold text-[#D72027]">{t.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h3 className="font-extrabold text-zinc-900 mb-3">What makes a coach climb</h3>
        <ul className="space-y-2">{INCENTIVES.map((i, x) => <li key={x} className="text-sm text-zinc-700">{i}</li>)}</ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">{COMPLIANCE_NOTE}</p>
      </div>
    </div>
  )
}

const SEEK_AD = `Circus & Gymnastics Coach — Grow into our next Head Coach (Gold Coast)

Location: Molendinar, Gold Coast QLD
Work type: Casual / Part-time (with a clear path to more hours & higher pay)
Pay: $30–$40+ /hour (based on experience & skills — grows as you do)

ABOUT BIG STAR CIRCUS
Big Star Circus is the Gold Coast's home of circus arts for kids — aerial, acrobatics, juggling, gymnastics and performance. We're not a drop-in gym; we build young performers, confidence and community, and we're growing fast.

We're looking for a coach who wants a career, not a side-gig — someone we can train up and invest in to eventually lead our coaching team.

WHO WE'RE LOOKING FOR
You're a gymnastics, cheer, acro or dance coach who already has the foundations — body awareness, tumbling, how to run a safe, fun session — and you genuinely love working with kids.

You don't need circus experience. We'll teach you the circus magic — aerial silks, lyra, juggling, clowning. What we can't teach is the right attitude: patience, reliability, structure, and a coaching-first heart.

You'll thrive here if you:
- Hold (or can get) a Blue Card and First Aid
- Have coaching experience with children (gymnastics / cheer / acro / dance / PE)
- Are reliable, warm, and brilliant with energetic and neurodiverse kids
- Want to learn new skills and grow — and stick around long-term

This isn't for you if coaching is just something you do between performances. Our priority is the kids in the room.

WHAT YOU'LL DO
- Coach circus & gymnastics classes for kids (ages 5–16)
- Shadow our head coach, then progress to leading your own classes
- Learn aerial, juggling and performance skills (paid training)
- Help run our Star Rewards program and end-of-term shows

WHAT WE OFFER
- A real career path — Trainee → Coach → Lead Coach → Head Coach, with pay rises at every step
- Paid up-skilling — every new circus discipline you master earns more
- A supportive, fun team and a genuinely special workplace
- Flexibility around your schedule

HOW THIS ROLE WORKS (ENGAGEMENT & PAY)
- You'll be engaged as an independent contractor — you'll need an ABN (Australian Business Number) and you'll send us a simple invoice for the hours you coach. (Don't have an ABN yet? It's free and we'll help you set one up.)
- We process your pay regularly, like clockwork — you're not chasing us each week.
- We pay your superannuation on top of your hourly rate. Looking after your super matters to us, even as a contractor.
- This keeps things flexible and simple for you, while you still get paid reliably and have your super taken care of.

HOW TO APPLY
Send your resume + a few lines on why coaching kids is for you.
Questions? Call the studio on 0489 188 179 or email admin@bigstarcircus.com.au.

Big Star Circus is committed to child safety. The successful applicant must hold a valid Working with Children (Blue) Card.`

const SEEK_KEY = 'bsc_seek_ad'
function SeekAdBox() {
  const [text, setText] = useState(SEEK_AD)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => { try { const s = localStorage.getItem(SEEK_KEY); if (s) setText(s) } catch { /* ignore */ } }, [])
  const save = () => { try { localStorage.setItem(SEEK_KEY, text) } catch { /* ignore */ }; setSaved(true); setTimeout(() => setSaved(false), 1800) }
  const reset = () => { setText(SEEK_AD); try { localStorage.removeItem(SEEK_KEY) } catch { /* ignore */ } }
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h3 className="font-extrabold text-zinc-900">📋 SEEK job ad — edit &amp; copy</h3>
        <div className="flex items-center gap-2">
          <button onClick={save} className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold px-3 py-2 rounded-lg">{saved ? <><Check size={15} /> Saved</> : 'Save'}</button>
          <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }} className="inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white text-sm font-semibold px-4 py-2 rounded-lg">{copied ? <><Check size={15} /> Copied!</> : 'Copy ad'}</button>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mb-3">Edit the wording (e.g. the pay range), hit <strong>Save</strong> to remember your version, then <strong>Copy ad</strong> to paste it into SEEK / Facebook / Indeed. <button onClick={reset} className="text-[#D72027] font-semibold underline">Reset to default</button></p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-[13px] leading-relaxed text-zinc-800 whitespace-pre-wrap font-sans focus:outline-none focus:border-zinc-900"
      />
    </div>
  )
}

function Hiring() {
  return (
    <div className="space-y-4">
      <Banner>Everything to hire your next coach — your <strong>copy-paste SEEK ad</strong> is right below, plus your interview question, who-to-hire guide and red flags.</Banner>

      <SeekAdBox />

      <div className="bg-zinc-950 text-white rounded-xl p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">The one interview question that matters</div>
        <p className="text-xl font-extrabold">“{KEY_INTERVIEW_QUESTION}”</p>
        <p className="text-sm text-zinc-400 mt-1">If they light up about the kids’ progress — hire. If it’s about their stage time — pass.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Hire for these (already have)" items={PERFECT_COACH.haveAlready} tone="emerald" />
        <Card title="We train these (don’t hire for)" items={PERFECT_COACH.weTrain} tone="blue" />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h3 className="font-extrabold text-zinc-900 mb-2">Our strategy</h3>
        <p className="text-sm text-zinc-700">{PERFECT_COACH.strategy}</p>
      </div>

      <div className="bg-white rounded-xl border border-red-200 p-5">
        <h3 className="font-extrabold text-red-700 mb-3">🚩 Do not hire</h3>
        <ul className="space-y-1.5">{PERFECT_COACH.redFlags.map((r, i) => <li key={i} className="text-sm text-zinc-700">• {r}</li>)}</ul>
      </div>
    </div>
  )
}

function Card({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'blue' }) {
  const c = tone === 'emerald' ? 'text-emerald-700' : 'text-blue-700'
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <h3 className={`font-extrabold mb-3 ${c}`}>{title}</h3>
      <ul className="space-y-1.5">{items.map((i, x) => <li key={x} className="flex items-start gap-2 text-sm text-zinc-700"><Check size={15} className={`${c} mt-0.5 shrink-0`} /> {i}</li>)}</ul>
    </div>
  )
}
function Banner({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#D72027]/5 border border-[#D72027]/15 rounded-xl px-4 py-3 text-sm text-zinc-700">{children}</div>
}
