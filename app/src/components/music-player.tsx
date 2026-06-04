'use client'

// Floating studio music player. Free, ad-free, curated radio streams that
// are guaranteed clean (no explicit lyrics). State persists in localStorage
// so it auto-resumes across page navigation.
//
// Stations sourced from SomaFM (listener-supported, ad-free) and TuneIn
// public direct streams. Every station here is family-safe for the BSC studio.

import { useEffect, useRef, useState } from 'react'

// A station is either an HTML5 <audio> stream OR a YouTube playlist iframe.
// SomaFM stations are direct audio (ad-free, listener-supported, free).
// YouTube stations carry occasional short ads but unlock current-pop /
// KidzBop content that isn't on any free Icecast stream.
type AudioStation = { kind: 'audio'; id: string; name: string; vibe: string; emoji: string; url: string }
type YouTubeStation = { kind: 'youtube'; id: string; name: string; vibe: string; emoji: string; playlistId: string }
type Station = AudioStation | YouTubeStation

const STATIONS: Station[] = [
  // ── Current Top 40 sung by kids / family-friendly (via YouTube) ──
  {
    kind: 'youtube',
    id: 'kidzbop',
    name: 'KIDZ BOP Hits',
    vibe: 'Top 40 sung by kids — official music videos · brief ads',
    emoji: '🎤',
    playlistId: 'PL5pvzdXbuo26GIkkkLvSu2oNR8ZwP8GIe', // KIDZ BOP Official Music Videos
  },

  // ── SomaFM (ad-free, listener-supported, always clean) ──
  {
    kind: 'audio',
    id: 'poptron',
    name: 'PopTron',
    vibe: 'Electro indie pop — energetic, clean, perfect for warm-up',
    url: 'https://ice2.somafm.com/poptron-128-mp3',
    emoji: '🎉',
  },
  {
    kind: 'audio',
    id: 'indiepop',
    name: 'Indie Pop Rocks',
    vibe: 'Curated indie pop — singable, upbeat, no swearing',
    url: 'https://ice2.somafm.com/indiepop-128-mp3',
    emoji: '🎸',
  },
  {
    kind: 'audio',
    id: 'beatblender',
    name: 'Beat Blender',
    vibe: 'Mellow downtempo grooves — relaxed class energy',
    url: 'https://ice2.somafm.com/beatblender-128-mp3',
    emoji: '🌊',
  },
  {
    kind: 'audio',
    id: 'groovesalad',
    name: 'Groove Salad',
    vibe: 'Ambient chill — backgroundy, low pressure',
    url: 'https://ice2.somafm.com/groovesalad-128-mp3',
    emoji: '🪴',
  },
  {
    kind: 'audio',
    id: 'thetrip',
    name: 'The Trip',
    vibe: 'Progressive house — high energy, no vocals to worry about',
    url: 'https://ice2.somafm.com/thetrip-128-mp3',
    emoji: '⚡',
  },
  {
    kind: 'audio',
    id: 'underground80s',
    name: 'Underground 80s',
    vibe: 'Synthwave + 80s pop — nostalgic, clean classics',
    url: 'https://ice2.somafm.com/u80s-128-mp3',
    emoji: '📼',
  },
]

const STORAGE_KEY = 'bsc-music-state-v1'

// BigStar shout-out — spoken by the device, ducking the music underneath.
// Live radio has no song markers, so we play it on a steady cadence (≈ every
// 3 songs). On a controllable playlist we could make it exactly every 3rd song.
const BSC_LINE = 'Big Star Circus makes circus stars every day. Stay inspired and creative. Make the impossible possible.'
const SPOT_EVERY_MS = 9 * 60 * 1000
const DUCK_VOLUME = 0.18

type StoredState = {
  stationId: string
  volume: number
  playing: boolean
}

function loadState(): StoredState {
  if (typeof window === 'undefined') return { stationId: STATIONS[0]!.id, volume: 0.6, playing: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredState
  } catch {
    /* ignore */
  }
  return { stationId: STATIONS[0]!.id, volume: 0.6, playing: false }
}

