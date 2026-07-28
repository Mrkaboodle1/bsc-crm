import 'server-only'
import { sendSms } from './sms'
import { sendEmail } from './email'

// The exact welcome copy Rhett approved (SHW + KNO). Sent automatically to a family
// the moment their booking is auto-created from a Stripe payment.

export const SHW_SMS = `Hi! 😊 Thanks for booking into our BigStar Circus School Holiday Workshop,

We've just sent you a welcome email with everything you need to know. Please check your inbox (and junk/spam folder).

🕘 Workshop: 9:00am–3:00pm
🎒 Please bring: Morning tea, lunch, a water bottle and comfortable clothing.

If you have any questions, feel free to call Rhett on 0489 188 179.

See you soon! 🎪`

export const KNO_SMS = `🎉 Thanks for booking into BigStar Circus Kids Night Out!

We've just emailed you all the event details. Please check your inbox (and junk/spam folder).

🕓 4:00pm–9:00pm
🎒 Please bring: Dinner, a water bottle, comfortable clothing and enclosed shoes.

Questions? Call Rhett on 0489 188 179.

See you soon! 🎪😊`

const SHW_EMAIL = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#222;line-height:1.5;max-width:600px">
<p>🎪 <strong>Welcome to BigStar Circus School Holiday Workshops!</strong></p>
<p>Hi! Thanks for booking with us. We're excited to see your little superstar soon! 🤸⭐</p>
<p>📍 <strong>Location:</strong> BigStar Circus, Unit 1/14 Harper St, Molendinar</p>
<p>🕘 <strong>Time:</strong> 9:00am – 3:00pm</p>
<p>🎒 <strong>Please bring:</strong></p>
<ul style="margin:6px 0;padding-left:20px"><li>🥪 Packed morning tea &amp; lunch</li><li>💧 Water bottle</li><li>👕 Comfortable clothing</li><li>👟 Enclosed shoes</li></ul>
<p>We'll be enjoying a full day of circus skills, aerials, acrobatics, juggling, games, arts &amp; crafts and loads of fun!</p>
<p>If you haven't already, please complete your online waiver before attending.</p>
<p>If you have any questions, feel free to call <strong>Rhett on 0489 188 179</strong>.</p>
<p>We can't wait to see you at BigStar Circus! 🎪😊</p></div>`

const KNO_EMAIL = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#222;line-height:1.5;max-width:600px">
<p>Hi,</p>
<p>Thank you for booking into our <strong>BigStar Circus Kids Night Out!</strong> 🎪🎉</p>
<p>We're so excited to have your child join us for an evening packed with fun, friends and circus adventures!</p>
<h3 style="margin:14px 0 6px">📍 Event Details</h3>
<p><strong>Location:</strong> BigStar Circus, Unit 1/14 Harper Street, Molendinar QLD 4214</p>
<p>🕓 <strong>Drop-off:</strong> 4:00pm<br>🕘 <strong>Pick-up:</strong> 9:00pm</p>
<h3 style="margin:14px 0 6px">🎒 What to Bring</h3>
<ul style="margin:6px 0;padding-left:20px"><li>🍕 Dinner (unless advised otherwise)</li><li>🥤 Water bottle</li><li>👕 Comfortable clothing suitable for circus activities</li><li>👟 Enclosed shoes</li></ul>
<h3 style="margin:14px 0 6px">🎪 What's Included</h3>
<ul style="margin:6px 0;padding-left:20px"><li>Circus Skills</li><li>Acrobatics</li><li>Aerials</li><li>Games &amp; Team Challenges</li><li>Disco &amp; Dancing</li><li>Balloon Twisting</li><li>Arts &amp; Crafts</li><li>Movie &amp; Chill Time</li><li>Popcorn and lots of fun!</li></ul>
<p>📞 Questions? Call <strong>0489 188 179</strong><br>🌐 www.bigstarcircus.com.au</p>
<p>We can't wait to see your little superstar for an unforgettable Kids Night Out!</p>
<p>Kind regards,<br><strong>Rhett Morrow</strong><br>BigStar Circus 🎪</p></div>`

export async function sendWelcome(to: { phone?: string | null; email?: string | null }, isKno: boolean): Promise<{ sms: boolean; email: boolean }> {
  const out = { sms: false, email: false }
  if (to.phone) { const r = await sendSms(to.phone, isKno ? KNO_SMS : SHW_SMS); out.sms = r.ok }
  if (to.email) { const r = await sendEmail(to.email, isKno ? '🎪 Welcome to BigStar Circus Kids Night Out!' : '🎪 Welcome to BigStar Circus School Holiday Workshops!', isKno ? KNO_EMAIL : SHW_EMAIL); out.email = r.ok }
  return out
}
