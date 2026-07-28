import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'

// POST /api/coach-onboarding — PUBLIC, token-gated. Files are already uploaded
// via /upload (this only receives their paths), so the body stays tiny.
// Creates the coach + credential records, then emails the full pack (incl TFN)
// to the owner/accountant. TFN is emailed only — never stored in the database.

const EXPIRY_COL: Record<string, string | null> = {
  blue_card: 'blue_card_expiry', first_aid: 'first_aid_expiry',
  public_liability: 'public_liability_expiry', drivers_licence: 'drivers_licence_expiry', gymnastics: null,
}

export async function POST(req: Request) {
  try {
    const admin = createAdminSupabase()
    const b = await req.json().catch(() => ({}))
    const token = String(b.token || '').trim()
    if (!token) return NextResponse.json({ error: 'Missing sign-up link token.' }, { status: 400 })

    const { data: invite } = await admin.from('coach_invites').select('id, tenant_id, status').eq('token', token).maybeSingle()
    if (!invite) return NextResponse.json({ error: 'This sign-up link is invalid.' }, { status: 404 })
    if (invite.status === 'submitted') return NextResponse.json({ error: 'This sign-up link has already been used.' }, { status: 409 })

    const fullName = String(b.fullName || '').trim()
    if (!fullName) return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })

    const v = (k: string) => { const s = b[k]; return (typeof s === 'string' && s.trim()) ? s.trim() : null }
    const coachRow: Record<string, unknown> = {
      tenant_id: invite.tenant_id, full_name: fullName,
      email: v('email'), phone: v('phone'), address: v('address'), date_of_birth: v('dob'), abn: v('abn'),
      super_fund_name: v('superFundName'), super_member_number: v('superMemberNumber'), super_fund_abn: v('superFundAbn'), super_fund_usi: v('superFundUsi'),
      bank_account_name: v('bankAccountName'), bank_bsb: v('bankBsb'), bank_account_number: v('bankAccountNumber'),
      employment_type: 'contractor', role: 'casual', status: 'active',
      agreement_name: v('agreementName'), agreement_signed_at: v('agreementName') ? new Date().toISOString() : null,
    }
    const { data: coach, error: coachErr } = await admin.from('coaches').insert(coachRow).select('id').single()
    if (coachErr || !coach) return NextResponse.json({ error: 'Could not create your coach record: ' + (coachErr?.message || 'unknown') }, { status: 400 })

    // Credential records (files already uploaded — we just store the paths + expiry)
    const docs: Array<{ docType: string; label?: string; path?: string; expiry?: string }> = Array.isArray(b.docs) ? b.docs : []
    const coachExpiryPatch: Record<string, unknown> = {}
    for (const d of docs) {
      if (!d.docType) continue
      await admin.from('coach_documents').insert({
        tenant_id: invite.tenant_id, coach_id: coach.id, doc_type: d.docType,
        label: d.label || null, file_path: d.path || null, expiry_on: d.expiry || null,
      })
      const col = EXPIRY_COL[d.docType]
      if (col && d.expiry) coachExpiryPatch[col] = d.expiry
    }
    if (Object.keys(coachExpiryPatch).length) await admin.from('coaches').update(coachExpiryPatch).eq('id', coach.id)

    await admin.from('coach_invites').update({ status: 'submitted', coach_id: coach.id, submitted_at: new Date().toISOString() }).eq('id', invite.id)

    // Emails — welcome the coach, and send the FULL pack (incl TFN) to owner/accountant.
    const tfn = v('tfn')
    const recipients = [...new Set([process.env.ACCOUNTANT_EMAIL || 'lana@matthewsassociates.com.au', process.env.OWNER_ALERT_EMAIL || 'rhettbigstar@hotmail.com'])]
    try {
      if (coachRow.email) await sendEmail(String(coachRow.email), 'Welcome to the BigStar Circus team! 🎪', `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#222;line-height:1.55"><p>Hi ${fullName.split(' ')[0]}! 🎪</p><p>Thanks for signing up with <strong>BigStar Circus</strong> — you're all set up. We'll nudge you before any of your cards are due to renew.</p><p>See you soon,<br>Rhett &amp; the BigStar Circus team</p></div>`, 'coach-welcome')
      const row = (k: string, val: unknown) => `<tr><td style="padding:3px 10px 3px 0;color:#666">${k}</td><td style="padding:3px 0;font-weight:bold">${val ?? '—'}</td></tr>`
      const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#222"><p><strong>${fullName}</strong> just completed the BigStar coach sign-up. Full details for the accountant below.</p>
        <table style="border-collapse:collapse;font-size:14px">
        ${row('Email', coachRow.email)}${row('Phone', coachRow.phone)}${row('Address', coachRow.address)}${row('Date of birth', coachRow.date_of_birth)}${row('ABN', coachRow.abn)}
        ${row('Bank name', coachRow.bank_account_name)}${row('BSB', coachRow.bank_bsb)}${row('Account no', coachRow.bank_account_number)}
        ${row('Super fund', coachRow.super_fund_name)}${row('Super member no', coachRow.super_member_number)}${row('Super fund ABN', coachRow.super_fund_abn)}${row('Super fund USI', coachRow.super_fund_usi)}
        ${tfn ? `<tr><td colspan="2" style="padding-top:8px;color:#b00;font-weight:bold">Tax File Number (not stored in the CRM): ${tfn}</td></tr>` : ''}
        </table>
        <p style="color:#888;font-size:12px;margin-top:10px">Documents uploaded: ${docs.length}. All the above (except the TFN) is saved on the coach's record in the CRM.</p></div>`
      for (const to of recipients) await sendEmail(to, `New coach onboarded: ${fullName} — details for the accountant`, html, 'coach-onboard-accountant')
    } catch { /* non-blocking */ }

    return NextResponse.json({ ok: true, coachName: fullName })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Something went wrong on our end.' }, { status: 500 })
  }
}
