'use client'

// AI social composer. Workflow:
//   1. User picks platform (Facebook / Instagram / LinkedIn / X / TikTok)
//   2. Picks a tone (friendly / professional / playful / urgent)
//   3. Types a topic ("term 2 enrolments open", "free trial offer for July", ...)
//   4. Clicks ✨ Generate — OpenAI returns 3 caption variants
//   5. Optionally clicks 🖼️ Generate image — DALL-E or Pollinations produces
//      a matching square/portrait image saved to the Media library
//   6. Picks favourite variant, hits Copy → ready to paste into the platform

import { Copy, Sparkles, ImageIcon, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAiText } from '@/lib/ai/use-ai-text'
import { generateMedia, type MediaItem } from '@/app/media/actions'
import { FacebookIcon, InstagramIcon, LinkedInIcon, TikTokIcon, XIcon } from '@/components/ui/brand-icons'

type Platform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok'
type Tone = 'professional' | 'friendly' | 'playful' | 'urgent'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconCmp = (props: any) => React.ReactElement
const PLATFORMS: { id: Platform; label: string; Icon: IconCmp; max: number }[] = [
  { id: 'facebook',  label: 'Facebook',     Icon: FacebookIcon,  max: 600 },
  { id: 'instagram', label: 'Instagram',    Icon: InstagramIcon, max: 2200 },
  { id: 'linkedin',  label: 'LinkedIn',     Icon: LinkedInIcon,  max: 3000 },
  { id: 'twitter',   label: 'X / Twitter',  Icon: XIcon,         max: 1120 },
  { id: 'tiktok',    label: 'TikTok',       Icon: TikTokIcon,    max: 2200 },
]

const TONES: { id: Tone; label: string }[] = [
  { id: 'friendly',     label: 'Friendly' },
  { id: 'professional', label: 'Professional' },
  { id: 'playful',      label: 'Playful' },
  { id: 'urgent',       label: 'Urgent' },
]

