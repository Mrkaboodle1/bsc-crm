// Shared email sign-off for staff / coach emails.
// Plain-text version (for the email's text fallback) + an HTML version, and a
// helper that wraps a plain message body in tidy HTML with the signature below it.

export const SIGNATURE_TEXT =
`Rhett Morrow
Founder / Head Coach / Ring Master Of Fun!
P: 0437 186 533
E: rhettbigstar@hotmail.com
W: www.bigstarcircus.com.au`

export const SIGNATURE_HTML = `
<table cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:2px solid #D72027;padding-top:12px;font-family:Arial,Helvetica,sans-serif;color:#3f3f46;font-size:14px;line-height:1.5">
  <tr><td>
    <div style="font-weight:800;font-size:16px;color:#18181b">Rhett Morrow</div>
    <div style="color:#D72027;font-weight:700">Founder / Head Coach / Ring Master Of Fun!</div>
    <div style="margin-top:8px">
      P: <a href="tel:+61437186533" style="color:#3f3f46;text-decoration:none">0437 186 533</a><br>
      E: <a href="mailto:rhettbigstar@hotmail.com" style="color:#3f3f46;text-decoration:none">rhettbigstar@hotmail.com</a><br>
      W: <a href="https://www.bigstarcircus.com.au" style="color:#D72027;text-decoration:none;font-weight:700">www.bigstarcircus.com.au</a>
    </div>
  </td></tr>
</table>`

// Wrap a plain-text message body in simple HTML and append the signature.
export function emailHtml(body: string): string {
  const esc = (body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#18181b;font-size:15px;line-height:1.6;white-space:pre-wrap">${esc}</div>${SIGNATURE_HTML}`
}
