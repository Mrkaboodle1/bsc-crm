// Full backup of every Meta ad campaign, ad set (with targeting) and ad (with
// creative + copy) on the BSC ad accounts. Saves a complete JSON snapshot +
// a readable summary so the whole setup can be rebuilt if it's ever deleted.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const env = readFileSync('./server-jacky/.env', 'utf8')
const T = (env.match(/^META_ADS_TOKEN=(.*)$/m) || [])[1]?.trim()
const V = 'v25.0', G = 'https://graph.facebook.com'
const j = async (u) => { const r = await fetch(u); return r.json() }
const page = async (u) => { const out = []; let url = u; for (let i = 0; i < 20 && url; i++) { const d = await j(url); (d.data || []).forEach((x) => out.push(x)); url = d.paging?.next || null } return out }

mkdirSync('./ads-backup', { recursive: true })
const accts = await j(`${G}/${V}/me/adaccounts?fields=name,account_id,currency,amount_spent&access_token=${T}`)
const snapshot = { backed_up: '2026-06-10', accounts: [] }
let nC = 0, nS = 0, nA = 0

for (const a of (accts.data || [])) {
  const acct = { name: a.name, id: `act_${a.account_id}`, currency: a.currency, lifetime_spend_cents: a.amount_spent, campaigns: [] }
  const camps = await page(`${G}/${V}/act_${a.account_id}/campaigns?fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,buying_type,special_ad_categories,start_time,stop_time&limit=100&access_token=${T}`)
  for (const c of camps) {
    nC++
    const camp = { ...c, adsets: [] }
    const sets = await page(`${G}/${V}/${c.id}/adsets?fields=id,name,status,daily_budget,billing_event,optimization_goal,bid_strategy,targeting,promoted_object,start_time,end_time&limit=100&access_token=${T}`)
    for (const s of sets) {
      nS++
      const set = { ...s, ads: [] }
      const ads = await page(`${G}/${V}/${s.id}/ads?fields=id,name,status,creative{name,title,body,image_url,image_hash,video_id,call_to_action_type,link_url,object_story_spec,thumbnail_url}&limit=100&access_token=${T}`)
      for (const ad of ads) { nA++; set.ads.push(ad) }
      camp.adsets.push(set)
    }
    acct.campaigns.push(camp)
  }
  snapshot.accounts.push(acct)
}

const file = './ads-backup/joe-ads-full-backup-2026-06-10.json'
writeFileSync(file, JSON.stringify(snapshot, null, 2))

// readable summary
let md = `# Meta Ads Backup — ${snapshot.backed_up}\n\nFull config saved in joe-ads-full-backup-2026-06-10.json (rebuildable).\n\n`
for (const a of snapshot.accounts) {
  md += `## ${a.name} (${a.id})\n${a.campaigns.length} campaigns\n\n`
  for (const c of a.campaigns) {
    md += `### ${c.name}\n- objective: ${c.objective} · status: ${c.effective_status}\n`
    for (const s of c.adsets) {
      const t = s.targeting || {}
      const geo = (t.geo_locations?.cities || []).map((x) => `${x.name} +${x.radius}${x.distance_unit || 'mi'}`).join(', ') || (t.geo_locations?.countries || []).join(',')
      md += `  - ad set "${s.name}": age ${t.age_min || '?'}-${t.age_max || '?'}, gender ${(t.genders || ['all']).join('/')}, geo ${geo || '—'}\n`
      for (const ad of s.ads) {
        const body = ad.creative?.body || ad.creative?.object_story_spec?.link_data?.message || ad.creative?.object_story_spec?.video_data?.message || ''
        if (body) md += `    - ad "${ad.name}": "${String(body).replace(/\s+/g, ' ').slice(0, 140)}"\n`
      }
    }
    md += `\n`
  }
}
writeFileSync('./ads-backup/joe-ads-summary-2026-06-10.md', md)
console.log(`BACKED UP: ${nC} campaigns, ${nS} ad sets, ${nA} ads → ads-backup/`)
