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

// Fetch and DECODE the MP3 — speakAudio requires a real AudioBuffer
// (decoded PCM samples), not the raw compressed ArrayBuffer from fetch.
async function loadMp3AsAudioBuffer(url: string, audioCtx: AudioContext): Promise<AudioBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`)
  const buf = await res.arrayBuffer()
  // decodeAudioData mutates the ArrayBuffer in older Safari; clone to be safe.
  return await audioCtx.decodeAudioData(buf.slice(0))
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
  const [stage, setStage] = useState<string>('Starting')

  // Build the TalkingHead instance once on mount, tear it down on unmount.
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    setStatus('loading')
    setStage('Loading library')

    // Hard timeout — if we're still loading after 30 s, surface an error
    // rather than letting the user stare at a spinner forever.
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      setError(`Stuck on "${stage}" for 30 s. Hard-refresh (Ctrl+Shift+R) or check the browser console for errors.`)
      setStatus('error')
    }, 30000)

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
        setStage('Building scene')
        const TalkingHead = (thMod as { TalkingHead: new (el: HTMLElement, opts: Record<string, unknown>) => unknown }).TalkingHead
        const LipsyncEn = (lipsyncMod as { LipsyncEn: new () => unknown }).LipsyncEn
        // Probe the avatar file BEFORE handing it to TalkingHead — gives a
        // clear "not found" error early instead of a silent hang inside
        // GLTFLoader.
        setStage('Fetching avatar')
        const probe = await fetch(DEFAULT_AVATAR_URL, { method: 'HEAD' })
        if (!probe.ok) {
          throw new Error(`Avatar file unavailable (${probe.status}). Try a hard-refresh.`)
        }
        if (cancelled) return
        const head = new TalkingHead(containerRef.current!, {
          ttsEndpoint: '',         // we'll use speakAudio() with pre-rendered MP3 — no Google TTS needed
          lipsyncModules: [],      // suppress runtime dynamic import — we register the en module below
          cameraView: 'upper',
          modelFPS: 30,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(head as any).lipsync = { en: new LipsyncEn() }
        headRef.current = head
        setStage('Downloading 3D model')
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
          (ev: { lengthComputable: boolean; loaded: number; total: number }) => {
            if (ev?.lengthComputable && ev.total > 0) {
              setProgress(Math.round((ev.loaded / ev.total) * 100))
            }
          },
        )
        if (cancelled) return
        window.clearTimeout(timeoutId)
        setStage('Ready')
        setStatus('ready')
      } catch (e) {
        console.error('TalkingHead init failed', e)
        if (!cancelled) {
          window.clearTimeout(timeoutId)
          setError((e instanceof Error ? e.message : String(e)))
          setStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
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

      // The library spins up an AudioContext inside the TalkingHead instance
      // and exposes it as `head.audioCtx`. We must (a) make sure it's not
      // suspended (browsers gate AudioContext on the first user gesture)
      // and (b) decode the MP3 using THAT context so the sample-rate
      // matches the library's worklet.
      const audioCtx: AudioContext = h.audioCtx
      if (audioCtx?.state === 'suspended') {
        try { await audioCtx.resume() } catch {}
      }

      const audioBuffer = await loadMp3AsAudioBuffer(audioUrl, audioCtx)
      const durSecs = audioBuffer.duration
      const { words, wtimes, wdurations } = buildWordTimings(script, durSecs)

      // speakAudio expects a real AudioBuffer — the previous ArrayBuffer
      // was silently rejected by AudioBufferSourceNode.buffer = ... and
      // the lips would animate over silence.
      h.speakAudio(
        { audio: audioBuffer, words, wtimes, wdurations },
        { lipsyncLang: 'en' },
        null, // subtitles callback — could wire to a transcript panel later
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

      {/* Loading overlay — shows current stage so the user can tell where
          it's stuck if it stalls. */}
      {(status === 'loading' || status === 'idle') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
          <div className="text-4xl mb-3 animate-pulse">🎪</div>
          <div className="text-sm font-extrabold">Loading 3D Jacky…</div>
          <div className="text-xs text-amber-300 mt-1 font-bold">{stage}</div>
          {progress > 0 && <div className="text-[11px] text-zinc-400 mt-0.5">{progress}%</div>}
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
