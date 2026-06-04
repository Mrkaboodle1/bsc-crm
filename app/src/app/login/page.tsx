'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Email + password — used by admin (office computer) and coaches (studio tablet).
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message === 'Invalid login credentials'
        ? 'That email or password isn’t right. Try again.'
        : error.message)
      return
    }

    // Full navigation so the server picks up the new session cookie.
    // Coaches get bounced to /roll-call by the dashboard gate.
    window.location.assign('/dashboard')
  }

  // Magic link — passwordless backup.
  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const supabase = createBrowserSupabase()
    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: true,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    setStatus('sent')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-amber-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎪</div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            Big Star Circus
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to your CRM</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-t-8 border-[#D72027]">
          {status === 'sent' ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">📩</div>
              <h2 className="text-xl font-extrabold text-zinc-900 mb-2">Check your email</h2>
              <p className="text-sm text-zinc-600 mb-4">
                We sent a sign-in link to <strong>{email}</strong>. Tap it on this device to log in.
              </p>
              <button
                onClick={() => {
                  setStatus('idle')
                  setMode('password')
                }}
                className="text-sm text-[#D72027] hover:underline font-bold"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={mode === 'password' ? handlePassword : handleMagic} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="you@bigstarcircus.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'sending'}
                  className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base focus:border-[#D72027] focus:outline-none disabled:opacity-50"
                />
              </div>

              {mode === 'password' && (
                <div>
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={status === 'sending'}
                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base focus:border-[#D72027] focus:outline-none disabled:opacity-50"
                  />
                </div>
              )}

              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
                  {errorMsg || 'Something went wrong. Try again.'}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending' || !email || (mode === 'password' && !password)}
                className="w-full bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'sending'
                  ? (mode === 'password' ? 'Signing in…' : 'Sending link…')
                  : (mode === 'password' ? 'Sign in' : 'Send me a sign-in link')}
              </button>

              <p className="text-xs text-zinc-500 text-center pt-2">
                {mode === 'password' ? (
                  <button
                    type="button"
                    onClick={() => { setMode('magic'); setStatus('idle'); setErrorMsg('') }}
                    className="text-[#D72027] hover:underline font-bold"
                  >
                    Email me a sign-in link instead
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMode('password'); setStatus('idle'); setErrorMsg('') }}
                    className="text-[#D72027] hover:underline font-bold"
                  >
                    Use a password instead
                  </button>
                )}
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          Big Star Circus CRM · v0.1
        </p>
      </div>
    </div>
  )
}
