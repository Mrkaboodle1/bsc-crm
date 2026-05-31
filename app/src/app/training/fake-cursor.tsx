'use client'

// FakeCursor — overlay that auto-moves a mouse pointer around the demo
// iframe behind Jacky, so when she says "click the search bar" or
// "tap the Inbox tile", something is visibly happening on screen.
//
// Positions are percentages of the container, so it works over any demo
// page. The path is generic (header → sidebar → search → tiles → list →
// detail) but believable for almost any CRM walkthrough.

import { useEffect, useState, useRef } from 'react'

type Spot = { atSec: number; x: number; y: number; click?: boolean; label?: string }

// Generic believable trail: 9 stops across ~30s, hitting common CRM zones.
const DEFAULT_PATH: Spot[] = [
  { atSec:  1.5, x: 50, y: 16, label: 'page header' },
  { atSec:  5,   x: 22, y: 30, click: true, label: 'sidebar item' },
  { atSec:  8,   x: 55, y: 22, click: true, label: 'search bar' },
  { atSec: 11.5, x: 70, y: 28, label: 'filter pill' },
  { atSec: 14.5, x: 48, y: 50, click: true, label: 'list row' },
  { atSec: 18,   x: 78, y: 56, label: 'detail panel' },
  { atSec: 21,   x: 36, y: 72, click: true, label: 'action button' },
  { atSec: 24,   x: 62, y: 78, label: 'secondary action' },
  { atSec: 27.5, x: 50, y: 40, click: true, label: 'confirm' },
]

export function FakeCursor({ videoRef, path = DEFAULT_PATH }: { videoRef: React.RefObject<HTMLVideoElement | null>; path?: Spot[] }) {
  const [pos, setPos] = useState({ x: path[0]?.x ?? 50, y: path[0]?.y ?? 50 })
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null)
  const rippleKey = useRef(0)
  const lastIdx = useRef(-1)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTick = () => {
      const t = v.currentTime
      // Find latest spot whose atSec <= currentTime.
      let idx = -1
      for (let i = 0; i < path.length; i++) if (path[i].atSec <= t) idx = i
      if (idx < 0) return
      if (idx !== lastIdx.current) {
        const s = path[idx]
        setPos({ x: s.x, y: s.y })
        if (s.click) {
          rippleKey.current++
          setRipple({ x: s.x, y: s.y, key: rippleKey.current })
        }
        lastIdx.current = idx
      }
    }
    v.addEventListener('timeupdate', onTick)
    return () => v.removeEventListener('timeupdate', onTick)
  }, [videoRef, path])

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {/* Click ripple */}
      {ripple && (
        <span
          key={ripple.key}
          className="absolute bsc-ripple"
          style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
        />
      )}
      {/* Cursor */}
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        style={{
          position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
          transform: 'translate(-6px, -4px)',
          transition: 'left 900ms cubic-bezier(.4,.0,.2,1), top 900ms cubic-bezier(.4,.0,.2,1)',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
        }}
      >
        <path d="M5 3 L5 19 L9 15 L12 22 L14 21 L11 14 L17 13 Z" fill="#fff" stroke="#1a0f24" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <style>{`
        .bsc-ripple {
          width: 36px; height: 36px;
          margin-left: -18px; margin-top: -18px;
          border-radius: 9999px;
          border: 3px solid rgba(255, 220, 80, .95);
          background: rgba(255, 220, 80, .15);
          animation: bsc-ripple 700ms ease-out forwards;
        }
        @keyframes bsc-ripple {
          0%   { transform: scale(0.4); opacity: 1; }
          80%  { opacity: .35; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
