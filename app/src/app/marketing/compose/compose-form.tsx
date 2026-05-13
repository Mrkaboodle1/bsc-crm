'use client'

import { useMemo, useState, useTransition } from 'react'

type RecentRef = {
  id: string
  platform: string | null
  caption: string | null
  postedAt: string | null
  mediaKind: string
  aiPrompt: string | null
}

const PLATFORMS = [
  { id: 'instagram', label: '📸 Instagram' },
  { id: 'facebook',  label: '📘 Facebook' },
  { id: 'threads',   label: '🧵 Threads' },
  { id: 'tiktok',    label: '🎵 TikTok' },
] as const

// Prompt presets — clicking one populates the box. Tweaked for BSC's brand.
const PROMPT_PRESETS = [
  { label: 'Circus kids action', prompt: 'A vibrant photo of happy kids learning circus acrobatics in a colourful studio, dynamic action, bright lighting, professional photography, joyful expressions, ages 5-12' },
  { label: 'Aerial silks', prompt: 'A young performer on red aerial silks against a warm yellow background, mid-performance, graceful pose, professional photo, magical lighting' },
  { label: 'Birthday party hero', prompt: 'A circus-themed birthday party in full swing, kids laughing, colourful balloons, juggling props, warm party lighting, joyful celebration' },
  { label: 'Holiday programme', prompt: 'School-holiday circus programme for kids 5-12, big colourful gym, kids doing acrobatics and juggling, summery happy mood' },
  { label: 'Coach hero shot', prompt: 'A professional circus coach demonstrating a balance trick, red and yellow studio backdrop, action shot, confident smile, encouraging students' },
  { label: 'Trial come-and-try', prompt: 'A child trying circus skills for the first time, parent watching proudly, friendly coach helping, bright happy atmosphere, low-pressure vibe' },
] as const

export function ComposeForm({
  action,
  recent,
}: {
  action: (formData: FormData) => Promise<{ ok: true; id: string } | { ok: false; error: string }>
  recent: RecentRef[]
}) {
  const [platform, setPlatform] = useState<string>('instagram')
  const [caption, setCaption] = useState('')
  const [prompt, setPrompt] = useState('')
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000))
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [submitStatus, setSubmitStatus] = useState<'draft' | 'posted'>('draft')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Build the Pollinations URL when prompt + seed change
  const pollUrl = useMemo(() => {
    if (!prompt.trim()) return null
    const safePrompt = encodeURIComponent(prompt.trim().slice(0, 800))
    return `https://image.pollinations.ai/prompt/${safePrompt}?width=1080&height=1080&seed=${seed}&model=flux&nologo=true`
  }, [prompt, seed])

  function generate() {
    if (!pollUrl) return
    setGeneratedUrl(pollUrl)
  }

  function shuffle() {
    setSeed(Math.floor(Math.random() * 1_000_000))
    setGeneratedUrl(null) // force regenerate
    setTimeout(() => setGeneratedUrl(pollUrl), 50)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('status', submitStatus)
    fd.set('media_kind', generatedUrl ? 'ai_generated' : 'upload')
    fd.set('media_url', generatedUrl ?? '')
    fd.set('ai_prompt', prompt.trim())
    startTransition(async () => {
      const res = await action(fd)
      if (res && 'ok' in res && !res.ok) setError(res.error)
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: form */}
      <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Platform */}
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
            Platform
          </label>
          <input type="hidden" name="platform" value={platform} />
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  platform === p.id
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
            Caption *
          </label>
          <textarea
            name="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required
            rows={5}
            maxLength={2200}
            placeholder="Write the caption your kids' parents will read. Emojis welcome. #️⃣ Hashtags at the end."
            className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
          />
          <div className="text-[10px] text-zinc-400 text-right mt-1">{caption.length} / 2200</div>
        </div>

        {/* AI image generator */}
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
            Image prompt (AI generates a fresh picture — free)
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PROMPT_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPrompt(p.prompt)}
                className="text-[10px] uppercase tracking-wider font-extrabold bg-zinc-100 text-zinc-700 px-2 py-1 rounded hover:bg-zinc-200"
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={800}
            placeholder="Describe the image you want. Be specific about people, colours, mood, lighting."
            className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={generate}
              disabled={!prompt.trim()}
              className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50"
            >
              ✨ Generate image
            </button>
            {generatedUrl && (
              <button
                type="button"
                onClick={shuffle}
                className="bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
              >
                🎲 Shuffle
              </button>
            )}
            <span className="text-[10px] text-zinc-400 ml-auto">Powered by Pollinations.ai (free)</span>
          </div>
        </div>

        {/* Submit row */}
        <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
          <a href="/marketing" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 px-3 py-3">
            Cancel
          </a>
          <button
            type="submit"
            onClick={() => setSubmitStatus('draft')}
            disabled={pending}
            className="bg-white border-2 border-zinc-900 text-zinc-900 font-extrabold text-sm px-5 py-3 rounded-xl hover:bg-zinc-50 disabled:opacity-50"
          >
            {pending && submitStatus === 'draft' ? 'Saving…' : 'Save as draft'}
          </button>
          <button
            type="submit"
            onClick={() => setSubmitStatus('posted')}
            disabled={pending || !caption.trim()}
            className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {pending && submitStatus === 'posted' ? 'Logging…' : 'Log as posted'}
          </button>
        </div>

        <p className="text-[10px] text-zinc-400">
          &quot;Log as posted&quot; just records the post in the CRM history — it does NOT publish to Meta yet. We&apos;ll wire that to the Meta Graph in the next slice.
        </p>
      </form>

      {/* Right: preview + recents */}
      <aside className="space-y-4">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Preview</div>
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            {generatedUrl ? (
              <>
                <div className="aspect-square bg-zinc-100 relative overflow-hidden">
                  <img
                    src={generatedUrl}
                    alt="AI-generated preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                    Caption
                  </div>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap line-clamp-6">
                    {caption || <span className="text-zinc-400">Your caption will appear here</span>}
                  </p>
                </div>
              </>
            ) : (
              <div className="aspect-square flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                <div className="text-5xl mb-2">🖼</div>
                <p className="text-sm font-bold">Generate an image to preview the post</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Recently posted (last 10)</div>
          {recent.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5 text-center text-xs text-zinc-500">
              Nothing logged yet — this is your first post.
            </div>
          ) : (
            <ul className="bg-white rounded-2xl shadow-sm border border-zinc-200 divide-y divide-zinc-100">
              {recent.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                    {r.platform ?? 'draft'} · {r.postedAt ? new Date(r.postedAt).toLocaleDateString('en-AU') : 'draft'}
                  </div>
                  {r.caption && <p className="text-xs text-zinc-700 mt-0.5 line-clamp-2">{r.caption}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
