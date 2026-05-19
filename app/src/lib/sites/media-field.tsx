'use client'

// Puck custom field — replaces the plain "URL" text input on Image and Hero
// blocks with a button that opens the MediaPicker. Selecting / uploading /
// generating an image sets the field value to the public URL.

import { useState } from 'react'
import type { CustomField } from '@measured/puck'
import { MediaPicker } from '@/components/media/media-picker'

export function makeMediaField(label = 'Image'): CustomField<string> {
  return {
    type: 'custom',
    label,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: ({ value, onChange }: any) => <MediaFieldInner value={value} onChange={onChange} label={label} />,
  }
}

function MediaFieldInner({
  value,
  onChange,
  label,
}: {
  value?: string
  onChange: (v: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">{label}</label>
      {value ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOpen(true)}
              className="flex-1 text-xs font-extrabold bg-white border border-zinc-200 hover:border-[#D72027] text-zinc-700 px-3 py-1.5 rounded-lg"
            >
              🔄 Change image
            </button>
            <button
              onClick={() => onChange('')}
              className="text-xs font-bold text-zinc-500 hover:text-red-600 px-2 py-1.5"
              title="Remove image"
            >
              ×
            </button>
          </div>
          <details className="mt-1.5">
            <summary className="cursor-pointer text-[10px] font-bold text-zinc-400 hover:text-zinc-900">▸ Paste URL manually</summary>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="mt-1 w-full px-2 py-1 border border-zinc-200 rounded text-[11px] font-mono"
            />
          </details>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-white border-2 border-dashed border-zinc-300 hover:border-[#D72027] hover:bg-red-50 text-zinc-600 hover:text-[#D72027] font-extrabold text-xs px-3 py-6 rounded-xl flex flex-col items-center gap-1"
        >
          <span className="text-3xl">🖼️</span>
          Choose, upload, or generate
        </button>
      )}

      {open && (
        <MediaPicker
          onClose={() => setOpen(false)}
          onPick={(item) => { onChange(item.url); setOpen(false) }}
        />
      )}
    </div>
  )
}
