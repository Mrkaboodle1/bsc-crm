'use client'

// Live 3D Jacky avatar — Ready Player Me model rendered with Three.js via
// the TalkingHead.js library. The avatar lip-syncs to a pre-rendered MP3
// of Jacky's voice (en-AU-NatashaNeural), blinks, sways, gestures, and
// expresses emotion — all in-browser, no server, no GPU required.
//
// Quality trade-off: it's a stylised 3D avatar (Ready Player Me), not a
// photoreal portrait. The upside is it's truly free forever, plays on any
// device, and can talk for as long as needed with zero cost per render.

import { useEffect, useRef, useState } from 'react'

// Default Jacky avatar — the TalkingHead demo's "brunette" model, baked
// into /public/training/jacky.glb so we don't depend on Ready Player Me's
// (sometimes flaky) avatar CDN. To swap her: generate a new avatar at
// https://readyplayer.me/avatar, download the .glb, save it as
// app/public/training/jacky.glb (must include ARKit + Oculus visemes
// morph targets in the export). License: CC BY-NC 4.0 (non-commercial),
// which fits internal staff training fine.
const DEFAULT_AVATAR_URL = '/training/jacky.glb'

type Mood = 'neutral' | 'happy' | 'angry' | 'sad' | 'fear' | 'disgust' | 'love' | 'sleep'

// Heuristic word timing: distribute words across the known audio duration,
// weighted by syllable count. Not perfect lip-sync, but the lips open and
// close in the right rhythm — good enough for an onboarding video.
function buildWordTimings(script: string, durationSeconds: number) {
  // Pull words out — keep punctuation attached so SSML pauses still work.
  const tokens = script
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return { words: [], wtimes: [], wdurations: [] }

  // Rough syllable estimate per word — vowel groups.
  const sylls = tokens.map((w) => {
    const cleaned = w.toLowerCase().replace(/[^a-z]/g, '')
    if (!cleaned) return 0.6 // punctuation-only token = tiny pause
    const m = cleaned.match(/[aeiouy]+/g)
    return Math.max(1, (m?.length ?? 1))
  })
  const totalSyll = sylls.reduce((a, b) => a + b, 0) || 1
  const ms = durationSeconds * 1000
  // Reserve ~200 ms at the start so the avatar settles before speaking.
  const startOffset = 200
  const usable = Math.max(1000, ms - startOffset - 300)

  let t = startOffset
  const wtimes: number[] = []
  const wdurations: number[] = []
  for (let i = 0; i < tokens.length; i++) {
    const dur = (sylls[i] / totalSyll) * usable
    wtimes.push(Math.round(t))
    wdurations.push(Math.max(80, Math.round(dur)))
    t += dur
  }
  return { words: tokens, wtimes, wdurations }
}

