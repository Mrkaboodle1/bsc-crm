'use client'

// Training portal — hero, module list, quick-start checklist, submit ticket.
//
// Each module ships a pre-rendered 1920x1080 MP4 produced by Remotion from
// the Jacky portrait + the en-AU-NatashaNeural narration. The video has
// title cards, bullet-point reveals timed to her speech, a real talking-head
// animation with breath/blink/mouth-sync, and BSC branding — it plays like
// a proper YouTube tutorial. Source: training-video-renderer/src/JackyModule.tsx.
//
// The whole portal is now really just a video gallery + checklist.

import { useMemo, useState, useEffect, useRef, type RefObject } from 'react'
import type { TrainingModule } from './modules'
import { submitSupportTicket } from './actions'
import { getTour } from './tour-scripts'
import { FakeCursor } from './fake-cursor'

// JackyPlayer — when the module has a HeyGen video, play that (Jacky moving
// + talking). Otherwise fall back to a static portrait + narration audio.
function JackyPlayer({ audioUrl, videoUrl, videoRef }: { audioUrl: string; videoUrl?: string; videoRef?: RefObject<HTMLVideoElement | null>; script?: string; mood?: string; transparent?: boolean }) {
  if (videoUrl) {
    return (
      <div className="relative w-full h-full flex items-end justify-start pl-3 pb-3">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          autoPlay
          playsInline
          className="rounded-2xl border-4 border-amber-300 shadow-2xl bg-black"
          style={{ width: 'min(90%, 480px)', aspectRatio: '16/9', objectFit: 'cover' }}
        />
      </div>
    )
  }
  return (
    <div className="relative w-full h-full flex items-end justify-start pl-3 pb-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/jacky-avatar.webp"
        alt="Jacky"
        className="rounded-full border-4 border-amber-300 shadow-2xl"
        style={{ width: 'min(80%, 320px)', aspectRatio: '1/1', objectFit: 'cover' }}
      />
      <audio src={audioUrl} controls autoPlay className="absolute bottom-2 right-3 max-w-[55%]" style={{ filter: 'invert(0.92)' }} />
    </div>
  )
}

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
            <JackyHeroAvatar size={180} />
          </div>
          <div className="md:col-span-2 text-white">
            <div className="text-xs uppercase tracking-widest text-amber-300 font-extrabold mb-2">
              Welcome to the BSC CRM Training Portal
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">
              Hey {userName ?? 'there'} 🎪 I&apos;m Jacky. Eleven short videos.
            </h2>
            <p className="text-zinc-300 mb-4 leading-relaxed">
              Press play on any module — I&apos;ll walk you through it like a YouTube tutorial.
              Same warm Australian voice every time. Try It links drop you straight into the feature.
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

      {/* Modules — one video per card */}
      <div className="space-y-6">
        {modules.map((m) => (
          <ModuleVideoCard
            key={m.id}
            module={m}
            done={progress.completed.includes(m.id)}
            onToggleDone={() => toggleComplete(m.id)}
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
// Hero avatar — static portrait with a glow ring
// ────────────────────────────────────────────────────────────────────

function JackyHeroAvatar({ size = 180 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D72027] to-amber-500 blur-2xl opacity-50" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/jacky-avatar.webp"
        alt="Jacky — your BSC AI admin"
        width={size}
        height={size}
        className="relative rounded-full object-cover border-4 border-white shadow-2xl ring-4 ring-amber-300/40"
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
// Module card — embedded MP4 player + bullets + try-it
// ────────────────────────────────────────────────────────────────────

function ModuleVideoCard({
  module,
  done,
  onToggleDone,
}: {
  module: TrainingModule
  done: boolean
  onToggleDone: () => void
}) {
  // Render the avatar lazily — only when the user expands the module —
  // because each instance loads a 3D model + audio buffer (~5–10 MB).
  // Eleven simultaneous avatars on mount would be brutal on first paint.
  const [active, setActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  return (
    <section
      id={`module-${module.number}`}
      className={`rounded-2xl shadow-md border-2 overflow-hidden transition-colors bg-white ${
        done ? 'border-emerald-300' : 'border-zinc-200'
      }`}
    >
      {/* Avatar — full-bleed on top. Click to load 3D Jacky for this module.
          When playing, the layout becomes a "presenter":
              Background = live iframe of a demo page (the CRM Jacky is
              talking about), heavily dimmed so the avatar reads.
              Foreground left = transparent Jacky avatar, smaller. */}
      <div className="relative bg-black aspect-video min-h-[340px] overflow-hidden">
        {active ? (
          <>
            {/* Backdrop — actual CRM page rendered live via iframe. We use
                /demo/* routes so no auth is needed and the iframe loads
                immediately. pointer-events disabled because clicks should
                interact with the avatar, not the demo. */}
            {module.previewPath ? (
              <iframe
                src={module.previewPath}
                title={`${module.title} preview`}
                className="absolute inset-0 w-full h-full border-0"
                style={{ pointerEvents: 'none', filter: 'brightness(0.78) contrast(1.05)' }}
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#A0151B]" />
            )}
            {/* Fake cursor — moves over the demo iframe in time with Jacky's
                video so it visibly shows what she's pointing at. */}
            {module.videoUrl && (
              <FakeCursor videoRef={videoRef} path={module.demoActions} />
            )}
            {/* Soft red+gold vignette to focus the eye on Jacky */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 22% 50%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 35%, transparent 65%), radial-gradient(circle at 25% 50%, rgba(215,32,39,0.25) 0%, transparent 50%)',
              }}
            />
            {/* Jacky overlay — anchored to the left, ~40% width */}
            <div
              className="absolute top-0 bottom-0 left-0 z-10 pointer-events-auto"
              style={{ width: 'min(46%, 480px)' }}
            >
              <JackyPlayer
                audioUrl={`/training/audio/${module.id}.mp3`}
                videoUrl={module.videoUrl}
                videoRef={videoRef}
                script={module.script}
                mood="happy"
                transparent
              />
            </div>
            {/* Module title overlaid bottom-right — the "presenter notes" */}
            <div className="absolute bottom-4 right-4 max-w-[55%] text-right pointer-events-none">
              <div className="text-[10px] uppercase tracking-widest text-amber-300 font-extrabold mb-1">
                Module {module.number} · {module.subtitle}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight drop-shadow-lg">
                {module.title}
              </div>
            </div>
          </>
        ) : (
          <button
            onClick={() => setActive(true)}
            className="w-full aspect-video min-h-[340px] bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#A0151B] flex flex-col items-center justify-center text-white p-6 hover:brightness-110 transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 30% 20%, #FFC107 0%, transparent 35%), radial-gradient(circle at 70% 80%, #D72027 0%, transparent 40%)',
            }} />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FFC107] to-amber-500 flex items-center justify-center text-3xl shadow-2xl mb-3 group-hover:scale-105 transition-transform">
              ▶
            </div>
            <div className="relative text-2xl font-extrabold tracking-tight">{module.title}</div>
            <div className="relative text-sm text-amber-300 mt-1">{module.subtitle}</div>
            <div className="relative text-[10px] uppercase tracking-widest text-zinc-400 mt-4">
              Click to load 3D Jacky
            </div>
          </button>
        )}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-extrabold text-zinc-700 shadow pointer-events-none">
          Module {module.number} of 11
        </div>
        {done && (
          <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-extrabold shadow flex items-center gap-1.5 pointer-events-none">
            <span>✓</span> Watched
          </div>
        )}
      </div>

      {/* Below the video — title + bullets + buttons */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-xl font-extrabold text-zinc-900 leading-tight">
              <span className="mr-2">{module.emoji}</span>
              {module.title}
            </h3>
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

        <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          {module.bullets.map((b, i) => (
            <li key={i} className="flex items-baseline gap-2 text-zinc-700">
              <span className="text-amber-500 shrink-0">★</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <details className="mt-4 group">
          <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-wider text-zinc-500 hover:text-zinc-900">
            ▸ Read the full transcript
          </summary>
          <p className="mt-3 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{module.script}</p>
        </details>

        {/* Try it / Take the tour buttons */}
        {(module.tryItPath || getTour(module.id)) && (
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            {module.tryItPath && (
              <a
                href={module.tryItPath}
                className="inline-block text-sm font-extrabold px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white shadow-md hover:shadow-lg"
              >
                Try it now →
              </a>
            )}
            {getTour(module.id) && (
              <a
                href={`${getTour(module.id)!.pageHref}?tour=${module.id}`}
                className="inline-block text-sm font-extrabold px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFC107] to-amber-400 text-zinc-900 shadow-md hover:shadow-lg"
              >
                🎪 Take the tour with Jacky →
              </a>
            )}
          </div>
        )}
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
