'use client'

import { useEffect, useRef, useState } from 'react'

type UserMessage = { role: 'user'; content: string }
type AssistantMessage = {
  role: 'assistant'
  content: string
  toolEvents?: Array<{ name: string; input: unknown; result: unknown }>
}
type UiMessage = UserMessage | AssistantMessage

// What we send to the API — Claude's tool_use blocks come back as structured content,
// but for the user-facing chat we just track text + tool summary. The API request
// uses { role, content: string } messages; the route maintains the full structured
// history on its side via the tool-call loop.
type ApiMessage = { role: 'user' | 'assistant'; content: string }

const STARTER_PROMPTS = [
  'Show me leads from the last 7 days',
  "Draft a follow-up SMS to all trial families about this week's free class",
  'Who needs my approval right now?',
  'Move Alannah Bodman to trial stage',
] as const

export function JackyChat({ userName }: { userName: string | null }) {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      role: 'assistant',
      content: `Hey ${userName ?? 'Rhett'}! 🎪 I'm here. I can read your families, check the approval queue, look at recent leads, and queue email/SMS drafts for you to approve. What do you want to do?`,
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setError(null)
    setInput('')

    const userMsg: UserMessage = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setBusy(true)

    try {
      // Build the API messages array — just text contents (route handles tool loop internally)
      const apiMessages: ApiMessage[] = next.map((m) => ({ role: m.role, content: m.content }))
      const r = await fetch('/api/jacky-ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const data = (await r.json()) as
        | { reply: string; toolEvents: Array<{ name: string; input: unknown; result: unknown }> }
        | { error: string }

      if ('error' in data) {
        setError(data.error)
        return
      }
      setMessages([...next, { role: 'assistant', content: data.reply, toolEvents: data.toolEvents }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[800px] bg-white rounded-2xl shadow-sm border-2 border-zinc-200 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-zinc-50 to-white"
      >
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
        {busy && (
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D72027] to-[#A0151B] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
              J
            </div>
            <div className="bg-white border-2 border-zinc-200 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-zinc-500 italic">
              Jacky is thinking…
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Starter prompts shown only on first turn */}
      {messages.length <= 1 && !busy && (
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50 flex gap-2 flex-wrap">
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="text-xs font-bold text-zinc-600 bg-white border border-zinc-200 hover:border-[#D72027] hover:text-[#D72027] px-3 py-2 rounded-lg"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="border-t border-zinc-200 p-3 flex items-end gap-2 bg-white"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Ask Jacky to do something… (Shift+Enter for new line)"
          rows={1}
          disabled={busy}
          className="flex-1 resize-none px-4 py-3 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}

function MessageBubble({ msg }: { msg: UiMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex gap-3 items-start flex-row-reverse">
        <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
          You
        </div>
        <div className="bg-zinc-900 text-white rounded-2xl rounded-tr-md px-4 py-3 text-sm max-w-[75%] whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3 items-start">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D72027] to-[#A0151B] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
        J
      </div>
      <div className="max-w-[75%] space-y-2">
        <div className="bg-white border-2 border-zinc-200 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-zinc-900 whitespace-pre-wrap">
          {msg.content || <span className="italic text-zinc-400">(silent — only tool calls)</span>}
        </div>
        {msg.toolEvents && msg.toolEvents.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-zinc-500 font-bold hover:text-zinc-900 px-2">
              🔧 {msg.toolEvents.length} action{msg.toolEvents.length === 1 ? '' : 's'} taken
            </summary>
            <ul className="mt-1 ml-2 space-y-1">
              {msg.toolEvents.map((ev, i) => (
                <li key={i} className="bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2">
                  <div className="font-bold text-zinc-800">
                    {ev.name}
                  </div>
                  <div className="text-zinc-600 mt-0.5">{summary(ev.result)}</div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  )
}

function summary(result: unknown): string {
  if (typeof result === 'string') return result
  try {
    return JSON.stringify(result).slice(0, 160)
  } catch {
    return '(result)'
  }
}
