'use client'

import { useEffect, useState } from 'react'

// Live Brisbane date + time shown on the Home dashboard.
export function HomeClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!now) return null
  const date = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Brisbane' })
  const time = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Australia/Brisbane' })
  return (
    <div className="flex items-baseline gap-3 text-sm text-zinc-500">
      <span className="font-medium text-zinc-700">{date}</span>
      <span className="tabular-nums text-zinc-500">{time}</span>
    </div>
  )
}
