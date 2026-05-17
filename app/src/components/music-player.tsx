'use client'

// Floating studio music player. Free, ad-free, curated radio streams that
// are guaranteed clean (no explicit lyrics). State persists in localStorage
// so it auto-resumes across page navigation.
//
// Stations sourced from SomaFM (listener-supported, ad-free) and TuneIn
// public direct streams. Every station here is family-safe for the BSC studio.

import { useEffect, useRef, useState } from 'react'

type Station = {
  id: string
  name: string
  vibe: string
  url: string
  emoji: string
}

const STATIONS: Station[] = [
  {
    id: 'poptron',
    name: 'PopTron',
    vibe: 'Electro indie pop — energetic, clean, perfect for warm-up',
    url: 'https://ice2.somafm.com/poptron-128-mp3',
    emoji: '🎉',
  },
  {
    id: 'indiepop',
    name: 'Indie Pop Rocks',
    vibe: 'Curated indie pop — singable, upbeat, no swearing',
    url: 'https://ice2.somafm.com/indiepop-128-mp3',
    emoji: '🎸',
  },
  {
    id: 'beatblender',
    name: 'Beat Blender',
    vibe: 'Mellow downtempo grooves — relaxed class energy',
    url: 'https://ice2.somafm.com/beatblender-128-mp3',
    emoji: '🌊',
  },
  {
    id: 'groovesalad',
    name: 'Groove Salad',
    vibe: 'Ambient chill — backgroundy, low pressure',
    url: 'https://ice2.somafm.com/groovesalad-128-mp3',
    emoji: '🪴',
  },
  {
    id: 'thetrip',
    name: 'The Trip',
    vibe: 'Progressive house — high energy, no vocals to worry about',
    url: 'https://ice2.somafm.com/thetrip-128-mp3',
    emoji: '⚡',
  },
  {
    id: 'underground80s',
    name: 'Underground 80s',
    vibe: 'Synthwave + 80s pop — nostalgic, clean classics',
    url: 'https://ice2.somafm.com/u80s-128-mp3',
    emoji: '📼',
  },
]

const STORAGE_KEY = 'bsc-music-state-v1'

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
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  function toggle() {
    setError(null)
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
    setStationId(id)
    setError(null)
    const audio = audioRef.current
    if (!audio) return
    const wasPlaying = playing
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
      {/* Hidden audio element — single source of truth */}
      <audio
        ref={audioRef}
        src={station.url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setError('Station went off-air — try another.')}
      />

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
                    {playing ? 'Streaming live' : 'Tap play'}
                  </div>
                </div>
              </div>

              {/* Volume */}
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
