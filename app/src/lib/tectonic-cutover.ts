import 'server-only'
import type { createAdminSupabase } from './supabase-admin'

// Brings the last two things BigStar still needs Tectonic for into the CRM:
//   • conversations — the SMS/email threads with parents (+ message history)
//   • leads         — the opportunities pipeline
// Both are insert-only and keyed on the Tectonic id, so re-running is safe and
// never duplicates. Nothing in Tectonic is ever modified.

type Admin = ReturnType<typeof createAdminSupabase>
const GHL = 'https://services.leadconnectorhq.com'
const headers = () => ({ Authorization: `Bearer ${process.env.GHL_PIT}`, Version: '2021-07-28', Accept: 'application/json' })
const last9 = (s?: string | null) => (s || '').replace(/\D/g, '').slice(-9)

async function ghl(path: string): Promise<Record<string, unknown>> {
  const r = await fetch(GHL + path, { headers: headers() })
  if (!r.ok) throw new Error(`GHL ${r.status} on ${path.split('?')[0]}`)
  return r.json()
}

/** Family lookup by email/phone so threads and leads attach to the right family. */
async function familyIndex(admin: Admin, tenantId: string) {
  const byEmail = new Map<string, string>(), byPhone = new Map<string, string>()
  for (let from = 0; from <= 20000; from += 1000) {
    const { data } = await admin.from('families').select('id, email, phone').eq('tenant_id', tenantId).range(from, from + 999)
    if (!data?.length) break
    for (const f of data) {
      if (f.email) byEmail.set(f.email.toLowerCase(), f.id)
      if (last9(f.phone)) byPhone.set(last9(f.phone), f.id)
    }
    if (data.length < 1000) break
  }
  return { byEmail, byPhone }
}

export type ConversationImport = { threads: number; messages: number; skipped: number }

/** Import every Tectonic conversation + its recent messages. */
export async function importConversations(admin: Admin, tenantId: string, opts?: { withMessages?: number }): Promise<ConversationImport> {
  const loc = process.env.GHL_LOCATION_ID
  if (!loc || !process.env.GHL_PIT) return { threads: 0, messages: 0, skipped: 0 }
  const res: ConversationImport = { threads: 0, messages: 0, skipped: 0 }
  const { byEmail, byPhone } = await familyIndex(admin, tenantId)

  // Which threads do we already have?
  const seen = new Set<string>()
  for (let from = 0; from <= 20000; from += 1000) {
    const { data } = await admin.from('conversations').select('import_key').eq('tenant_id', tenantId).range(from, from + 999)
    if (!data?.length) break
    for (const c of data) if (c.import_key) seen.add(c.import_key)
    if (data.length < 1000) break
  }

  // Page through conversations (cursor = lastMessageDate).
  const all: Record<string, any>[] = []
  let cursor: number | null = null
  for (let i = 0; i < 30; i++) {
    const r = await ghl(`/conversations/search?locationId=${loc}&limit=100${cursor ? `&startAfterDate=${cursor}` : ''}`) as { conversations?: Record<string, any>[] }
    const page = r.conversations ?? []
    all.push(...page)
    if (page.length < 100) break
    const next = page[page.length - 1]?.lastMessageDate
    if (!next || next === cursor) break
    cursor = next
  }

  const withMessages = opts?.withMessages ?? 150   // fetch history for the most recent N threads
  let fetched = 0

  for (const c of all) {
    const key = `ghlc:${c.id}`
    if (seen.has(key)) { res.skipped++; continue }
    const email = (c.email || '').toLowerCase()
    const famId = (email && byEmail.get(email)) || byPhone.get(last9(c.phone)) || null
    const { data: made } = await admin.from('conversations').insert({
      tenant_id: tenantId, family_id: famId,
      contact_name: c.fullName || c.contactName || null,
      phone: c.phone || null, email: email || null,
      channel: c.phone && c.email ? 'mixed' : c.phone ? 'sms' : 'email',
      last_message: (c.lastMessageBody || '').slice(0, 500) || null,
      last_at: c.lastMessageDate ? new Date(c.lastMessageDate).toISOString() : null,
      unread: c.unreadCount ?? 0,
      import_key: key,
    }).select('id').single()
    if (!made) continue
    res.threads++
    seen.add(key)

    // Pull the message history for the most recent threads only — 1,788 × a
    // request each would take far too long for one run.
    if (fetched < withMessages) {
      fetched++
      try {
        const m = await ghl(`/conversations/${c.id}/messages?limit=50`) as { messages?: { messages?: Record<string, any>[] } | Record<string, any>[] }
        const list = (Array.isArray(m.messages) ? m.messages : m.messages?.messages) ?? []
        for (const msg of list) {
          const body = (msg.body || msg.message || '').trim()
          if (!body) continue
          const { error } = await admin.from('conversation_messages').insert({
            tenant_id: tenantId, conversation_id: made.id,
            direction: /out/i.test(msg.direction || '') ? 'outbound' : 'inbound',
            channel: String(msg.messageType || msg.type || '').replace('TYPE_', '').toLowerCase() || null,
            body: body.slice(0, 4000),
            sent_at: msg.dateAdded ? new Date(msg.dateAdded).toISOString() : null,
            import_key: `ghlm:${msg.id}`,
          })
          if (!error) res.messages++
        }
      } catch { /* thread history is best-effort */ }
    }
  }
  return res
}

