import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 60

// GET /api/cron/ghl-lead-sync — every few hours. Facebook instant-form leads
// land in GoHighLevel (that's where Jo's 639 mums arrived). This pulls every
// GHL contact added in the last few days into the CRM as a LEAD family —
// deduped by email and phone — so the Ormeau waitlist campaign (and any other
// FB lead ad) flows straight onto the CRM lead list without anyone copying
// names across by hand.
//
// GHL tags come across too: a contact tagged with an "ormeau" form lands as
// waitlist:ormeau, so suburb campaigns count themselves.

const TENANT = process.env.BSC_TENANT_ID || '33c7b22a-52c6-444e-9057-d03d5ed3d94e'
const LOOKBACK_DAYS = 4
const last9 = (s?: string | null) => (s || '').replace(/\D/g, '').slice(-9)

const SUBURBS = ['ormeau', 'upper-coomera', 'pacific-pines', 'burleigh-waters', 'palm-beach', 'runaway-bay']

async function ghlRecentContacts(): Promise<Array<Record<string, unknown>>> {
  const pit = process.env.GHL_PIT
  const loc = process.env.GHL_LOCATION_ID
  if (!pit || !loc) throw new Error('GHL credentials missing')
  const since = Date.now() - LOOKBACK_DAYS * 86_400_000
  const out: Array<Record<string, unknown>> = []
  const r = await fetch('https://services.leadconnectorhq.com/contacts/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${pit}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationId: loc,
      pageLimit: 100,
      sort: [{ field: 'dateAdded', direction: 'desc' }],
    }),
  })
  if (!r.ok) throw new Error(`GHL search ${r.status}`)
  const d = await r.json()
  for (const c of d.contacts ?? []) {
    const added = Date.parse((c.dateAdded as string) ?? '')
    if (!Number.isFinite(added) || added < since) continue
    out.push(c)
  }
  return out
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}` && url.searchParams.get('key') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const admin = createAdminSupabase()
    const contacts = await ghlRecentContacts()
    let created = 0, matched = 0, skipped = 0
    const log: string[] = []

    for (const c of contacts) {
      const first = ((c.firstName as string) || '').trim()
      const last = ((c.lastName as string) || '').trim()
      const name = `${first} ${last}`.trim() || ((c.contactName as string) || '').trim()
      const email = ((c.email as string) || '').trim().toLowerCase()
      const phone = ((c.phone as string) || '').trim()
      if (!name && !email && !phone) { skipped++; continue }

      const ghlTags: string[] = Array.isArray(c.tags) ? (c.tags as string[]).map((t) => String(t).toLowerCase()) : []
      const suburbTag = SUBURBS.find((s) => ghlTags.some((t) => t.includes(s.replace('-', ' ')) || t.includes(s)))

      // find before create — email, then phone tail
      let familyId: string | null = null
      if (email) {
        const { data } = await admin.from('families').select('id').eq('tenant_id', TENANT).ilike('email', email).limit(1)
        if (data?.length) familyId = data[0]!.id
      }
      if (!familyId && last9(phone).length >= 8) {
        const { data } = await admin.from('families').select('id').eq('tenant_id', TENANT).ilike('phone', `%${last9(phone)}%`).limit(1)
        if (data?.length) familyId = data[0]!.id
      }

      const newTags = ['fb-lead']
      if (suburbTag) newTags.push(`waitlist:${suburbTag}`)

      if (familyId) {
        matched++
        const { data: fam } = await admin.from('families').select('tags, email, phone').eq('id', familyId).maybeSingle()
        const tags: string[] = fam?.tags ?? []
        let changed = false
        for (const t of newTags) if (!tags.includes(t)) { tags.push(t); changed = true }
        const patch: Record<string, unknown> = {}
        if (changed) patch.tags = tags
        if (fam && !fam.email && email) patch.email = email
        if (fam && !fam.phone && phone) patch.phone = phone
        if (Object.keys(patch).length) await admin.from('families').update(patch).eq('id', familyId)
      } else {
        created++
        const surname = last || name.split(/\s+/).slice(-1)[0] || 'Lead'
        await admin.from('families').insert({
          tenant_id: TENANT,
          family_name: surname,
          primary_parent: name || null,
          email: email || null,
          phone: phone || null,
          source: 'facebook-lead',
          lifecycle_stage: 'lead',
          tags: newTags,
          notes: `Facebook lead via GHL, ${new Date().toISOString().slice(0, 10)}${ghlTags.length ? ` — GHL tags: ${ghlTags.slice(0, 6).join(', ')}` : ''}`,
        })
        log.push(name || email || phone)
      }
    }

    return NextResponse.json({ ok: true, pulled: contacts.length, created, matchedExisting: matched, skipped, newLeads: log.slice(0, 20) })
  } catch (err) {
    console.error('ghl-lead-sync failed', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
