'use client'

// Floating "tour mode" widget that overlays the live CRM.
//
//   ┌─────────────────────┐
//   │ 🎪 Jacky's tour  ✕  │  ← header + close
//   │  ┌─────────┐        │
//   │  │ Jacky   │        │  ← portrait (animated halo while speaking)
//   │  │ portrait│        │
//   │  └─────────┘        │
//   │  "She's saying X"   │  ← current step caption
//   │  ▶ Play / ⏸ Pause  │
//   └─────────────────────┘
//
// Plus a separate pointer overlay (pulsing yellow ring + arrow) that
// highlights the DOM element relevant to the current moment in the audio.
//
// The widget is mounted by DashboardShell whenever ?tour=<moduleId> is in
// the URL. Tour timelines live in src/app/training/tour-scripts.ts.

import { useEffect, useRef, useState } from 'react'
import { getTour, type TourHighlight, type TourScript } from '@/app/training/tour-scripts'

export function JackyTour({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const tour = getTour(moduleId)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Pointer state derived from the active highlight at currentMs.
  const active = activeHighlight(tour, currentMs)

  // Drive currentMs from audio timeupdate
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setCurrentMs(Math.floor(a.currentTime * 1000))
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnd)
    }
  }, [moduleId])

  // Autoplay on mount — many browsers require user gesture; if it's blocked
  // we just show the play button.
  useEffect(() => {
    if (!tour) return
    const a = audioRef.current
    if (!a) return
    a.play().catch(() => { /* user must click play */ })
  }, [moduleId, tour])

  if (!tour) {
    return (
      <FloatingShell onClose={onClose}>
        <div className="text-xs text-zinc-500 p-3">
          No tour available for module &quot;{moduleId}&quot; yet.
        </div>
      </FloatingShell>
    )
  }

  async function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      try { await a.play() } catch (e) { setError((e as Error).message) }
    } else {
      a.pause()
    }
  }

  return (
    <>
      {/* Pointer overlay — highlights the active DOM element */}
      {active && <HighlightPointer selector={active.selector} label={active.label} />}

      <FloatingShell onClose={onClose}>
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <JackyPortrait speaking={playing} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700">
                {tour.title}
              </div>
              <div className="text-sm font-bold text-zinc-800 leading-snug mt-0.5 line-clamp-3">
                {active ? active.label : 'Setting the scene…'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={togglePlay}
              className={`text-xs font-extrabold px-3 py-1.5 rounded-full ${
                playing ? 'bg-red-500 text-white' : 'bg-gradient-to-r from-[#FFC107] to-amber-400 text-zinc-900'
              }`}
            >
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D72027] to-[#FFC107] rounded-full transition-all"
                style={{ width: `${Math.min(100, (currentMs / Math.max(1, audioRef.current?.duration ? audioRef.current.duration * 1000 : 1)) * 100)}%` }}
              />
            </div>
          </div>

          {error && <div className="text-[10px] text-red-700 bg-red-50 px-2 py-1 rounded">{error}</div>}

          <audio
            ref={audioRef}
            src={`/training/audio/${moduleId}.mp3`}
            preload="auto"
          />
        </div>
      </FloatingShell>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Floating shell — sticky bottom-right card. Draggable later.
// ─────────────────────────────────────────────────────────────

function FloatingShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-2xl shadow-2xl border-2 border-[#D72027] overflow-hidden">
      <div className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest">
          <span>🎪</span>
          <span>Jacky&apos;s tour</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white text-base leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-white/15"
          aria-label="End tour"
        >
          ×
        </button>
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Jacky portrait — animated halo + soft mouth pulse while speaking
// ─────────────────────────────────────────────────────────────

function JackyPortrait({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative w-16 h-16 shrink-0">
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#D72027] to-amber-400 blur-md ${
          speaking ? 'animate-pulse opacity-70' : 'opacity-40'
        }`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/jacky-avatar.webp"
        alt="Jacky"
        className="relative w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
      />
      {speaking && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-400 text-zinc-900 text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow">
          ● Talking
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// HighlightPointer — yellow ring + label tag pointing at a DOM element
// ─────────────────────────────────────────────────────────────

function HighlightPointer({ selector, label }: { selector: string; label: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    let raf = 0
    function track() {
      const el = document.querySelector(selector)
      if (el) {
        setRect(el.getBoundingClientRect())
      } else {
        setRect(null)
      }
      raf = requestAnimationFrame(track)
    }
    raf = requestAnimationFrame(track)
    return () => cancelAnimationFrame(raf)
  }, [selector])

  if (!rect) return null

  // Pad the ring slightly outside the element so the highlight reads clearly.
  const pad = 10
  const top = rect.top - pad
  const left = rect.left - pad
  const width = rect.width + pad * 2
  const height = rect.height + pad * 2

  return (
    <>
      <style jsx>{`
        @keyframes tour-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7), 0 0 0 4px rgba(255, 193, 7, 0.3); }
          50%      { box-shadow: 0 0 0 8px rgba(255, 193, 7, 0.3), 0 0 0 14px rgba(255, 193, 7, 0.1); }
        }
        @keyframes tour-label-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
      <div
        style={{ position: 'fixed', top, left, width, height, pointerEvents: 'none', zIndex: 49 }}
        aria-hidden
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '3px solid #FFC107',
            borderRadius: 14,
            animation: 'tour-ring-pulse 1.4s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: -34,
            transform: 'translateX(-50%)',
            background: '#D72027',
            color: 'white',
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
            animation: 'tour-label-bounce 1.4s ease-in-out infinite',
          }}
        >
          ▼ {label}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function activeHighlight(tour: TourScript | null, currentMs: number): TourHighlight | null {
  if (!tour) return null
  let active: TourHighlight | null = null
  for (const h of tour.highlights) {
    if (h.at <= currentMs) active = h
    else break
  }
  return active
}
