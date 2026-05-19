'use client'

// Tiny client hook that talks to /api/ai-text. Used everywhere we offer a
// "✨ Generate with AI" affordance.

import { useState } from 'react'

type Task = 'rewrite' | 'extend' | 'shorten' | 'social' | 'email' | 'hero' | 'free' | 'bullets'
type Tone = 'professional' | 'friendly' | 'playful' | 'urgent'
type Platform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'email'

type GenerateInput = {
  task?: Task
  prompt: string
  context?: string
  tone?: Tone
  maxWords?: number
  platform?: Platform
  variants?: number
}

export function useAiText() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(input: GenerateInput): Promise<{ text?: string; variants?: string[] } | null> {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/ai-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as { error?: string }))
        setError(j.error ?? `Request failed (${r.status})`)
        return null
      }
      return await r.json()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      return null
    } finally {
      setBusy(false)
    }
  }

  return { generate, busy, error }
}
