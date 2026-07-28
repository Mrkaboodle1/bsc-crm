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
    if (b.type === 'heading') return `<div style="font-weight:800;color:#A0151B;font-size:18px;margin:16px 0 8px;">${fmt(b.text)}</div>`
    if (b.type === 'text') return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333;">${fmt(b.text)}</p>`
    if (b.type === 'image') return b.url ? `<img src="${abs(b.url, baseUrl)}" alt="" style="width:100%;border-radius:10px;margin:0 0 14px;display:block;">` : ''
    if (b.type === 'event') {
      const btn = b.btnText ? `<a href="${abs(b.btnUrl, baseUrl) || '#'}" style="display:inline-block;background:${branding.accent};color:#1d1340;font-weight:800;font-size:14px;text-decoration:none;padding:11px 26px;border-radius:26px;">${fmt(b.btnText)}</a>` : ''
      return `<div style="background:#1d1340;border-radius:12px;padding:20px;text-align:center;margin:0 0 16px;">
        <div style="font-weight:800;color:#fff;font-size:17px;">${fmt(b.title)}</div>
        <div style="color:#c9b8ff;font-size:13px;margin:5px 0 10px;">${fmt(b.date)}</div>
        <p style="color:#e7e0ff;font-size:13px;line-height:1.6;margin:0 0 ${btn ? '14px' : '0'};">${fmt(b.blurb)}</p>${btn}</div>`
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
<tr><td style="padding:22px 26px;">${body}
  <div style="text-align:center;margin-top:18px;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:14px;">
    ${branding.name} · ${branding.phone} · <a href="https://${branding.website}" style="color:#D72027;">${branding.website}</a><br>
    ${opts.unsubscribeUrl ? `<a href="${opts.unsubscribeUrl}" style="color:#bbb;font-size:11px;">Unsubscribe</a>` : ''}
  </div>
</td></tr></table></td></tr></table></body></html>`
}