function saveState(s: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function MusicPlayer() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [stationId, setStationId] = useState(STATIONS[0]!.id)
  const [volume, setVolume] = useState(0.6)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spotOn, setSpotOn] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const spotRef = useRef<HTMLAudioElement | null>(null)

  const station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0]!

  // Hydrate from localStorage after mount
  useEffect(() => {
    const s = loadState()
    setStationId(s.stationId)
    setVolume(s.volume)
    setMounted(true)
    // Auto-resume across page nav if user had it playing
    if (s.playing) {
      // small delay so audio element exists
      setTimeout(() => {
        const audio = audioRef.current
        if (audio) {
          audio.volume = s.volume
          audio.play().catch(() => {
            // Most browsers block autoplay without user gesture; that's fine,
            // user just taps play when they're ready.
            setPlaying(false)
            saveState({ ...s, playing: false })
          })
        }
      }, 100)
    }
  }, [])

  // Persist state on every change
  useEffect(() => {
    if (!mounted) return
    saveState({ stationId, volume, playing })
  }, [mounted, stationId, volume, playing])

  // Apply volume to audio element on change
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // The BigStar shout-out — duck the music, play the smooth AI voice clip,
  // restore the music. Falls back to the device voice if the clip can't load.
  function speakSpot() {
    const bg = audioRef.current
    const restore = bg ? bg.volume : volume
    const restoreVol = () => { if (bg) bg.volume = restore }
    if (bg) bg.volume = DUCK_VOLUME
    try {
      let spot = spotRef.current
      if (!spot) { spot = new Audio('/bsc-spot.mp3?v=2'); spotRef.current = spot }
      spot.currentTime = 0
      spot.volume = 1
      spot.onended = restoreVol
      spot.onerror = () => deviceVoice(restoreVol)
      const p = spot.play()
      if (p && typeof p.catch === 'function') p.catch(() => deviceVoice(restoreVol))
    } catch {
      deviceVoice(restoreVol)
    }
  }

  // Fallback: the browser's built-in voice (robotic, only used if the clip fails).
  function deviceVoice(after: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { after(); return }
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(BSC_LINE)
      u.rate = 0.98
      u.pitch = 1.05
      u.onend = after
      u.onerror = after
      window.speechSynthesis.speak(u)
    } catch {
      after()
    }
  }

  // Cadence: while an audio station is playing, drop the shout-out periodically.
  useEffect(() => {
    if (!mounted || !spotOn || !playing || station.kind !== 'audio') return
    const t = setInterval(speakSpot, SPOT_EVERY_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, spotOn, playing, station.kind])

  function toggle() {
    setError(null)
    // YouTube stations are visually-controlled by the iframe itself — clicking
    // play/pause here just shows/hides the embed. The iframe's autoplay does
    // the rest.
    if (station.kind === 'youtube') {
      setPlaying((p) => !p)
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
        .then(() => setPlaying(true))
        .catch((e: Error) => {
          setError(`Couldn't play: ${e.message}`)
          setPlaying(false)
        })
    }
  }

  function pick(id: string) {
    const target = STATIONS.find((s) => s.id === id)
    if (!target) return
    const wasPlaying = playing
    setStationId(id)
    setError(null)
    const audio = audioRef.current
    if (target.kind === 'youtube') {
      // Stop any audio-stream playback so we don't double-play
      if (audio) audio.pause()
      setPlaying(wasPlaying) // keep playing-state through the swap
      return
    }
    if (!audio) return
    audio.pause()
    audio.src = target.url
    audio.load()
    if (wasPlaying) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  if (!mounted) return null

  return (
    <>
      {/* Hidden audio element — only used for audio-stream stations */}
      {station.kind === 'audio' && (
        <audio
          ref={audioRef}
          src={station.url}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setError('Station went off-air — try another.')}
        />
      )}

      {/* Floating widget — bottom-right */}
      <div className="fixed bottom-4 right-4 z-50">
        {open ? (
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#D72027] w-80 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">{station.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm truncate">{station.name}</div>
                <div className="text-[10px] opacity-80 truncate">{station.vibe}</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white text-lg leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20"
                aria-label="Minimize music player"
              >
                –
              </button>
            </div>

            {/* Controls */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggle}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md transition-all ${
                    playing
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                      : 'bg-gradient-to-br from-[#FFC107] to-amber-500 text-zinc-900'
                  }`}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? '⏸' : '▶'}
                </button>
                <div className="flex-1">
                  <div className="text-xs font-bold text-zinc-600">{playing ? 'Now playing' : 'Paused'}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {station.kind === 'youtube' && playing
                      ? 'YouTube playlist · use volume on the video'
                      : playing ? 'Streaming live' : 'Tap play'}
                  </div>
                </div>
              </div>

              {/* YouTube iframe — only when a YouTube station is active and playing */}
              {station.kind === 'youtube' && playing && (
                <div className="rounded-xl overflow-hidden border-2 border-amber-200">
                  <iframe
                    title={station.name}
                    width="100%"
                    height="160"
                    src={`https://www.youtube-nocookie.com/embed/videoseries?list=${station.playlistId}&autoplay=1&modestbranding=1&rel=0`}
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}

              {/* Volume — only for audio streams; YouTube uses its own controls */}
              {station.kind === 'audio' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">🔈</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-[#D72027]"
                    aria-label="Volume"
                  />
                  <span className="text-[10px] text-zinc-500 w-7 text-right">{Math.round(volume * 100)}%</span>
                </div>
              )}

              {/* Station picker */}
              <div className="border-t border-zinc-100 pt-3">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-2">
                  Switch station
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATIONS.map((s) => {
                    const active = s.id === stationId
                    return (
                      <button
                        key={s.id}
                        onClick={() => pick(s.id)}
                        className={`text-left rounded-lg px-2 py-1.5 text-xs ${
                          active
                            ? 'bg-gradient-to-br from-[#FFC107] to-amber-400 text-zinc-900 font-extrabold shadow'
                            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{s.emoji}</span>
                          <span className="truncate">{s.name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="text-[10px] text-red-700 bg-red-50 border-l-2 border-red-400 px-2 py-1 rounded">
                  {error}
                </div>
              )}

              {/* BigStar shout-out control */}
              <div className="border-t border-zinc-100 pt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-zinc-700">🎪 BigStar shout-out</div>
                  <div className="text-[10px] text-zinc-400">Spoken every few songs</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={speakSpot}
                    className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                  >
                    Say it now
                  </button>
                  <button
                    onClick={() => setSpotOn((v) => !v)}
                    className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg ${spotOn ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'}`}
                  >
                    {spotOn ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="text-[9px] text-zinc-400 text-center pt-1">
                Free + ad-free via SomaFM · always clean lyrics
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className={`flex items-center gap-2 rounded-full shadow-2xl px-4 py-3 border-2 transition-all ${
              playing
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-700 animate-pulse'
                : 'bg-white text-zinc-700 border-[#D72027] hover:bg-zinc-50'
            }`}
            aria-label="Open music player"
          >
            <span className="text-xl">{playing ? '🎵' : '📻'}</span>
            <span className="text-xs font-extrabold uppercase tracking-wider">
              {playing ? station.name : 'Music'}
            </span>
          </button>
        )}
      </div>
    </>
  )
}
