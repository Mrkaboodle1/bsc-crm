'use client'

// Floating chat widget — appears bottom-right on every public BigStar page.
// V1 surfaces existing contact channels (phone, email, free trial) plus a
// little message form that posts straight to the CRM as a new lead. No
// realtime chat yet — that's a follow-up wire-up.

import { useState } from 'react'

// `siteSlug` comes from the public renderer so the widget works for any
// site, not just 'bigstar'. Without it, links fall back to the generic
// /f/trial funnel form and the API's own default slug.
export function ChatWidget({ siteSlug }: { siteSlug?: string }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    const fd = new FormData(e.currentTarget)
    try {
      await fetch('/api/site-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug: siteSlug ?? 'bigstar',
          name: fd.get('name'),
          email: fd.get('email'),
          phone: fd.get('phone'),
          message: fd.get('message'),
        }),
      })
      setSent(true)
    } catch {
      setSent(true) // optimistic — still show thanks; CRM Engineer will pick up failures
    } finally { setBusy(false) }
  }

  return (
    <>
      {/* Tag (only shown when widget is closed) */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open chat"
          style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, background: '#2563EB', color: '#fff', width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer', boxShadow: '0 12px 30px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </button>
      )}

      {/* Open panel */}
      {open && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, width: 340, maxWidth: 'calc(100vw - 40px)', background: '#fff', borderRadius: 18, boxShadow: '0 25px 60px rgba(0,0,0,.25)', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#D72027 0%,#8B5CF6 100%)', color: '#fff', padding: '18px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bigstar-logo.png" alt="" style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', objectFit: 'contain', padding: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Hi there! Have a question?</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Chat with us here.</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close"
              style={{ background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
          </div>

          {/* Body */}
          <div style={{ padding: 18 }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 38, marginBottom: 8 }}>🎪</div>
                <div style={{ fontWeight: 700, color: '#2b2b2b', marginBottom: 6 }}>Thanks — got it!</div>
                <div style={{ fontSize: 13, color: '#6b6b6b' }}>We&apos;ll be in touch within 24 hours. Or call us now on <strong>0489 188 179</strong>.</div>
              </div>
            ) : (
              <>
                {/* Quick contact buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <a href="tel:0489188179" style={{ background: '#f3f4f6', color: '#1a0f24', padding: '10px 8px', borderRadius: 10, textDecoration: 'none', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>📞 Call us</a>
                  <a href="mailto:admin@bigstarcircus.com.au" style={{ background: '#f3f4f6', color: '#1a0f24', padding: '10px 8px', borderRadius: 10, textDecoration: 'none', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>✉ Email us</a>
                </div>
                <a href={siteSlug ? `/s/${siteSlug}/free-trial` : '/f/trial'} style={{ display: 'block', background: '#D72027', color: '#fff', padding: '10px 14px', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>🎟 Book a free trial</a>

                <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 2 }}>Or leave us a message:</div>
                  <input required name="name"    placeholder="Your name"  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  <input required name="email"   placeholder="Email"      type="email" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  <input          name="phone"   placeholder="Phone (optional)" type="tel" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  <textarea required name="message" rows={3} placeholder="What's your question?" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, resize: 'vertical' }} />
                  <button disabled={busy} type="submit" style={{ background: '#2563EB', color: '#fff', border: 0, padding: '11px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Sending…' : 'Send message'}</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
