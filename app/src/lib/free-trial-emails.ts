import 'server-only'

// Website + booking links (the Big Star site). Update if the paths change.
const LINKS = {
  web: 'https://bigstarcircus.com.au',
  trial: 'https://bigstarcircus.com.au/free-trial',
  shw: 'https://bigstarcircus.com.au/school-holidays',
  kno: 'https://bigstarcircus.com.au/kids-night-out',
  review: 'https://g.page/r/CZ9DT1rZ4sB0EAE/review',
  fb: 'https://www.facebook.com/bigstarcircus',
  ig: 'https://www.instagram.com/bigstarcircus',
}
export const FT_WELCOME_SMS = `Hi! 🎪 Thanks for booking a FREE trial at BigStar Circus! We'll be in touch shortly to confirm your class time — and we've just emailed you a welcome with everything you need (check your inbox/junk). Questions? Call Rhett on 0489 188 179. 🌟`

// The built-in 5+1 email free-trial nurture sequence (fallback / seed content).
// The live engine reads editable steps from sequence_steps (see lib/sequence.ts).
const FROM = 'Rhett Morrow, BigStar Circus'
const wrap = (inner: string) => `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#222;line-height:1.55;max-width:600px">${inner}<p style="margin-top:18px">Rhett Morrow<br><em>Proud Founder of BigStar Circus &amp; Ring Master of Fun!</em> 🎪</p></div>`
const p = (s: string) => `<p style="margin:10px 0">${s}</p>`
const h = (s: string) => `<p style="margin:16px 0 4px;font-weight:800;color:#D72027">${s}</p>`
const ul = (items: string[]) => `<ul style="margin:6px 0;padding-left:20px">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`

const hi = (name: string) => p(`Dear ${name || 'there'},`)

