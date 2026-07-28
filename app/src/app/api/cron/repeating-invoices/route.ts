// /api/cron/repeating-invoices — runs daily. For each active repeating template
// whose next date has arrived, creates a real invoice (draft / awaiting / sent per
// the template's setting), then advances the next date. Secured by CRON_SECRET.
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { computeInvoice, advanceDate, addDaysISO, type LineIn } from '@/lib/invoice-calc'
import { rosterPdfBase64 } from '@/lib/roster-pdf'
import { SIGNATURE_TEXT, emailHtml } from '@/lib/email-signature'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) { return run(req) }
export async function GET(req: Request) { return run(req) }

const money = (n: number) => '$' + (Number(n) || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function run(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    const url = new URL(req.url)
    if (auth !== `Bearer ${secret}` && url.searchParams.get('key') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const admin = createAdminSupabase()
  const today = new Date().toISOString().slice(0, 10)

  const { data: templates, error } = await admin.from('bs_repeating_invoices').select('*').eq('active', true).lte('next_date', today)
  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('relation')) return NextResponse.json({ ok: true, note: 'not set up' })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const counters: Record<string, number> = {}
  async function nextNumber(tenantId: string): Promise<string> {
    if (counters[tenantId] == null) {
      const { data: last } = await admin.from('bs_invoices').select('number').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1)
      const m = last?.[0]?.number ? /(\d+)/.exec(last[0].number) : null
      counters[tenantId] = m ? parseInt(m[1], 10) : 1000
    }
    counters[tenantId] += 1
    return `INV-${counters[tenantId]}`
  }

  let created = 0
  for (const t of templates ?? []) {
    let nextDate: string = t.next_date
    let guardCap = 0
    // Catch up if the template is behind (e.g. just created with a back-dated start).
    while (nextDate <= today && guardCap < 12) {
      guardCap++
      const { clean, subtotal, gst, total } = computeInvoice((t.lines || []) as LineIn[], t.amounts_are)
      if (clean.length) {
        const number = await nextNumber(t.tenant_id)
        const { data: inv } = await admin.from('bs_invoices').insert({
          tenant_id: t.tenant_id, number,
          contact_name: t.contact_name, contact_email: t.contact_email, reference: t.reference,
          amounts_are: t.amounts_are, issue_date: nextDate, due_date: addDaysISO(nextDate, t.due_days || 0),
          status: t.mode === 'draft' ? 'draft' : 'awaiting', subtotal, gst, total,
        }).select('*').single()
        if (inv) {
          await admin.from('bs_invoice_lines').insert(clean.map((l) => ({ ...l, invoice_id: inv.id, tenant_id: t.tenant_id })))
          created++
          // Auto-send if the template is set to "approve & send".
          if (t.mode === 'send' && t.contact_email && process.env.RESEND_API_KEY) {
            await sendInvoice(inv, clean).catch(() => {})
          }
        }
      }
      nextDate = advanceDate(nextDate, t.frequency)
    }
    const stillActive = !(t.end_date && nextDate > t.end_date)
    await admin.from('bs_repeating_invoices').update({ next_date: nextDate, last_generated: today, active: stillActive }).eq('id', t.id)
  }

  return NextResponse.json({ ok: true, created })

  async function sendInvoice(inv: Record<string, unknown>, lines: { description: string; account: string | null; qty: number; unit_price: number; amount: number }[]) {
    const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
    const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
    const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || ''
    const pdfLines: string[] = []
    if (inv.reference) pdfLines.push(`Reference: ${inv.reference}`, '')
    for (const l of lines) pdfLines.push(`- ${l.description || 'Item'}${l.account ? ` [${l.account}]` : ''}  (${l.qty} x ${money(Number(l.unit_price))})  ${money(Number(l.amount))}`)
    pdfLines.push('', `Subtotal: ${money(Number(inv.subtotal))}`, `GST: ${money(Number(inv.gst))}`, `TOTAL DUE: ${money(Number(inv.total))}`)
    if (inv.due_date) pdfLines.push('', `Due: ${inv.due_date}`)
    const pdf = await rosterPdfBase64(`Tax Invoice ${inv.number}`, `${inv.contact_name || ''} · Issued ${inv.issue_date}`, pdfLines)
    const greeting = inv.contact_name ? `Hi ${String(inv.contact_name).split(' ')[0]},` : 'Hi there,'
    const body = `${greeting}\n\nPlease find attached invoice ${inv.number} for ${money(Number(inv.total))}.${inv.due_date ? ` Payment is due by ${inv.due_date}.` : ''}\n\nThank you for supporting Big Star Circus!`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: inv.contact_email, subject: `Invoice ${inv.number} from Big Star Circus`, text: `${body}\n\n${SIGNATURE_TEXT}`, html: emailHtml(body), ...(REPLY_TO ? { reply_to: REPLY_TO } : {}), attachments: [{ filename: `${inv.number}.pdf`, content: pdf }] }),
    })
    if (res.ok) await admin.from('bs_invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', inv.id as string)
  }
}
