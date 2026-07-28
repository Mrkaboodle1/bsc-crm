import 'server-only'
import type { createAdminSupabase } from './supabase-admin'

// Keeps the CRM in step with Tectonic (GoHighLevel): imports any new contacts into
// families (with tags + source) and pulls each contact's form/waiver answers into
// signed_waivers (child names, medical, how-they-heard, class). Insert-only + keyed,
// so re-runs are cheap. Called hourly by the booking-watch cron.
type Admin = ReturnType<typeof createAdminSupabase>
const GHL = 'https://services.leadconnectorhq.com'
const headers = () => ({ Authorization: 'Bearer ' + process.env.GHL_PIT, Version: '2021-07-28', Accept: 'application/json' })
const l9 = (s?: string | null) => (s || '').replace(/\D/g, '').slice(-9)
const cleanTags = (t: unknown) => (Array.isArray(t) ? t : []).map((x) => String(x).replace(/"/g, '').trim()).filter((x) => x && x.length > 1)
const flat = (v: unknown): string => {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map(flat).filter(Boolean).join(', ')
  if (typeof v === 'object') { const o = v as Record<string, unknown>; if (o.url) return String(o.url); return Object.values(o).map(flat).filter(Boolean).join(', ') }
  return String(v).trim()
}
const pick = (fields: Record<string, string>, re: RegExp) => Object.entries(fields).filter(([k]) => re.test(k)).map(([, v]) => v).filter(Boolean)
const eventType = (tags: string[]) => { const t = (tags || []).join(' ').toLowerCase(); if (/kids night out|kno/.test(t)) return 'kno'; if (/school holiday|shw/.test(t)) return 'shw'; if (/free trial/.test(t)) return 'free_trial'; return 'other' }

// Supabase caps a single response at 1000 rows — paginate with .range() so the
// dedup sees EVERY existing row (a partial set caused duplicate imports).
async function allRows<T = Record<string, unknown>>(build: () => { range: (a: number, b: number) => Promise<{ data: T[] | null }> }): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from <= 20000; from += 1000) {
    const { data } = await build().range(from, from + 999)
    if (!data || !data.length) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

export async function syncTectonicContacts(admin: Admin, tenantId: string): Promise<{ contacts: number; forms: number }> {
  const loc = process.env.GHL_LOCATION_ID, pit = process.env.GHL_PIT
  if (!loc || !pit) return { contacts: 0, forms: 0 }

  const defs: Record<string, string> = {}
  try { const d = await (await fetch(`${GHL}/locations/${loc}/customFields`, { headers: headers() })).json(); for (const f of d.customFields || []) defs[f.id] = f.name || f.fieldKey || f.id } catch {}

  const fam = await allRows<{ email: string | null; phone: string | null }>(() => admin.from('families').select('email, phone').eq('tenant_id', tenantId) as never)
  const haveEmail = new Set<string>(), havePhone = new Set<string>()
  for (const f of fam) { const e = (f.email || '').toLowerCase(); if (e) haveEmail.add(e); const p = l9(f.phone); if (p) havePhone.add(p) }
  const wk = await allRows<{ import_key: string | null }>(() => admin.from('signed_waivers').select('import_key').eq('tenant_id', tenantId) as never)
  const haveWaiver = new Set(wk.map((x) => x.import_key).filter(Boolean))

  // pull all Tectonic contacts
  let contacts: Record<string, unknown>[] = [], sa: string | null = null, sai: string | null = null
  for (let i = 0; i < 40; i++) {
    let u = `${GHL}/contacts/?locationId=${loc}&limit=100`
    if (sa && sai) u += `&startAfter=${sa}&startAfterId=${sai}`
    const r = await (await fetch(u, { headers: headers() })).json()
    const c = r.contacts || []; contacts.push(...c)
    const m = r.meta || {}
    if (c.length < 100 || !m.startAfterId) break
    sa = m.startAfter; sai = m.startAfterId
  }

  // new contacts -> families
  const newFam: Record<string, unknown>[] = [], seen = new Set<string>()
  for (const c of contacts as any[]) {
    const e = (c.email || '').toLowerCase(), p = l9(c.phone)
    if ((e && haveEmail.has(e)) || (p && havePhone.has(p))) continue
    const k = e || p; if (!k || seen.has(k)) continue; seen.add(k)
    const name = (c.contactName || `${c.firstName || ''} ${c.lastName || ''}`).trim() || 'Contact'
    newFam.push({ tenant_id: tenantId, family_name: (c.lastName || name.split(' ').slice(-1)[0] || name).trim(), primary_parent: name, email: e || null, phone: c.phone || null, lifecycle_stage: 'lead', tags: cleanTags(c.tags), notes: `Imported from Tectonic${c.source ? ` · source: ${c.source}` : ''}. Tectonic id: ${c.id}` })
  }
  let cAdded = 0
  for (let i = 0; i < newFam.length; i += 100) { const r = await admin.from('families').insert(newFam.slice(i, i + 100)); if (!r.error) cAdded += Math.min(100, newFam.length - i) }

  // refresh family map (incl. new) for waiver linking
  const fam2 = await allRows<{ id: string; email: string | null; phone: string | null }>(() => admin.from('families').select('id, email, phone').eq('tenant_id', tenantId) as never)
  const e2: Record<string, string> = {}, p2: Record<string, string> = {}
  for (const f of fam2) { if (f.email) e2[f.email.toLowerCase()] = f.id; if (l9(f.phone)) p2[l9(f.phone)] = f.id }

  // new form answers -> signed_waivers
  const newW: Record<string, unknown>[] = []
  for (const c of contacts as any[]) {
    const key = 'ghlc:' + c.id; if (haveWaiver.has(key)) continue
    const fields: Record<string, string> = {}
    for (const cf of c.customFields || []) { const n = defs[cf.id] || cf.id; const val = flat(cf.value); if (val) fields[n] = val }
    const children = pick(fields, /child.*name|name.*age|dependents|birthday children|performer/i).join('; ')
    const medical = pick(fields, /medical|allerg|dietary/i).join('; ')
    const howHeard = pick(fields, /how did you hear/i).join(', ')
    const classAtt = pick(fields, /class attending|interested|time slot|gymnastic|circus classes/i).join(', ')
    const emergency = pick(fields, /emergency/i).join(', ')
    if (!(children || medical || howHeard || classAtt || (c.tags || []).length)) continue
    // Signatures aren't in the list view — fetch the contact detail for real form submitters.
    let signature: string | null = null
    if (children || classAtt || howHeard) {
      try {
        const dc = (await (await fetch(`${GHL}/contacts/${c.id}`, { headers: headers() })).json()).contact || {}
        for (const f of dc.customFields || []) { const v = f.value as { url?: string }; if (v && typeof v === 'object' && v.url && /documents\/download/.test(v.url)) { signature = v.url; fields['Sign//Autograph'] = v.url; break } }
      } catch {}
    }
    const fid = e2[(c.email || '').toLowerCase()] || p2[l9(c.phone)] || null
    newW.push({ tenant_id: tenantId, family_id: fid, event_type: eventType(c.tags), parent_name: c.contactName || null, email: (c.email || '').toLowerCase() || null, phone: c.phone || null, emergency: emergency || null, children: children || null, medical: medical || null, signature, import_key: key, answers: { source: c.source || null, how_heard: howHeard || null, class_attending: classAtt || null, address: [c.address1, c.city, c.state, c.postalCode].filter(Boolean).join(', ') || null, tags: c.tags || [], fields } })
  }
  let wAdded = 0
  for (let i = 0; i < newW.length; i += 100) { const r = await admin.from('signed_waivers').insert(newW.slice(i, i + 100)); if (!r.error) wAdded += Math.min(100, newW.length - i) }

  return { contacts: cAdded, forms: wAdded }
}