export function SocialComposer() {
  const [platform, setPlatform] = useState<Platform>('facebook')
  const [tone, setTone] = useState<Tone>('friendly')
  const [topic, setTopic] = useState('')
  const [variants, setVariants] = useState<string[]>([])
  const [pickedIdx, setPickedIdx] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const [image, setImage] = useState<MediaItem | null>(null)
  const [imgBusy, setImgBusy] = useState(false)
  const [imgError, setImgError] = useState<string | null>(null)

  const { generate, busy, error } = useAiText()

  async function generateCopy() {
    if (!topic.trim()) return
    setVariants([])
    setPickedIdx(null)
    const res = await generate({
      task: 'social',
      prompt: topic.trim(),
      platform,
      tone,
      variants: 3,
    })
    if (res?.variants?.length) setVariants(res.variants)
    else if (res?.text) setVariants([res.text])
  }

  async function generateImage() {
    if (!topic.trim()) return
    setImgError(null)
    setImgBusy(true)
    const dims = platform === 'instagram' ? { width: 1024, height: 1024 } : platform === 'tiktok' ? { width: 720, height: 1280 } : { width: 1280, height: 720 }
    const imagePrompt = `${topic.trim()} — professional marketing photo for Big Star Circus, warm circus-school vibe, vibrant but not cartoonish, real kids and coaches, natural lighting`
    // Try OpenAI first if available (cleaner, more reliable); the action
    // will fall back to Pollinations if the user hasn't added a key.
    let res = await generateMedia({ prompt: imagePrompt, provider: 'openai', ...dims })
    if (!res.ok && /API key not configured/i.test(res.error)) {
      res = await generateMedia({ prompt: imagePrompt, provider: 'pollinations', ...dims })
    }
    setImgBusy(false)
    if (res.ok) setImage(res.data)
    else setImgError(res.error)
  }

  function copyVariant(idx: number) {
    const text = variants[idx]
    navigator.clipboard?.writeText(text).then(() => {
      setPickedIdx(idx)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  const ActivePlatformIcon = PLATFORMS.find((p) => p.id === platform)!.Icon

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-7xl">
      {/* Composer */}
      <div className="xl:col-span-7 space-y-5">
        <Card>
          <CardHeader title="Platform" />
          <div className="flex items-center gap-2 flex-wrap">
            {PLATFORMS.map(({ id, label, Icon }) => {
              const active = platform === id
              return (
                <button
                  key={id}
                  onClick={() => setPlatform(id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    active ? 'border-[#D72027] bg-red-50 text-zinc-900' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Topic" subtitle="What's the post about? Be specific — 1–2 sentences works best." />
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={4}
            placeholder="Example: Term 2 enrolments open this Friday. We've added two new aerial classes for ages 8–12. First class is free."
            className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none font-medium text-zinc-900 placeholder:text-zinc-400"
          />
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 mr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tone</span>
            </div>
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                  tone === t.id ? 'border-[#D72027] bg-red-50 text-zinc-900' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Button
                onClick={() => void generateImage()}
                variant="outline"
                size="sm"
                icon={imgBusy ? Loader2 : ImageIcon}
                disabled={!topic.trim() || imgBusy}
                className={imgBusy ? 'animate-pulse' : ''}
              >
                {imgBusy ? 'Generating image…' : 'Generate matching image'}
              </Button>
              <Button
                onClick={() => void generateCopy()}
                variant="primary"
                size="sm"
                icon={busy ? Loader2 : Sparkles}
                disabled={!topic.trim() || busy}
                className={busy ? '[&>svg:first-child]:animate-spin' : ''}
              >
                {busy ? 'Generating…' : 'Generate 3 variants'}
              </Button>
            </div>
          </div>
          {error && <ErrorBox text={error} />}
          {imgError && <ErrorBox text={imgError} />}
        </Card>

        {/* Variants */}
        {variants.length > 0 && (
          <Card>
            <CardHeader
              title="Suggested captions"
              subtitle="Click a variant to copy it. Generate again for fresh ones."
              right={
                <Button onClick={() => void generateCopy()} variant="ghost" size="sm" icon={RefreshCw}>
                  Regenerate
                </Button>
              }
            />
            <ul className="space-y-2">
              {variants.map((v, i) => {
                const picked = pickedIdx === i
                return (
                  <li key={i}>
                    <button
                      onClick={() => copyVariant(i)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
                        picked ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Variant {i + 1}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600">
                          <Copy size={13} />
                          {picked && copied ? 'Copied!' : 'Copy'}
                        </span>
                      </div>
                      <pre className="mt-2 text-sm text-zinc-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {v}
                      </pre>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>

      {/* Preview rail */}
      <div className="xl:col-span-5">
        <Card sticky>
          <CardHeader title="Preview" subtitle="How the post will look once you paste it." />
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-[11px] font-bold">
                BSC
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  Big Star Circus
                </div>
                <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <ActivePlatformIcon size={11} />
                  <span>{PLATFORMS.find((p) => p.id === platform)!.label}</span>
                  <span>·</span>
                  <span>Sponsored</span>
                </div>
              </div>
            </div>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt="" className="w-full object-cover bg-zinc-200" style={{ aspectRatio: platform === 'tiktok' ? '9/16' : platform === 'instagram' ? '1/1' : '16/9' }} />
            ) : (
              <div
                className="w-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center text-zinc-500"
                style={{ aspectRatio: platform === 'tiktok' ? '9/16' : platform === 'instagram' ? '1/1' : '16/9' }}
              >
                <div className="text-center px-6">
                  <ImageIcon size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Click "Generate matching image" to fill this in</p>
                </div>
              </div>
            )}
            <div className="px-4 py-3 bg-white">
              {variants[pickedIdx ?? 0] ? (
                <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {variants[pickedIdx ?? 0]}
                </p>
              ) : (
                <p className="text-xs text-zinc-400 italic">Caption preview will appear here once you generate.</p>
              )}
            </div>
          </div>
          {image && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Image saved to your Media library. <a href="/media" className="text-[#D72027] font-semibold hover:underline">View library →</a>
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}

// Light wrappers — keep the markup repeating in this file scannable.

function Card({ children, sticky }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <section className={`bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 ${sticky ? 'sticky top-4' : ''}`}>
      {children}
    </section>
  )
}

function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h2 className="text-sm font-bold text-zinc-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="mt-3 bg-red-50 border-l-4 border-red-400 text-red-800 text-sm px-3 py-2 rounded-r-xl">
      <strong className="block text-xs font-bold uppercase tracking-wider mb-0.5">Generation failed</strong>
      {text}
    </div>
  )
}

