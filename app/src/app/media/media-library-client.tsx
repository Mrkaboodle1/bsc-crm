'use client'

// /media landing client — wraps the shared MediaPicker in embedded mode
// and surfaces a "Copy URL" / "Use in builder" affordance on pick.

import { useState } from 'react'
import { MediaPicker } from '@/components/media/media-picker'
import type { MediaItem } from './actions'

export function MediaLibraryClient() {
  const [picked, setPicked] = useState<MediaItem | null>(null)

  return (
    <div className="space-y-4">
      {picked && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picked.url} alt={picked.alt_text ?? ''} className="w-14 h-14 object-cover rounded-lg shadow" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-extrabold text-zinc-900 truncate">{picked.filename ?? picked.prompt ?? 'Image'}</div>
            <div className="text-[10px] font-mono text-zinc-500 truncate">{picked.url}</div>
          </div>
          <button
            onClick={() => { navigator.clipboard?.writeText(picked.url).catch(() => {}); }}
            className="text-xs font-bold bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-50"
          >
            🔗 Copy URL
          </button>
          <button
            onClick={() => setPicked(null)}
            className="text-zinc-400 hover:text-zinc-900 text-base leading-none"
            aria-label="Dismiss"
          >×</button>
        </div>
      )}
      <MediaPicker onPick={setPicked} onClose={() => {}} embedded />
    </div>
  )
}