export function freeTrialEmails(firstName: string) {
  const name = firstName || 'there'
  return [
    { key: 'ft1', offsetDays: 0, subject: '🎪 Welcome to BigStar Circus — you’re in!', html: wrap(
      hi(name) +
      p(`Welcome to BigStar Circus — we’re thrilled to have you join us for a <strong>free trial class!</strong> 🌟`) +
      p(`Over the next few days one of our team will be in touch to set up your trial, and you’ll get a short series of friendly emails to help you feel right at home.`) +
      h('Staying in the loop') +
      p(`The best way to stay updated is email — we send a monthly newsletter with classes, workshops and events. Questions? Email <strong>admin@bigstarcircus.com.au</strong> or call <strong>0489 188 179</strong>.`) +
      p(`Explore everything at <a href="${LINKS.web}">bigstarcircus.com.au</a>. Join the community: <a href="${LINKS.fb}">Facebook</a> · <a href="${LINKS.ig}">Instagram @bigstarcircus</a>`) +
      h('Where to find us') +
      p(`Classes are at our Molendinar studio, <strong>Unit 1/14 Harper St, Molendinar</strong> (plus other convenient locations).`) +
      h('For your first class') +
      ul(['Wear comfy clothes that move', 'Bring a water bottle (refill station onsite)', 'Don’t forget a big smile!']) +
      p(`Tomorrow we’ll send the key dates for the year ahead. Can’t wait to see the magic happen! 🎪✨`)
    ) },
    { key: 'ft2', offsetDays: 2, subject: '📅 Save these dates — what’s coming up at BigStar', html: wrap(
      hi(name) +
      p(`Welcome to Part 2 of your BigStar journey! 🎉 Let’s make sure you’re set up for a smooth, fun and magical year.`) +
      h('Save these dates') +
      ul([`<strong><a href="${LINKS.shw}">September Holiday Workshops</a></strong> — Sep 22–26, 29, 30 &amp; 1 Oct, 9am–3pm — book online`, `<strong><a href="${LINKS.kno}">Kids Night Out / Disco</a></strong> — see dates &amp; book your spot`, 'Special surprise themed days — keep an eye on your inbox 🎉']) +
      h('As part of our community, your child will') +
      ul(['Learn amazing circus skills — juggling, tumbling, aerials, magic and more', 'Earn stars &amp; prizes with our Positive Stars Achievement Program', 'Build confidence in a safe, inclusive, supportive space', 'Make new friends and feel celebrated every step of the way']) +
      p(`Tomorrow: how easy it is to stay enrolled, make-up classes and more. 🌟`)
    ) },
    { key: 'ft3', offsetDays: 3, subject: '🌟 Why kids stay at BigStar for years', html: wrap(
      hi(name) +
      p(`Welcome to Part 3! Today, a peek at why so many kids fall in love with BigStar — and stay for years.`) +
      p(`Our mission is simple: spark joy, build confidence, and help every child discover a lifelong love of circus arts. From their first tumble to their first aerial spin, we celebrate every milestone.`) +
      p(`<em>“My daughter does circus every Saturday and improves every week. Rhett is such a good teacher — we’re very glad to see Sophia doing the classes.”</em>`) +
      h('Grab your BigStar uniform top!') +
      p(`Nothing says “I’m part of the circus family” like the BigStar uniform — comfy, practical, and doubles as a costume. Available at reception for <strong>$30</strong> in multiple sizes.`) +
      p(`Tomorrow: how make-up classes and payments work, plus tips to get the most from every session.`)
    ) },
    { key: 'ft4', offsetDays: 4, subject: '❓ Make-up classes, payments & tips — the practical bits', html: wrap(
      hi(name) +
      p(`Welcome to Part 4 — the practical magic that makes classes easy and stress-free.`) +
      h('1. What if my child misses a class?') +
      ul(['Let us know 3–24 hours before class', 'Up to 2 make-ups per student per term, within the same term', 'Pre-booked through the office, space permitting', 'Not available for special events, workshops or holiday programs']) +
      h('2. How do payments work?') +
      ul(['<strong>Permanent:</strong> $27 per class (1/week) via weekly direct debit', '<strong>Casual:</strong> $35 per class, 24 hours’ notice', 'Cancellation: 2 weeks’ notice to stop payments', 'School holidays: permanent subscriptions pause — you only pay for active classes']) +
      h('3. Tips to shine') +
      ul(['Bring energy &amp; curiosity', 'Practice at home (even 5 minutes!)', 'Celebrate every star earned', 'Grab the uniform &amp; make friends']) +
      p(`It’s all about fun, growth, confidence and connection. 🌟`)
    ) },
    { key: 'ft5', offsetDays: 6, subject: '💛 Share the magic — invite a friend', html: wrap(
      hi(name) +
      p(`By now you’ve seen how fun and confidence-building our classes are. Here’s a secret: the magic multiplies when families share it with friends. 💛`) +
      h('Ways to spread the cheer') +
      ul([`<strong>Invite a friend</strong> — send them our <a href="${LINKS.trial}">free trial link</a>`, `<strong>Share the fun</strong> — post a pic and tag <a href="${LINKS.ig}"><strong>@bigstarcircus</strong></a>`, `<strong>Leave a Google review</strong> — <a href="${LINKS.review}">click here</a> — it helps other families find us`]) +
      p(`Thank you for being part of the BigStar family — we can’t wait for all the magic, tricks and friendships ahead! 🎪`)
    ) },
    { key: 'ft6', offsetDays: 8, subject: '🤸 Meet your BigStar coaches — the team behind the magic', html: wrap(
      hi(name) +
      p(`We thought you’d love to meet the friendly faces who’ll be cheering your child on every week. 🌟`) +
      h('Rhett — Founder &amp; Head Coach') +
      p(`Our Ring Master of Fun! Rhett founded BigStar Circus to help kids build confidence, courage and a lifelong love of circus arts — and makes sure every child feels like a superstar from day one.`) +
      h('Rodrigo — Coach') +
      p(`Rodrigo brings incredible skill and endless energy to every class, with a real gift for helping kids nail tricks they never thought they could do.`) +
      h('Tameara — Coach') +
      p(`Tameara’s warmth and encouragement make every child feel safe, supported and excited to try — a favourite with the little ones!`) +
      p(`Your child is in wonderful hands. Come say hi at your trial — we can’t wait to meet you! 🎪`)
    ) },
  ]
}
