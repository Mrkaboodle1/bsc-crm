'use client'

// Floating studio music player. Free, ad-free, curated radio streams that
// are guaranteed clean (no explicit lyrics). State persists in localStorage
// so it auto-resumes across page navigation.
//
// Stations sourced from SomaFM (listener-supported, ad-free) and TuneIn
// public direct streams. Every station here is family-safe for the BSC studio.

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// A station is either an HTML5 <audio> stream OR a YouTube playlist iframe.
// SomaFM stations are direct audio (ad-free, listener-supported, free).
// YouTube stations carry occasional short ads but unlock current-pop /
// KidzBop content that isn't on any free Icecast stream.
type AudioStation = { kind: 'audio'; id: string; name: string; vibe: string; emoji: string; url: string }
type YouTubeStation = { kind: 'youtube'; id: string; name: string; vibe: string; emoji: string; playlistId?: string; videoId?: string }
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

  {
    kind: 'youtube',
    id: 'eurodance',
    name: '90s Eurodance Mix',
    vibe: "Haddaway, Vengaboys, Aqua, Eiffel 65 — Rhett's pick · brief ads",
    emoji: '🕺',
    videoId: 'Bi3F2QoASyY',
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
    id: 'illstreet',
    name: 'Illinois St Lounge',
    vibe: 'Vintage lounge & swing — proper circus vibes',
    url: 'https://ice2.somafm.com/illstreet-128-mp3',
    emoji: '🎩',
  },
  {
    kind: 'audio',
    id: 'folkfwd',
    name: 'Folk Forward',
    vibe: 'Indie folk — gentle warm-down energy',
    url: 'https://ice2.somafm.com/folkfwd-128-mp3',
    emoji: '🪕',
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

// mm:ss for the playhead / song length.
function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function MusicPlayer() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [stationId, setStationId] = useState(STATIONS[0]!.id)
  const [volume, setVolume] = useState(0.6)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spotOn, setSpotOn] = useState(true)
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string; tracks: { title: string; url: string; yt?: string }[] }>>([])
  const [plId, setPlId] = useState<string | null>(null)   // active playlist (overrides radio)
  const [plIdx, setPlIdx] = useState(0)                    // current track index
  const [curTime, setCurTime] = useState(0)                // playhead position (uploaded tracks)
  const [duration, setDuration] = useState(0)              // current track length
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const spotRef = useRef<HTMLAudioElement | null>(null)
  const wakeRef = useRef<{ release?: () => Promise<void> } | null>(null)
  const autoNext = useRef(false)   // play the audio as soon as the next source is ready
  const pathname = usePathname()

  const station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0]!
  const activePlaylist = plId ? playlists.find((p) => p.id === plId) ?? null : null
  const plYtIds = activePlaylist ? activePlaylist.tracks.filter((t) => t.yt).map((t) => t.yt!) : []
  const playlistIsYt = plYtIds.length > 0   // a playlist made of YouTube songs
  const plTrack = activePlaylist?.tracks[plIdx] ?? null
  const audioSrc = activePlaylist ? (playlistIsYt ? '' : (plTrack?.url ?? '')) : (station.kind === 'audio' ? station.url : '')

  // Load the studio's saved playlists — on mount, and again each time the
  // player is opened (so songs you just added show up without a full refresh).
  useEffect(() => {
    if (mounted && !open) return
    fetch('/api/playlists').then((r) => r.json()).then((j) => { if (j?.ok) setPlaylists(j.rows) }).catch(() => {})
  }, [open, mounted])

  // Keep the screen awake while music is playing so the tablet doesn't sleep
  // (and pause) mid-class. Re-acquire when the tab becomes visible again.
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release?: () => Promise<void> }> } }
    async function acquire() { try { if (nav.wakeLock) wakeRef.current = await nav.wakeLock.request('screen') } catch { /* not supported */ } }
    async function release() { try { await wakeRef.current?.release?.() } catch { /* ignore */ } wakeRef.current = null }
    if (playing) acquire(); else release()
    const onVis = () => { if (document.visibilityState === 'visible' && playing) acquire() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis) }
  }, [playing])

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
    // the rest. (Playlists always use the audio element.)
    if (playlistIsYt || (!activePlaylist && station.kind === 'youtube')) {
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

  // Play one of the studio's saved playlists, from the top.
  function pickPlaylist(id: string) {
    const pl = playlists.find((p) => p.id === id)
    if (!pl || !pl.tracks.length) { setError('That playlist has no songs yet.'); return }
    setError(null); setPlId(id); setPlIdx(0)
    // YouTube playlist → the iframe handles playback; just show it.
    if (pl.tracks.some((t) => t.yt)) { audioRef.current?.pause(); setPlaying(true); return }
    // Uploaded playlist → React sets the <audio> src; onCanPlay starts it.
    audioRef.current?.pause(); autoNext.current = true; setPlaying(true)
  }

  // Jump to a specific song in the active playlist (uploaded OR YouTube).
  function playTrackAt(i: number) {
    if (!activePlaylist || !activePlaylist.tracks.length) return
    const n = activePlaylist.tracks.length
    const idx = ((i % n) + n) % n
    setError(null)
    setCurTime(0)
    if (!playlistIsYt) autoNext.current = true // uploaded: onCanPlay starts it; YT: iframe reloads on src change
    setPlIdx(idx)
    setPlaying(true)
  }
  function nextTrack() { if (activePlaylist) playTrackAt(plIdx + 1) }
  function prevTrack() {
    if (!activePlaylist) return
    // iPod behaviour: >3s into a song, the back button restarts it; otherwise go to the previous song.
    const a = audioRef.current
    if (!playlistIsYt && a && a.currentTime > 3) { a.currentTime = 0; setCurTime(0); return }
    playTrackAt(plIdx - 1)
  }
  // Drag the playhead to anywhere in the song (uploaded tracks only).
  function seek(t: number) {
    const a = audioRef.current
    if (a && isFinite(t)) { a.currentTime = t; setCurTime(t) }
  }

  function pick(id: string) {
    const target = STATIONS.find((s) => s.id === id)
    if (!target) return
    const wasPlaying = playing
    setPlId(null) // leaving playlist mode → back to radio
    setStationId(id)
    setError(null)
    audioRef.current?.pause()
    if (target.kind === 'youtube') { setPlaying(wasPlaying); return }
    if (wasPlaying) autoNext.current = true   // onCanPlay will start the new station
  }

  if (!mounted) return null
  // Hide the floating widget on public/booking/login pages — staff-only tool.
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/book')) return null

  return (
    <>
      {/* YouTube sound — rendered OUTSIDE the panel so minimising the player or
          navigating pages never unmounts the video (which would kill the music).
          When the panel is closed the video keeps playing in an invisible box. */}
      {playing && !activePlaylist && station.kind === 'youtube' && (
        <div className={open
          ? 'fixed z-50 bottom-4 right-[21.5rem] w-72 rounded-xl overflow-hidden border-2 border-amber-300 shadow-2xl bg-black'
          : 'fixed z-0 bottom-0 right-0 w-px h-px opacity-0 overflow-hidden pointer-events-none'}>
          <iframe
            title={station.name}
            width="100%"
            height={open ? 170 : 2}
            src={station.videoId
              ? `https://www.youtube-nocookie.com/embed/${station.videoId}?autoplay=1&loop=1&playlist=${station.videoId}&modestbranding=1&rel=0`
              : `https://www.youtube-nocookie.com/embed/videoseries?list=${station.playlistId}&autoplay=1&modestbranding=1&rel=0`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}
      {playing && playlistIsYt && plYtIds[plIdx] && (
        <div className={open
          ? 'fixed z-50 bottom-4 right-[21.5rem] w-72 rounded-xl overflow-hidden border-2 border-amber-300 shadow-2xl bg-black'
          : 'fixed z-0 bottom-0 right-0 w-px h-px opacity-0 overflow-hidden pointer-events-none'}>
          <iframe
            key={plIdx}
            title={activePlaylist?.name || 'Playlist'}
            width="100%"
            height={open ? 180 : 2}
            src={`https://www.youtube.com/embed/${plYtIds[plIdx]}?autoplay=1&modestbranding=1&rel=0${plYtIds.length > 1 ? `&playlist=${plYtIds.slice(plIdx + 1).concat(plYtIds.slice(0, plIdx)).join(',')}` : ''}`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          />
        </div>
      )}

      {/* Hidden audio element — used for radio streams AND uploaded playlist tracks */}
      {((activePlaylist && !playlistIsYt) || station.kind === 'audio') && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setError(activePlaylist ? 'Could not play that track.' : 'Station went off-air — try another.')}
          onCanPlay={() => { if (autoNext.current) { autoNext.current = false; audioRef.current?.play().then(() => setPlaying(true)).catch(() => {}) } }}
          onTimeUpdate={(e) => setCurTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
          onDurationChange={(e) => setDuration(isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
          onEnded={() => {
            // Auto-advance to the next song; onCanPlay starts it once it's loaded.
            if (!activePlaylist || playlistIsYt || !activePlaylist.tracks.length) return
            autoNext.current = true
            setPlIdx((i) => (i + 1) % activePlaylist.tracks.length)
          }}
        />
      )}

      {/* Floating widget — bottom-right */}
      <div className="fixed bottom-4 right-4 z-50">
        {open ? (
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#D72027] w-80 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">{activePlaylist ? '🎵' : station.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm truncate">{activePlaylist ? activePlaylist.name : station.name}</div>
                <div className="text-[10px] opacity-80 truncate">{activePlaylist ? (plTrack?.title ?? 'Your playlist') : station.vibe}</div>
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
              <div className="flex items-center gap-2">
                {activePlaylist && (
                  <button onClick={prevTrack} className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 text-base" aria-label="Previous song" title="Previous song">⏮</button>
                )}
                <button
                  onClick={toggle}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md transition-all shrink-0 ${
                    playing
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                      : 'bg-gradient-to-br from-[#FFC107] to-amber-500 text-zinc-900'
                  }`}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? '⏸' : '▶'}
                </button>
                {activePlaylist && (
                  <button onClick={nextTrack} className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 text-base" aria-label="Next song" title="Next song">⏭</button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-600">{playing ? 'Now playing' : 'Paused'}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    {playlistIsYt ? 'YouTube playlist' : activePlaylist ? (plTrack?.title || 'Your playlist') : (station.kind === 'youtube' && playing ? 'YouTube playlist · use volume on the video' : playing ? 'Streaming live' : 'Tap play')}
                  </div>
                </div>
              </div>

              {/* Scrub bar — drag to anywhere in the song (uploaded playlist tracks) */}
              {activePlaylist && !playlistIsYt && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 w-8 tabular-nums">{fmtTime(curTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={Math.min(curTime, duration || 0)}
                    onChange={(e) => seek(parseFloat(e.target.value))}
                    className="flex-1 accent-[#D72027]"
                    aria-label="Song position"
                    disabled={!duration}
                  />
                  <span className="text-[10px] text-zinc-400 w-8 tabular-nums text-right">{fmtTime(duration)}</span>
                </div>
              )}

              {/* YouTube video renders in the floating window beside the player —
                  it stays alive when this panel is minimised. */}
              {!activePlaylist && station.kind === 'youtube' && playing && (
                <div className="text-[10px] text-zinc-500 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">🎬 Video playing in the floating window — minimising the player keeps the music going.</div>
              )}

              {playlistIsYt && playing && (
                <div className="text-[10px] text-zinc-500 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">🎬 Playlist playing in the floating window — it keeps going when you minimise.</div>
              )}

              {/* Song list — see every song and tap any one to play it (iPod-style) */}
              {activePlaylist && activePlaylist.tracks.length > 0 && (
                <div className="border-t border-zinc-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 truncate">🎵 {activePlaylist.name}</div>
                    <button
                      onClick={() => { setPlId(null); audioRef.current?.pause() }}
                      className="text-[9px] font-bold text-zinc-400 hover:text-zinc-700 shrink-0"
                      title="Back to radio stations"
                    >
                      ← Radio
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
                    {activePlaylist.tracks.map((t, i) => {
                      const cur = i === plIdx
                      return (
                        <button
                          key={i}
                          onClick={() => playTrackAt(i)}
                          className={`w-full text-left rounded-lg px-2 py-1.5 text-xs flex items-center gap-2 ${
                            cur ? 'bg-gradient-to-br from-[#FFC107] to-amber-400 text-zinc-900 font-extrabold' : 'hover:bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          <span className="w-4 text-center shrink-0 text-[11px]">{cur && playing ? '▶' : i + 1}</span>
                          <span className="truncate">{t.title}</span>
                          {t.yt && <span className="ml-auto text-[8px] opacity-50 shrink-0">YT</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Volume — for radio streams AND uploaded playlists; YouTube uses its own controls */}
              {((activePlaylist && !playlistIsYt) || (!activePlaylist && station.kind === 'audio')) && (
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

              {/* Your playlists */}
              {playlists.length > 0 && (
                <div className="border-t border-zinc-100 pt-3">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-2">🎵 Your playlists</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {playlists.map((pl) => (
                      <button key={pl.id} onClick={() => pickPlaylist(pl.id)}
                        className={`text-left rounded-lg px-2 py-1.5 text-xs flex items-center justify-between gap-2 ${plId === pl.id ? 'bg-gradient-to-br from-[#FFC107] to-amber-400 text-zinc-900 font-extrabold shadow' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-bold'}`}>
                        <span className="truncate">🎶 {pl.name}</span>
                        <span className="text-[9px] opacity-70 shrink-0">{pl.tracks.length}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
