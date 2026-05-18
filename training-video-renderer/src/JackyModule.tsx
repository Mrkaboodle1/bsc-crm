// Remotion composition for one training module. Renders a 1920x1080 video:
//
//   ┌─────────────────────────────────────────────────────────────────┐
//   │  [Module N of 11]                  BIG STAR CIRCUS              │
//   │                                                                 │
//   │   ┌──────────┐    TITLE OF THE MODULE                           │
//   │   │  JACKY   │    Subtitle line.                                │
//   │   │  PORTRAIT│                                                  │
//   │   │  (talks) │    ★ Bullet point 1                              │
//   │   │          │    ★ Bullet point 2 (revealed one at a time)     │
//   │   └──────────┘    ★ Bullet point 3                              │
//   │                                                                 │
//   │   ● Talking pip while Jacky speaks                              │
//   └─────────────────────────────────────────────────────────────────┘
//
// Jacky's portrait animates with breathing + blinks. Her mouth area pulses
// using audio amplitude sampled from the MP3 at the current frame —
// real lip-sync-feel, no external services.

import React from 'react'
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { useAudioData, visualizeAudio } from '@remotion/media-utils'
import type { TrainingModule } from './modules'

export const JackyModule: React.FC<{
  module: TrainingModule
  durationInFrames?: number
}> = ({ module }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const audioSrc = staticFile(`${module.id}.mp3`)
  const audioData = useAudioData(audioSrc)

  // Sample audio amplitude at the current frame to drive mouth animation.
  // visualizeAudio returns a smoothed bar array; we use a few low bands so
  // the mouth opens on vowels, not just bass.
  let mouthOpen = 0
  if (audioData) {
    const bars = visualizeAudio({
      fps,
      frame,
      audioData,
      numberOfSamples: 16,
    })
    // The first 4-5 bands are the voice fundamentals; average them.
    const voice = (bars.slice(0, 5).reduce((a, b) => a + b, 0)) / 5
    mouthOpen = Math.min(1, voice * 5) // boost
  }

  // Bullets reveal over the duration of the module — first appears at
  // ~10% in, last by ~85% in.
  const bulletWindowStart = Math.floor(durationInFrames * 0.1)
  const bulletWindowEnd = Math.floor(durationInFrames * 0.85)
  const bulletStep = Math.max(1, Math.floor((bulletWindowEnd - bulletWindowStart) / module.bullets.length))

  return (
    <AbsoluteFill style={{ backgroundColor: '#18181b', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Audio track */}
      <Audio src={audioSrc} />

      {/* Background radial gradients — BSC red and yellow */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 18% 22%, rgba(255,193,7,0.18) 0%, transparent 35%), radial-gradient(circle at 82% 78%, rgba(215,32,39,0.22) 0%, transparent 42%)',
        }}
      />

      {/* Subtle vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Top bar — module pill + brand */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 48px',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            color: '#3f3f46',
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 0.5,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          }}
        >
          Module {module.number} of 11
        </div>
        <div
          style={{
            color: '#FFC107',
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          ★ Big Star Circus CRM
        </div>
      </div>

      {/* Body — two columns */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          paddingTop: 130,
          paddingBottom: 90,
          paddingLeft: 80,
          paddingRight: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 80,
        }}
      >
        {/* LEFT — Jacky video avatar */}
        <div
          style={{
            width: 520,
            height: 520,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <JackyTalkingHead frame={frame} fps={fps} mouthOpen={mouthOpen} emoji={module.emoji} />
        </div>

        {/* RIGHT — title + bullets */}
        <div style={{ flex: 1, color: '#fafafa' }}>
          {/* Title slides in from right at frame 0 */}
          <TitleBlock title={module.title} subtitle={module.subtitle} frame={frame} fps={fps} />

          <div style={{ marginTop: 50, display: 'flex', flexDirection: 'column', gap: 22 }}>
            {module.bullets.map((b, i) => {
              const appearAt = bulletWindowStart + i * bulletStep
              return (
                <Sequence key={i} from={appearAt} durationInFrames={durationInFrames - appearAt}>
                  <BulletPoint text={b} appearedAt={appearAt} />
                </Sequence>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 14,
          color: 'rgba(255,255,255,0.55)',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        <span style={{ color: '#FFC107' }}>●</span>
        <span>Jacky · BSC AI admin · bigstarcircus.com.au</span>
      </div>
    </AbsoluteFill>
  )
}

// ─────────────────────────────────────────────────────────────
// Jacky's talking head — portrait + mouth + blink + halo + emoji
// ─────────────────────────────────────────────────────────────

const JackyTalkingHead: React.FC<{
  frame: number
  fps: number
  mouthOpen: number // 0..1
  emoji: string
}> = ({ frame, fps, mouthOpen, emoji }) => {
  // Breath: gentle scale oscillation
  const breath = 1 + 0.015 * Math.sin((frame / fps) * 1.4)
  // Sway: slight rotation tied to mouthOpen so she moves while talking
  const sway = Math.sin((frame / fps) * 2) * (0.6 + mouthOpen * 1.4)

  // Blink: closed for ~3 frames every ~110 frames
  const blinkCycle = frame % 110
  const blinking = blinkCycle < 3

  // Halo pulse — louder voice = brighter halo
  const haloOpacity = 0.42 + mouthOpen * 0.45

  return (
    <div
      style={{
        position: 'relative',
        width: 480,
        height: 480,
        transform: `scale(${breath}) rotate(${sway}deg)`,
        transition: 'transform 60ms linear',
      }}
    >
      {/* Halo */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(215,32,39,0.85) 0%, rgba(255,193,7,0.65) 40%, transparent 75%)',
          opacity: haloOpacity,
          filter: 'blur(28px)',
          transform: `scale(${1 + mouthOpen * 0.2})`,
        }}
      />

      {/* Portrait */}
      <Img
        src={staticFile('jacky-avatar.png')}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '50%',
          border: '8px solid #ffffff',
          boxShadow: '0 25px 80px rgba(0,0,0,0.55)',
        }}
      />

      {/* Mouth overlay — sits over the lower-third of the face. Scales
          vertically with audio amplitude, giving real-time talking. */}
      <div
        style={{
          position: 'absolute',
          left: '36%',
          top: '66%',
          width: '28%',
          height: `${10 + mouthOpen * 28}px`,
          background: 'rgba(40, 20, 18, 0.55)',
          borderRadius: '50%',
          transformOrigin: 'center top',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Eye blink overlay — full-width thin lid that snaps closed at the
          blink frames. Sits across both eyes. */}
      <div
        style={{
          position: 'absolute',
          left: '22%',
          top: '40%',
          width: '56%',
          height: blinking ? '5%' : '0%',
          background: 'rgba(60, 38, 30, 0.85)',
          borderRadius: 4,
          transition: 'height 40ms ease-out',
        }}
      />

      {/* Module emoji — floats next to her shoulder */}
      <div
        style={{
          position: 'absolute',
          bottom: -10,
          right: -10,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: '#FFC107',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 90,
          boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
          border: '6px solid #ffffff',
        }}
      >
        {emoji}
      </div>

      {/* Talking pip */}
      <div
        style={{
          position: 'absolute',
          bottom: -42,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#FFC107',
          color: '#18181b',
          fontSize: 16,
          fontWeight: 900,
          letterSpacing: 3,
          textTransform: 'uppercase',
          padding: '6px 14px',
          borderRadius: 999,
          opacity: mouthOpen > 0.05 ? 0.9 : 0.25,
          boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
        }}
      >
        ● Talking
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Title block — slides in + fades up at the start
// ─────────────────────────────────────────────────────────────

const TitleBlock: React.FC<{
  title: string
  subtitle: string
  frame: number
  fps: number
}> = ({ title, subtitle, frame, fps }) => {
  const titleProgress = spring({ frame, fps, config: { damping: 18, stiffness: 70 } })
  const subtitleProgress = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 70 } })

  return (
    <div>
      <div
        style={{
          opacity: titleProgress,
          transform: `translateX(${interpolate(titleProgress, [0, 1], [40, 0])}px)`,
          fontSize: 72,
          fontWeight: 900,
          color: '#ffffff',
          lineHeight: 1.05,
          letterSpacing: -1,
          textShadow: '0 6px 18px rgba(0,0,0,0.45)',
        }}
      >
        {title}
      </div>
      <div
        style={{
          opacity: subtitleProgress,
          transform: `translateX(${interpolate(subtitleProgress, [0, 1], [40, 0])}px)`,
          fontSize: 30,
          fontWeight: 600,
          color: '#FFC107',
          marginTop: 18,
        }}
      >
        {subtitle}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Bullet point — fades up + slides in when its time arrives
// ─────────────────────────────────────────────────────────────

const BulletPoint: React.FC<{ text: string; appearedAt: number }> = ({ text }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 90 } })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 18,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [22, 0])}px)`,
      }}
    >
      <span style={{ color: '#FFC107', fontSize: 32, lineHeight: '36px', flexShrink: 0 }}>★</span>
      <span
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#e4e4e7',
          lineHeight: 1.35,
        }}
      >
        {text}
      </span>
    </div>
  )
}
