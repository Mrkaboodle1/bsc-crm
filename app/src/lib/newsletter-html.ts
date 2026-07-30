// Renders newsletter blocks (from the drag-and-drop editor) into a branded,
// email-client-safe HTML string for sending via Resend. Mirrors the editor
// preview. Used server-side by the send route.
import type { Block } from '@/components/newsletter-editor'

export type EmailBranding = { name: string; logoUrl: string; primary: string; accent: string; phone: string; website: string }

// Minimal, safe inline-formatting: **bold**, __underline__, *italic*, newlines.
function fmt(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc(text || '')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<u>$1</u>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}
const abs = (u: string, base: string) => !u ? '' : (/^https?:\/\//.test(u) ? u : base + (u.startsWith('/') ? u : '/' + u))

export function renderNewsletterHtml(opts: {
  blocks: Block[]; subject: string; branding: EmailBranding; monthLabel: string; baseUrl: string; unsubscribeUrl?: string
  header?: { show: boolean; title: string; subtitle: string }
}): string {
  const { blocks, branding, monthLabel, baseUrl } = opts
  const hdr = opts.header ?? { show: true, title: branding.name, subtitle: `★ ${monthLabel} ★` }
  const body = blocks.map((b) => {
    if (b.type === 'heading') return `<div style="font-weight:800;color:#A0151B;font-size:20px;margin:26px 0 10px;padding-left:12px;border-left:4px solid #D72027;">${fmt(b.text)}</div>`
    if (b.type === 'text') return `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#27272a;">${fmt(b.text)}</p>`
    if (b.type === 'image') return b.url ? `<img src="${abs(b.url, baseUrl)}" alt="" style="width:100%;border-radius:12px;margin:0 0 20px;display:block;">` : ''
    if (b.type === 'event') {
      const btn = b.btnText ? `<a href="${abs(b.btnUrl, baseUrl) || '#'}" style="display:inline-block;background:${branding.accent};color:#1d1340;font-weight:800;font-size:14px;text-decoration:none;padding:11px 26px;border-radius:26px;">${fmt(b.btnText)}</a>` : ''
      return `<div style="background:#1d1340;border-radius:16px;padding:26px 22px;text-align:center;margin:4px 0 22px;">
        <div style="font-weight:800;color:#fff;font-size:20px;">${fmt(b.title)}</div>
        <div style="display:inline-block;background:rgba(255,255,255,.12);color:#ffe08a;font-size:13px;font-weight:700;padding:5px 14px;border-radius:20px;margin:8px 0 12px;">${fmt(b.date)}</div>
        <p style="color:#e7e0ff;font-size:15px;line-height:1.65;margin:0 0 ${btn ? '16px' : '0'};">${fmt(b.blurb)}</p>${btn}</div>`
    }
    if (b.type === 'button') return `<div style="text-align:center;margin:0 0 16px;"><a href="${abs(b.url, baseUrl) || '#'}" style="display:inline-block;background:${branding.primary};color:#fff;font-weight:800;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:26px;">${fmt(b.text)}</a></div>`
    return `<hr style="border:0;border-top:1px solid #eee;margin:16px 0;">`
  }).join('\n')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fbf7ef;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7ef;padding:20px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
${hdr.show ? `<tr><td style="background:linear-gradient(135deg,${branding.primary},#A0151B);padding:24px;text-align:center;">
  <img src="${abs(branding.logoUrl, baseUrl)}" alt="" style="height:48px;margin:0 auto 8px;display:block;">
  ${hdr.title ? `<div style="color:#fff;font-weight:800;font-size:20px;">${hdr.title}</div>` : ''}
  ${hdr.subtitle ? `<div style="color:#ffe08a;font-size:13px;margin-top:4px;">${hdr.subtitle}</div>` : ''}
</td></tr>` : ''}
<tr><td style="padding:26px 30px;">${body}
  <div style="text-align:center;margin-top:26px;font-size:13px;color:#8a8a8a;border-top:1px solid #eee;padding-top:18px;line-height:1.7;">
    You're getting this because you're part of the ${branding.name} family 🎪<br>
    <strong style="color:#555;">${branding.name}</strong> · ${branding.phone} · <a href="https://${branding.website}" style="color:#D72027;">${branding.website}</a><br>
    ${opts.unsubscribeUrl ? `<a href="${opts.unsubscribeUrl}" style="color:#bbb;font-size:11px;">Unsubscribe</a>` : ''}
  </div>
</td></tr></table></td></tr></table></body></html>`
}
