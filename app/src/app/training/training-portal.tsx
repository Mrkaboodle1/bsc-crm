'use client'

// Training portal — hero, module list, quick-start checklist, submit ticket.
// Jacky speaks each module via the browser's SpeechSynthesis API. The cover
// art for each module is generated on-demand via the existing /api/ai-image
// proxy (Pollinations.ai) so we get free, varied illustrations.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { TrainingModule } from './modules'
import { submitSupportTicket } from './actions'

const PROGRESS_KEY = 'bsc-training-progress-v1'

type Progress = {
  completed: string[]
  startedAt: string | null
}

function loadProgress(): Progress {
  if (typeof window === 'undefined') return { completed: [], startedAt: null }
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (raw) return JSON.parse(raw) as Progress
  } catch { /* ignore */ }
  return { completed: [], startedAt: null }
}

function saveProgress(p: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

export function TrainingPortal({
  modules,
  userName,
}: {
  modules: TrainingModule[]
  userName: string | null
}) {
  const [progress, setProgress] = useState<Progress>({ completed: [], startedAt: null })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [ticketOpen, setTicketOpen] = useState(false)

  useEffect(() => {
    setProgress(loadProgress())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) saveProgress(progress)
  }, [progress, mounted])

  function toggleComplete(id: string) {
    setProgress((p) => {
      const set = new Set(p.completed)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...p, completed: [...set], startedAt: p.startedAt ?? new Date().toISOString() }
    })
  }

  const completedCount = useMemo(() => progress.completed.length, [progress])
  const pct = Math.round((completedCount / modules.length) * 100)

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-[#D72027] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 relative">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, #FFC107 0%, transparent 25%), radial-gradient(circle at 80% 70%, #D72027 0%, transparent 30%)',
        }} />
        <div className="relative p-8 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-1 flex justify-center">
            <JackyAvatar size={180} />
          </div>
          <div className="md:col-span-2 text-white">
            <div className="text-xs uppercase tracking-widest text-amber-300 font-extrabold mb-2">
              Welcome to the BSC CRM Support Portal
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">
              Hey {userName ?? 'there'} 🎪 I&apos;m Jacky. Let me show you around.
            </h2>
            <p className="text-zinc-300 mb-4 leading-relaxed">
              Eleven short modules. Each one has a written walkthrough you can read, an &ldquo;Jacky reads it to you&rdquo; button, and a Try It link that drops you straight into the feature.
              No video to buffer. No course to enrol in. Take what you need, when you need it.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href="#module-1"
                onClick={() => {
                  if (!progress.startedAt) setProgress((p) => ({ ...p, startedAt: new Date().toISOString() }))
                }}
                className="bg-gradient-to-r from-[#FFC107] to-amber-400 text-zinc-900 font-extrabold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-lg"
              >
                ▶ Start Training
              </a>
              <button
                onClick={() => setTicketOpen(true)}
                className="bg-zinc-800 border-2 border-zinc-700 text-white font-extrabold text-sm px-5 py-3 rounded-xl hover:bg-zinc-700"
              >
                🎫 Submit Ticket
              </button>
              <div className="ml-auto text-xs">
                <div className="text-amber-300 font-extrabold">{completedCount} / {modules.length} done · {pct}%</div>
                <div className="w-32 h-1.5 bg-white/20 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FFC107] to-amber-300 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start checklist */}
      <QuickStart progress={progress} modules={modules} onToggle={toggleComplete} />

      {/* Modules */}
      <div className="space-y-4">
        {modules.map((m) => (
          <ModuleCard
            key={m.id}
            module={m}
            done={progress.completed.includes(m.id)}
            active={activeId === m.id}
            onToggleDone={() => toggleComplete(m.id)}
            onSpeakStateChange={(speaking) => setActiveId(speaking ? m.id : null)}
          />
        ))}
      </div>

      {/* Footer support */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 p-6 text-center">
        <div className="text-4xl mb-2">🆘</div>
        <h3 className="text-lg font-extrabold text-zinc-900 mb-1">Still stuck?</h3>
        <p className="text-sm text-zinc-600 mb-4">
          Ask Jacky in chat, submit a ticket, or email Rhett at <a href="mailto:admin@bigstarcircus.com.au" className="font-bold text-[#D72027] hover:underline">admin@bigstarcircus.com.au</a>.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <a href="/jacky" className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg">
            🎪 Ask Jacky
          </a>
          <button onClick={() => setTicketOpen(true)} className="bg-zinc-900 text-white font-extrabold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-800">
            🎫 Submit Ticket
          </button>
        </div>
      </div>

      {ticketOpen && <TicketModal onClose={() => setTicketOpen(false)} userName={userName} />}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Jacky mascot — a CSS+SVG character. No external image needed.
// ────────────────────────────────────────────────────────────────────

// The Jacky portrait — one master image baked into /public, used consistently
// across the hero, module cards, and as the brand avatar everywhere. Pre-
// fetched via Pollinations.ai with a fixed seed so it never changes
// between visits. To swap her: replace /public/jacky-avatar.png.
function JackyAvatar({ size = 120, ringless = false }: { size?: number; ringless?: boolean }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {!ringless && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D72027] to-amber-500 blur-2xl opacity-50" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/jacky-avatar.png"
        alt="Jacky — your BSC AI admin"
        width={size}
        height={size}
        className={`relative rounded-full object-cover border-4 border-white shadow-2xl ${ringless ? '' : 'ring-4 ring-amber-300/40'}`}
        style={{ width: size, height: size }}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Quick Start checklist
// ────────────────────────────────────────────────────────────────────

function QuickStart({
  progress,
  modules,
  onToggle,
}: {
  progress: Progress
  modules: TrainingModule[]
  onToggle: (id: string) => void
}) {
  const items = modules.slice(0, 6) // first 6 = quick start essentials
  return (
    <section className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-extrabold text-zinc-900">Quick Start checklist</h3>
        <span className="text-xs text-zinc-500">
          {items.filter((m) => progress.completed.includes(m.id)).length} / {items.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((m) => {
          const done = progress.completed.includes(m.id)
          return (
            <li key={m.id}>
              <button
                onClick={() => onToggle(m.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 text-left"
              >
                <span className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${done ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-zinc-300'}`}>
                  {done && '✓'}
                </span>
                <span className={`flex-1 text-sm ${done ? 'line-through text-zinc-400' : 'text-zinc-800 font-bold'}`}>
                  {m.emoji} Module {m.number} — {m.title}
                </span>
                <a
                  href={`#module-${m.number}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] font-extrabold text-[#D72027] hover:underline shrink-0"
                >
                  Jump →
                </a>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────
// Module card with TTS + AI cover image
// ────────────────────────────────────────────────────────────────────

function ModuleCard({
  module,
  done,
  onToggleDone,
  onSpeakStateChange,
}: {
  module: TrainingModule
  done: boolean
  active: boolean
  onToggleDone: () => void
  onSpeakStateChange: (speaking: boolean) => void
}) {
  const [speaking, setSpeaking] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  function speak() {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Speech is not supported in this browser. Try Chrome or Edge.')
      return
    }
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      onSpeakStateChange(false)
      return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(module.script)
    // Premium voice picker — prefer high-quality named female English voices.
    // The browser ships dozens; ordering matters because some are robotic
    // (espeak, Google US/UK default) while others (Microsoft Aria, Samantha,
    // Karen, Catherine, Google UK English Female) are studio-grade.
    const voices = window.speechSynthesis.getVoices()
    const preferred = [
      // Microsoft Edge premium female voices (en-AU / en-GB / en-US)
      'Microsoft Natasha Online (Natural) - English (Australia)',
      'Microsoft Catherine - English (Australia)',
      'Microsoft Sonia Online (Natural) - English (United Kingdom)',
      'Microsoft Libby Online (Natural) - English (United Kingdom)',
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Jenny Online (Natural) - English (United States)',
      // Chrome / Safari natural-sounding female voices
      'Google UK English Female',
      'Google US English',
      'Karen',         // macOS en-AU
      'Samantha',      // macOS en-US
      'Catherine',     // older macOS en-AU
      'Tessa',         // macOS en-ZA but pleasant
    ]
    let chosen = null
    for (const name of preferred) {
      const v = voices.find((vv) => vv.name === name)
      if (v) { chosen = v; break }
    }
    // Fallback: any en-AU first, then any en-GB, then any English
    if (!chosen) chosen = voices.find((v) => v.lang === 'en-AU') ?? null
    if (!chosen) chosen = voices.find((v) => v.lang === 'en-GB') ?? null
    if (!chosen) chosen = voices.find((v) => v.lang.startsWith('en')) ?? null
    if (chosen) u.voice = chosen
    u.rate = 0.97   // slightly slower = clearer
    u.pitch = 1.0
    u.volume = 1
    u.onend = () => { setSpeaking(false); onSpeakStateChange(false) }
    u.onerror = () => { setSpeaking(false); onSpeakStateChange(false) }
    utterRef.current = u
    window.speechSynthesis.speak(u)
    setSpeaking(true)
    onSpeakStateChange(true)
  }

  return (
    <section
      id={`module-${module.number}`}
      className={`rounded-2xl shadow-sm border-2 overflow-hidden transition-colors ${
        done ? 'border-emerald-300 bg-emerald-50/30' : 'border-zinc-200 bg-white'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
        {/* Consistent Jacky panel — same portrait every module, big module
            emoji + number as the visual hook. No more shape-shifting AI scenes. */}
        <div className="md:col-span-2 relative min-h-[200px] md:min-h-[280px] bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#A0151B] flex items-center justify-center p-6 overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 30% 20%, #FFC107 0%, transparent 35%), radial-gradient(circle at 70% 80%, #D72027 0%, transparent 40%)',
          }} />
          <div className="relative flex flex-col items-center gap-3">
            <JackyAvatar size={140} />
            <div className="text-7xl drop-shadow-lg" aria-hidden>{module.emoji}</div>
          </div>
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-extrabold text-zinc-700 shadow">
            Module {module.number} of {/* total computed by parent doesn't reach here — keep static */}11
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3 p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="text-xl font-extrabold text-zinc-900 leading-tight">{module.title}</h3>
              <p className="text-sm text-zinc-600 mt-0.5">{module.subtitle}</p>
            </div>
            <button
              onClick={onToggleDone}
              className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-extrabold ${
                done ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-zinc-300 hover:border-emerald-500'
              }`}
              aria-label={done ? 'Mark not done' : 'Mark done'}
            >
              {done && '✓'}
            </button>
          </div>

          <ul className="mt-3 space-y-1.5 text-sm">
            {module.bullets.map((b, i) => (
              <li key={i} className="flex items-baseline gap-2 text-zinc-700">
                <span className="text-amber-500 shrink-0">★</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <details className="mt-4 group">
            <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-wider text-zinc-500 hover:text-zinc-900">
              ▸ Read the full walkthrough
            </summary>
            <p className="mt-3 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{module.script}</p>
          </details>

          <div className="mt-auto pt-5 flex items-center gap-2 flex-wrap">
            <button
              onClick={speak}
              className={`text-sm font-extrabold px-4 py-2 rounded-xl border-2 transition-colors ${
                speaking
                  ? 'bg-red-500 border-red-600 text-white animate-pulse'
                  : 'bg-white border-zinc-300 text-zinc-700 hover:border-[#D72027] hover:text-[#D72027]'
              }`}
            >
              {speaking ? '⏸ Stop' : '🔊 Have Jacky read this to you'}
            </button>
            {module.tryItPath && (
              <a
                href={module.tryItPath}
                className="text-sm font-extrabold px-4 py-2 rounded-xl bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white shadow-md hover:shadow-lg"
              >
                Try it now →
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────
// Submit Ticket modal — fires an internal note + email to admin@
// ────────────────────────────────────────────────────────────────────

function TicketModal({ onClose, userName }: { onClose: () => void; userName: string | null }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!subject.trim() || !body.trim()) { setError('Both fields required.'); return }
    setSubmitting(true)
    setError(null)
    const res = await submitSupportTicket({ subject: subject.trim(), body: body.trim() })
    setSubmitting(false)
    if (!res.ok) { setError(res.error); return }
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-xl font-extrabold text-zinc-900 mb-2">Ticket submitted</h3>
            <p className="text-sm text-zinc-600 mb-5">Thanks{userName ? `, ${userName}` : ''}. Rhett will get back to you soon.</p>
            <button onClick={onClose} className="bg-zinc-900 text-white font-extrabold text-sm px-5 py-2.5 rounded-xl">Close</button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">🎫</span>
              <div>
                <h3 className="text-xl font-extrabold text-zinc-900">Submit a support ticket</h3>
                <p className="text-xs text-zinc-500">Goes straight to admin@bigstarcircus.com.au and an internal note is logged.</p>
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (one-liner)"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="What's going on? Steps to reproduce, what you expected, what happened."
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
              />
              {error && <div className="text-xs text-red-700 bg-red-50 border-l-2 border-red-400 px-2 py-1 rounded">{error}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="text-sm font-bold text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-100">Cancel</button>
                <button
                  onClick={submit}
                  disabled={submitting || !subject.trim() || !body.trim()}
                  className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : '🎫 Submit ticket'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
