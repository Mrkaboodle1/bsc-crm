// Seeds the campaigns table: 12 monthly newsletters + key social posts + SMS +
// free-trial + Play On voucher reminders. Safe to re-run (clears Jacky-seeded
// rows first by title prefix). Run AFTER 025_campaigns.sql exists.
//   node scripts/seed-campaigns.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(resolve(__dirname, '../server-jacky/.env'), 'utf8')
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const BASE = get('SUPABASE_URL'), KEY = get('SUPABASE_SERVICE_ROLE_KEY')
const TENANT = '33c7b22a-52c6-444e-9057-d03d5ed3d94e'
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }
const IMG = { lights: '/marketing/lights.jpg', plate: '/marketing/plate.jpg', logo: '/marketing/logo.png', trial: '/marketing/free-trial-qr.png' }

// Probe table exists
const probe = await fetch(`${BASE}/rest/v1/campaigns?select=id&limit=1`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
if (!probe.ok) { console.log(`\n⚠️  campaigns table not found (status ${probe.status}). Run schema/025_campaigns.sql first, then re-run.\n`); process.exit(1) }

const N = (month, subject, c, image) => ({ tenant_id: TENANT, channel: 'email', month, title: `${new Date(month + '-01').toLocaleDateString('en-AU', { month: 'long' })} Newsletter`, subject, content: c, image_url: image || IMG.lights, status: 'draft' })

const newsletters = [
  N('2026-07', 'July at Big Star Circus 🎪', { intro: 'Welcome to a brand-new term! Term 3 has begun and there is so much on this month — including our next Kids Night Out, the Glow Circus!', heroTitle: '🌙 Kids Night Out — Glow Circus', heroDate: 'Saturday 15 August · 5:30–8:30pm', heroBlurb: 'A glow-in-the-dark disco! Glow toys, games, pizza & prizes — FREE for members. Members book first.', whatsOn: '🎪 FREE FlipAntics circus show — Mon 6 July, Robina\n🎡 Nerang Funanza (come see our stall!) — Sun 9 August\n🤸 School holiday workshops on now', classes: 'Term 3 is underway — a few class spots left. Our membership includes Kids Night Out free!' }),
  N('2026-08', 'August at Big Star — GLOW night! ✨', { intro: 'It is GLOW month! Our Kids Night Out is here, plus come find us at the Nerang Funanza.', heroTitle: '🌙 Kids Night Out — Glow Circus', heroDate: 'THIS Saturday 15 August · 5:30–8:30pm', heroBlurb: 'Last spots! Wear white or neon, bring your dance moves — pizza, glow toys & prizes sorted. Free for members.', whatsOn: '🎡 Nerang Funanza — Sun 9 Aug, 10am–2pm, Country Paradise Parklands. Visit the Big Star stall!', classes: 'Mid-term already — keep your little star shining every week.' }),
  N('2026-09', 'September at Big Star Circus 🤸', { intro: 'Spring is here! A big thank you to everyone who made Glow Circus shine. Here is what is coming up.', heroTitle: '🤸 Term 3 finishing strong', heroDate: 'Term 3 ends 18 September', heroBlurb: 'Celebrate a term of progress — and get ready for the spring holidays!', whatsOn: '🤸 Spring school holiday workshops — book early!', classes: 'Re-enrol for Term 4 (starts 6 Oct) to keep your spot.' }),
  N('2026-10', 'October at Big Star — Term 4 is here! 🎪', { intro: 'Welcome back for Term 4 — our biggest term! New memberships, holiday fun, and the next Kids Night Out on the way.', heroTitle: '🌴 Kids Night Out — Tropical Beach Party', heroDate: 'Saturday 14 November · 5:30–8:30pm', heroBlurb: 'Leis, limbo & beach vibes! Pizza, prizes & games — free for members. Members book first.', whatsOn: '🎟️ Term 4 enrolments open\n🎄 Christmas concert planning begins', classes: 'Term 4 runs to 11 December — lock in your spot.' }),
  N('2026-11', 'November at Big Star — Beach Party! 🌴', { intro: 'Summer is calling! Our Tropical Beach Party Kids Night Out is here and the year is finishing with a bang.', heroTitle: '🌴 Kids Night Out — Tropical Beach Party', heroDate: 'THIS Saturday 14 November · 5:30–8:30pm', heroBlurb: 'Last spots! Hawaiian shirts on, limbo ready — pizza, prizes & fun. Free for members.', whatsOn: '🎄 End-of-year concert details coming soon', classes: 'Re-enrol for 2027 — secure your spot before the summer rush.' }),
  N('2026-12', 'December at Big Star — Merry Christmas! 🎄', { intro: 'What a year! Thank you to every Big Star family. Here is our festive wrap-up and 2027 dates.', heroTitle: '🎄 End-of-Year Celebration', heroDate: 'Term 4 ends 11 December', heroBlurb: 'Celebrate everything our little stars achieved this year. Happy holidays from all of us!', whatsOn: '☀️ Summer holiday workshops\n🎟️ 2027 enrolments open', classes: 'Term 1 2027 starts 27 January — book now to keep your spot.' }),
  N('2026-01', 'January at Big Star Circus ☀️', { intro: 'Happy New Year! Get the year off to an active start — Term 1 is nearly here.', heroTitle: '🎟️ Term 1 enrolments open', heroDate: 'Term 1 starts 27 January', heroBlurb: 'Book your little star in for a brand-new year of circus fun.', whatsOn: '☀️ Summer holiday workshops on now', classes: 'New to Big Star? Your first class is free — book a trial!' }),
  N('2026-02', 'February at Big Star Circus 🎪', { intro: 'Term 1 is underway and the studio is buzzing! Here is what is on this month.', heroTitle: '🤸 Settle into Term 1', heroDate: 'Term 1 in full swing', heroBlurb: 'New skills, new friends, new tricks — there is still time to join a class!', whatsOn: '💡 Ask us about the $200 Play On voucher', classes: 'Spots still available across acro, aerial & circus.' }),
  N('2026-03', 'March at Big Star Circus 🌟', { intro: 'Autumn term rolls on! Our little stars are flying. Here is the latest.', heroTitle: '🌟 Skill milestones', heroDate: 'Mid Term 1', heroBlurb: 'Celebrate the progress — every kid is levelling up their circus skills!', whatsOn: '🤸 April holiday workshops — coming soon', classes: 'Term 2 starts 20 April — re-enrol to keep your spot.' }),
  N('2026-04', 'April at Big Star Circus 🐣', { intro: 'Term 2 is here! Welcome back after the holidays. Lots happening this month.', heroTitle: '🎟️ Term 2 begins', heroDate: 'Term 2 starts 20 April', heroBlurb: 'A fresh term of circus adventures — jump in!', whatsOn: '🤸 Easter holiday fun wraps up', classes: 'New families welcome — first class free!' }),
  N('2026-05', 'May at Big Star Circus 🎪', { intro: 'Term 2 is flying by! Here is what is on at Big Star this month.', heroTitle: '🌟 Term 2 highlights', heroDate: 'Mid Term 2', heroBlurb: 'Our little stars are shining — come see what circus can do for your child.', whatsOn: '💡 Play On vouchers — use $200 toward membership', classes: 'A few class spots left — book a trial!' }),
  N('2026-06', 'June at Big Star Circus ❄️', { intro: 'Winter term is here! Term 2 wraps up soon — here is what is coming.', heroTitle: '🤸 Term 2 finishing up', heroDate: 'Term 2 ends 26 June', heroBlurb: 'Celebrate a great term — and get ready for Term 3 & the next Kids Night Out!', whatsOn: '🌙 Kids Night Out coming in Term 3', classes: 'Re-enrol for Term 3 (starts 13 July).' }),
]

const socials = [
  { tenant_id: TENANT, channel: 'social', title: 'Glow Circus — Announce', content: { caption: '🌙✨ KIDS NIGHT OUT IS BACK — and this one GLOWS! Drop the kids for a glow-in-the-dark disco: dancing, games, pizza & prizes! 🗓️ Sat 15 Aug, 5:30–8:30pm. FREE for members — members book first! Link in bio 👉', hashtags: '#BigStarCircus #GoldCoastKids #MolendinarMums #CircusKids #KidsNightOut' }, image_url: IMG.lights, status: 'draft' },
  { tenant_id: TENANT, channel: 'social', title: 'Glow Circus — Last chance', content: { caption: '🚨 LAST FEW SPOTS — Glow Circus is THIS Saturday! Sat 15 Aug, 5:30–8:30pm. Wear neon, bring your dance moves — pizza, glow toys & prizes sorted. 🌙✨', hashtags: '#BigStarCircus #GoldCoastKids #KidsNightOut #GoldCoastFamilies' }, image_url: IMG.lights, status: 'draft' },
  { tenant_id: TENANT, channel: 'social', title: 'FlipAntics FREE show', content: { caption: '🎪 FREE family circus show alert! The FlipAntics Show — hilarious all-ages circus comedy — is ON and FREE! 🗓️ Mon 6 July, 6pm · Glow Church, Robina. A gorgeous free night out for the whole family! ✨', hashtags: '#GoldCoastFamilies #FreeFamilyFun #CircusGoldCoast #ThingsToDoGoldCoast' }, image_url: IMG.plate, status: 'draft' },
  { tenant_id: TENANT, channel: 'social', title: 'Free Trial offer', content: { caption: '🎪 Ever wanted to run away with the circus? Now your kids can! 🤸 Book a FREE trial class at Big Star Circus — acro, aerial, juggling & more. There is nothing like watching your child light up under the big top! First class is on us 👉 link in bio', hashtags: '#BigStarCircus #GoldCoastKids #FreeTrial #MolendinarMums #KidsActivitiesGoldCoast' }, image_url: IMG.trial, status: 'draft' },
  { tenant_id: TENANT, channel: 'social', title: 'Play On voucher reminder', content: { caption: '💰 Did you know? Every QLD child (5–17) can get a $200 Play On voucher to put toward their activities! 🎪 Use it toward your Big Star Circus membership and keep your little star learning all year. Ask us how 👉', hashtags: '#BigStarCircus #PlayOnVoucher #GoldCoastKids #QLDfamilies #FairPlay' }, image_url: IMG.logo, status: 'draft' },
]

const sms = [
  { tenant_id: TENANT, channel: 'sms', title: 'KNO invite text', content: { text: '🌙 Big Star Kids Night Out is back! GLOW CIRCUS, Sat 15 Aug 5:30–8:30pm. Free for members, pizza + prizes included. Members book first 👉 {{link}}' }, status: 'draft' },
  { tenant_id: TENANT, channel: 'sms', title: 'KNO last-chance text', content: { text: '🌟 Last few spots for Glow Circus THIS Saturday (15 Aug)! Dont miss out 👉 {{link}} — Big Star Circus' }, status: 'draft' },
  { tenant_id: TENANT, channel: 'sms', title: 'Free trial text', content: { text: '🎪 Big Star Circus — book your childs FREE trial class! Acro, aerial & circus fun on the Gold Coast. Reply or call 0489 188 179 to book 👉 {{link}}' }, status: 'draft' },
  { tenant_id: TENANT, channel: 'sms', title: 'Play On voucher text', content: { text: '💰 Reminder: claim your childs $200 QLD Play On voucher & use it toward Big Star membership! Ask us how 👉 0489 188 179 — Big Star Circus' }, status: 'draft' },
]

// Clear previous Jacky-seeded rows (by known titles) to keep re-runs clean
const titles = [...newsletters, ...socials, ...sms].map((x) => x.title)
for (const t of titles) await fetch(`${BASE}/rest/v1/campaigns?tenant_id=eq.${TENANT}&title=eq.${encodeURIComponent(t)}`, { method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=minimal' } })

let n = 0
for (const row of [...newsletters, ...socials, ...sms]) {
  const r = await fetch(`${BASE}/rest/v1/campaigns`, { method: 'POST', headers: h, body: JSON.stringify(row) })
  if (r.ok) n++; else console.log('  !', row.title, r.status, (await r.text()).slice(0, 120))
}
console.log(`\n✅ Seeded ${n} campaigns (${newsletters.length} newsletters, ${socials.length} social, ${sms.length} SMS).`)
