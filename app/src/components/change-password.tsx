'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

// Lets the signed-in user change their own CRM login password.
export function ChangePassword({ email }: { email: string }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save() {
    setMsg(null)
    if (pw.length < 8) { setMsg({ ok: false, text: 'Use at least 8 characters.' }); return }
    if (pw !== pw2) { setMsg({ ok: false, text: "The two passwords don't match." }); return }
    setBusy(true)
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) { setMsg({ ok: false, text: error.message }); return }
    setPw(''); setPw2(''); setMsg({ ok: true, text: 'Password changed ✓ — use it next time you log in.' })
  }

  const inp = 'w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027]'
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 max-w-md">
      <div className="flex items-center gap-2 mb-1"><KeyRound size={18} className="text-[#D72027]" /><h3 className="font-extrabold text-zinc-900">Change your password</h3></div>
      <p className="text-xs text-zinc-500 mb-3">Signed in as <strong>{email}</strong>. Set a new password for logging into the CRM.</p>
      <div className="space-y-2.5">
        <div className="relative">
          <input type={show ? 'text' : 'password'} className={inp} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 8 characters)" autoComplete="new-password" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
        <input type={show ? 'text' : 'password'} className={inp} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Type it again" autoComplete="new-password" />
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
        <button onClick={save} disabled={busy || !pw || !pw2} className="bg-[#D72027] text-white font-extrabold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50">{busy ? 'Saving…' : 'Update password'}</button>
      </div>
      <p className="text-[11px] text-zinc-400 mt-3">Tip: use something only you know, and keep it somewhere safe. We never see it.</p>
    </div>
  )
}
