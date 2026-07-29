// /api/vouchers/parse — upload a Play On! voucher PDF, get back the fields.
// Reads the PDF's text layer and extracts voucher number, parent, child, DOB,
// issue/expiry dates, then uploads the PDF to storage so the voucher record
// keeps the original document. Admin reviews the pre-filled form and saves —
// the human stays the approver, the typing goes away.
import { NextResponse } from 'next/server'
import { extractText } from 'unpdf'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 60
const MAX = 10 * 1024 * 1024

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  let file: File | null = null
  try { const form = await req.formData(); file = form.get('file') as File | null } catch { /* ignore */ }
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Please upload the voucher PDF.' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: 'File is too big (max 10 MB).' }, { status: 400 })

  const bytes = new Uint8Array(await file.arrayBuffer())

  // 1. Read the text layer
  let text = ''
  try {
    const r = await extractText(bytes, { mergePages: true })
    text = String(r.text || '')
  } catch {
    return NextResponse.json({ error: 'Could not read this PDF. If it is a photo/scan, enter the details manually.' }, { status: 400 })
  }
  if (!text.trim()) return NextResponse.json({ error: 'This PDF has no readable text (probably a photo). Enter the details manually.' }, { status: 400 })

  // 2. Extract the Play On! fields. The government voucher is a fixed layout,
  //    so labelled-line regexes are reliable. Every field is optional — we
  //    return whatever we can find and the admin fills gaps.
  const pick = (re: RegExp) => { const m = re.exec(text); return m ? m[1].trim().replace(/\s+/g, ' ') : null }
  const toISO = (au: string | null) => {
    if (!au) return null
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(au)
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
  }

  const voucherRef = pick(/Voucher\s*number:?\s*([A-Z0-9]{6,12})/i)
  const issued = toISO(pick(/Date\s*of\s*issue:?\s*([\d/]+)/i))
  const expiry = toISO(pick(/Voucher\s*expiry\s*date:?\s*([\d/]+)/i))

  // Names are anchored to their SECTION HEADERS, never to document order —
  // "Name:" under "Parent/Carer/Guardian…" is the parent, "Name:" under
  // "Child/Young Person…" is the child. If a section can't be found, that
  // field stays blank for the admin rather than guessing (a child's name in
  // the family field is worse than an empty box).
  const section = (header: RegExp): string | null => {
    const m = header.exec(text)
    return m ? text.slice(m.index, m.index + 400) : null
  }
  const nameIn = (block: string | null): string | null => {
    if (!block) return null
    const m = /Name:?\s*([A-Za-zÀ-ÿ'’\- ]{2,60})/.exec(block)
    if (!m) return null
    const v = m[1].trim().replace(/\s+/g, ' ')
    // guard against grabbing the next label if the value was blank
    return /^(email|date|age|child|young)/i.test(v) ? null : v
  }
  const stripTitle = (n: string | null) => n ? n.replace(/^(mr|mrs|ms|miss|mx|dr)\.?\s+/i, '') : null

  const parentBlock = section(/Parent\/?Carer\/?Guardian[^\n]*/i)
  const childBlock = section(/Child\/?Young\s*Person[^\n]*/i)
  const parentName = stripTitle(nameIn(parentBlock))
  const childName = nameIn(childBlock)
  const childDob = toISO(childBlock ? (/Date\s*of\s*birth:?\s*([\d/]+)/i.exec(childBlock)?.[1] ?? null) : pick(/Date\s*of\s*birth:?\s*([\d/]+)/i))
  const childAge = childBlock ? (/Age:?\s*(\d{1,2})/.exec(childBlock)?.[1] ?? null) : null
  const email = pick(/Email\s*(?:address)?:?\s*([^\s\n]+@[^\s\n]+)/i)
  const amountM = /\$\s?(\d{2,3})\b/.exec(text)

  // 3. Keep the original document — same storage as /api/upload
  const admin = createAdminSupabase()
  const path = `${p.tenant_id}/vouchers/${Date.now()}-${(voucherRef || 'voucher').toLowerCase()}.pdf`
  const { error: upErr } = await admin.storage.from('marketing').upload(path, file, { contentType: 'application/pdf', upsert: false })
  const url = upErr ? null : admin.storage.from('marketing').getPublicUrl(path).data.publicUrl

  // 4. Try to match the family already in the CRM (by voucher email, then parent surname)
  let familyMatch: { id: string; family_name: string; primary_parent: string } | null = null
  if (email) {
    const { data } = await admin.from('families').select('id, family_name, primary_parent').eq('tenant_id', p.tenant_id).ilike('email', email).limit(1)
    familyMatch = data?.[0] ?? null
  }
  if (!familyMatch && parentName) {
    const surname = parentName.replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, '').split(/\s+/).pop()
    if (surname && surname.length >= 3) {
      const { data } = await admin.from('families').select('id, family_name, primary_parent').eq('tenant_id', p.tenant_id).ilike('family_name', `%${surname}%`).limit(2)
      if (data?.length === 1) familyMatch = data[0]
    }
  }

  return NextResponse.json({
    ok: true,
    fields: {
      voucher_ref: voucherRef,
      parent_name: parentName,
      child_name: childName,
      child_dob: childDob,
      child_age: childAge,
      email,
      issued_on: issued,
      expiry_date: expiry,
      amount: amountM ? Number(amountM[1]) : 200,
    },
    photo_url: url,
    family_match: familyMatch,
    warning: [
      !voucherRef ? 'Could not find a voucher number — check the PDF is a Play On voucher.' : null,
      !parentName ? 'Parent name not found on the PDF — type the family name yourself.' : null,
    ].filter(Boolean).join(' ') || null,
  })
}