export type LeadImport = { stages: number; leads: number; skipped: number }

/** Import the Tectonic opportunities pipeline (stages + leads). */
export async function importLeads(admin: Admin, tenantId: string): Promise<LeadImport> {
  const loc = process.env.GHL_LOCATION_ID
  if (!loc || !process.env.GHL_PIT) return { stages: 0, leads: 0, skipped: 0 }
  const res: LeadImport = { stages: 0, leads: 0, skipped: 0 }
  const { byEmail, byPhone } = await familyIndex(admin, tenantId)

  // Stages, in pipeline order
  const pipes = await ghl(`/opportunities/pipelines?locationId=${loc}`) as { pipelines?: { stages?: { id: string; name: string }[] }[] }
  const stageIdByName = new Map<string, string>()
  const ghlStageName = new Map<string, string>()
  let sort = 0
  for (const p of pipes.pipelines ?? []) {
    for (const s of p.stages ?? []) {
      ghlStageName.set(s.id, s.name)
      const { data: existing } = await admin.from('lead_stages').select('id').eq('tenant_id', tenantId).eq('name', s.name).maybeSingle()
      if (existing) { stageIdByName.set(s.name, existing.id); sort++; continue }
      const { data: made } = await admin.from('lead_stages').insert({ tenant_id: tenantId, name: s.name, sort: sort++ }).select('id').single()
      if (made) { stageIdByName.set(s.name, made.id); res.stages++ }
    }
  }

  // Existing leads
  const seen = new Set<string>()
  for (let from = 0; from <= 20000; from += 1000) {
    const { data } = await admin.from('leads').select('import_key').eq('tenant_id', tenantId).range(from, from + 999)
    if (!data?.length) break
    for (const l of data) if (l.import_key) seen.add(l.import_key)
    if (data.length < 1000) break
  }

  // Page through opportunities
  const seenIds = new Set<string>()
  let after: string | null = null, prev = ''
  for (let i = 0; i < 20; i++) {
    const r = await ghl(`/opportunities/search?location_id=${loc}&limit=100${after ? `&startAfterId=${after}` : ''}`) as { opportunities?: Record<string, any>[] }
    const page = r.opportunities ?? []
    if (!page.length) break
    let fresh = 0
    for (const o of page) {
      if (seenIds.has(o.id)) continue
      seenIds.add(o.id); fresh++
      const key = `ghlo:${o.id}`
      if (seen.has(key)) { res.skipped++; continue }
      const email = (o.contact?.email || '').toLowerCase()
      const phone = o.contact?.phone || ''
      const famId = (email && byEmail.get(email)) || byPhone.get(last9(phone)) || null
      const stageName = ghlStageName.get(o.pipelineStageId) || null
      const { error } = await admin.from('leads').insert({
        tenant_id: tenantId, family_id: famId,
        stage_id: stageName ? stageIdByName.get(stageName) ?? null : null,
        name: o.name || o.contact?.name || 'Lead',
        email: email || null, phone: phone || null,
        value: o.monetaryValue ?? null,
        status: /won/i.test(o.status || '') ? 'won' : /lost/i.test(o.status || '') ? 'lost' : /abandon/i.test(o.status || '') ? 'abandoned' : 'open',
        source: o.source || null,
        import_key: key,
      })
      if (!error) res.leads++
    }
    const lastId = page[page.length - 1]?.id
    if (!fresh || !lastId || lastId === prev) break   // API repeats the page → stop
    prev = lastId; after = lastId
  }
  return res
}