async function loadMp3AsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`)
  return await res.arrayBuffer()
}

async function probeAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = document.createElement('audio')
    a.preload = 'metadata'
    a.src = url
    a.onloadedmetadata = () => resolve(a.duration)
    a.onerror = () => reject(new Error('Could not read audio duration'))
  })
}

export function JackyLiveAvatar({
  audioUrl,
  script,
  mood = 'happy',
  onStateChange,
}: {
  audioUrl: string
  script: string
  mood?: Mood
  onStateChange?: (speaking: boolean) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  // TalkingHead has no exported types — we keep it as `any` here so we don't
  // need to vendor a full ambient declaration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headRef = useRef<any>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'speaking' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)

  // Build the TalkingHead instance once on mount, tear it down on unmount.
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    setStatus('loading')

    ;(async () => {
      try {
        // Dynamic imports — both modules touch window/document/AudioContext
        // and would break SSR. We bypass TalkingHead's own runtime dynamic
        // import of the lipsync language module (Turbopack can't analyse
        // it) by loading LipsyncEn statically and wiring it in by hand.
        // We import the VENDORED copy in src/lib/talkinghead/ — it has the
        // runtime dynamic `import()` patched to use `new Function`, which
        // Turbopack's static analyser leaves alone.
        const [thMod, lipsyncMod] = await Promise.all([
          import('@/lib/talkinghead/talkinghead.mjs'),
          import('@/lib/talkinghead/lipsync-en.mjs'),
        ])
        if (cancelled) return
        const TalkingHead = (thMod as { TalkingHead: new (el: HTMLElement, opts: Record<string, unknown>) => unknown }).TalkingHead
        const LipsyncEn = (lipsyncMod as { LipsyncEn: new () => unknown }).LipsyncEn
        const head = new TalkingHead(containerRef.current!, {
          ttsEndpoint: '',         // we'll use speakAudio() with pre-rendered MP3 — no Google TTS needed
          lipsyncModules: [],      // suppress runtime dynamic import — we register the en module below
          cameraView: 'upper',
          modelFPS: 30,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(head as any).lipsync = { en: new LipsyncEn() }
        headRef.current = head
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (head as any).showAvatar(
          {
            url: DEFAULT_AVATAR_URL,
            body: 'F',
            avatarMood: mood,
            lipsyncLang: 'en',
            avatarIdleEyeContact: 0.6,
            avatarIdleHeadMove: 0.7,
            avatarSpeakingEyeContact: 0.85,
            avatarSpeakingHeadMove: 0.9,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (_url: string, ev: { lengthComputable: boolean; loaded: number; total: number }) => {
            if (ev.lengthComputable && ev.total > 0) {
              setProgress(Math.round((ev.loaded / ev.total) * 100))
            }
          },
        )
        if (cancelled) return
        setStatus('ready')
      } catch (e) {
        console.error('TalkingHead init failed', e)
        if (!cancelled) {
          setError((e instanceof Error ? e.message : String(e)))
          setStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(headRef.current as any)?.stop?.()
      } catch {}
      headRef.current = null
    }
    // mount-only init — mood change handled via setMood() on the next effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply mood updates without rebuilding the avatar
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = headRef.current as any
    if (!h || status !== 'ready' && status !== 'speaking') return
    try { h.setMood?.(mood) } catch {}
  }, [mood, status])

  async function play() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = headRef.current as any
    if (!h) return
    try {
      setStatus('speaking')
      onStateChange?.(true)

      const [audioBuf, durSecs] = await Promise.all([
        loadMp3AsArrayBuffer(audioUrl),
        probeAudioDuration(audioUrl),
      ])
      const { words, wtimes, wdurations } = buildWordTimings(script, durSecs)

      // speakAudio accepts an Audio object: { audio, words, wtimes, wdurations }.
      // Visemes are derived from words by the bundled en lipsync module.
      h.speakAudio(
        { audio: audioBuf, words, wtimes, wdurations },
        {},
        // onsubtitles callback — could wire to a transcript panel later
        null,
      )

      // The library doesn't expose a finished-event, so we poll the audio
      // duration. The user can manually pause via stopSpeaking().
      const finishedAt = Date.now() + durSecs * 1000 + 600
      const tick = () => {
        if (Date.now() >= finishedAt) {
          setStatus('ready')
          onStateChange?.(false)
          return
        }
        if (headRef.current) setTimeout(tick, 250)
      }
      setTimeout(tick, 250)
    } catch (e) {
      console.error('play failed', e)
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
      onStateChange?.(false)
    }
  }

  function stop() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = headRef.current as any
    try { h?.stopSpeaking?.() } catch {}
    setStatus('ready')
    onStateChange?.(false)
  }

  return (
    <div className="relative w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#A0151B] rounded-xl overflow-hidden">
      <div
        ref={containerRef}
        className="w-full"
        style={{ aspectRatio: '16 / 9', minHeight: 340 }}
      />

      {/* Loading overlay */}
      {(status === 'loading' || status === 'idle') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
          <div className="text-4xl mb-3 animate-pulse">🎪</div>
          <div className="text-sm font-extrabold">Loading 3D Jacky…</div>
          <div className="text-xs text-zinc-400 mt-1">{progress > 0 ? `${progress}%` : 'Connecting'}</div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 text-white p-6 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="text-sm font-extrabold mb-1">Avatar failed to load</div>
          <div className="text-[11px] text-red-200">{error}</div>
        </div>
      )}

      {/* Controls strip */}
      {(status === 'ready' || status === 'speaking') && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          {status === 'speaking' ? (
            <button
              onClick={stop}
              className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs px-4 py-2 rounded-full shadow-lg"
            >
              ⏸ Pause Jacky
            </button>
          ) : (
            <button
              onClick={play}
              className="bg-gradient-to-r from-[#FFC107] to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-900 font-extrabold text-xs px-4 py-2 rounded-full shadow-lg"
            >
              ▶ Play Jacky
            </button>
          )}
          {status === 'speaking' && (
            <span className="bg-amber-400/90 text-zinc-900 text-[10px] font-extrabold tracking-widest uppercase px-2 py-1 rounded-full">
              ● Speaking
            </span>
          )}
        </div>
      )}
    </div>
  )
}
