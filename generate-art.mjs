// Generate premium BigStar hero artwork via OpenAI DALL-E 3.
// Saves PNGs into starreward-art/ — these get uploaded to Canva next.
import fs from 'node:fs'
import path from 'node:path'

const KEY = process.env.OPENAI_API_KEY
if (!KEY) { console.error('OPENAI_API_KEY not set'); process.exit(1) }

const STYLE = `Cinematic Pixar/Dreamworks-quality illustration. Premium kids entertainment franchise aesthetic — think Disney parks meets Ninja Warrior arena meets a vintage circus marquee. Bold BigStar Circus brand colours: deep red #D72027, gold #FFC107, charcoal #18181b, cream/ivory. Dramatic stage lighting with warm golden glow. Layered depth, shallow depth of field, magical sparkle particles. Premium polished render — NO clipart, NO flat design, NO childish vector look. Background simple enough to overlay text on. Square 1:1 format.`

const PROMPTS = [
  { name: 'hero-gymnastic', prompt: `A confident smiling Australian primary-school child (ages 7-9, mixed-gender feel, real kid not exaggerated) doing a dynamic gymnastics back-walkover on a polished circus floor inside a beautifully lit red-and-gold BigStar Circus arena. Spotlight glow on the child. Soft golden particles. Big stars subtly floating in the background. ${STYLE}` },
  { name: 'hero-aerial',    prompt: `A graceful child (age 9-11) hanging confidently from a vertical aerial silk that glows red, mid-pose with one leg extended. Inside a magical circus arena with warm spotlights and floating gold sparkles. Velvet circus tent shape in soft focus background. The child looks proud and capable, not strained. ${STYLE}` },
  { name: 'hero-juggling',  prompt: `A grinning child (age 8-10) juggling three glowing gold orbs that trail magical light arcs through the air, mid-throw, eyes tracking the highest ball. Polished BigStar studio behind, warm red and amber spotlights. Confident playful pose. ${STYLE}` },
  { name: 'hero-hoops',     prompt: `A child (age 8-10) twirling a glowing aerial lyra (circus hoop) that radiates gold light, mid-spin pose with one hand reaching skyward. Sparkle particles drifting upward. Plush red curtain backdrop slightly blurred. ${STYLE}` },
  { name: 'hero-flowerstick', prompt: `A child (age 7-9) confidently balancing and tossing a colourful flower stick (devil stick) with two hand sticks, mid-trick. Magical golden trail behind the flower stick. Polished circus floor, warm lighting. Joyful focused expression. ${STYLE}` },
  { name: 'badge-little-star',  prompt: `A single oversized cream-and-sky-blue circus achievement badge floating in space — circular, with a centred 5-point gold-edged star, soft cream interior, a thin sky-blue ring, tiny sparkle particles around it. Premium metallic finish, soft glow, no text inside. Pure black/charcoal background. Game-UI collectible aesthetic. ${STYLE}` },
  { name: 'badge-rising-star',  prompt: `A circular achievement badge — sky blue and silver — with TWO 5-point gold stars centred and a small upward arrow chevron beneath them. Polished metallic finish, glowing rim, sparkle particles. Pure black background. ${STYLE}` },
  { name: 'badge-superstar',    prompt: `A circular achievement badge — radiant gold and amber — with THREE 5-point gold stars arranged in a small triangle and a sun-burst ray pattern radiating outward. Strong golden glow, premium metallic finish. Pure black background. ${STYLE}` },
  { name: 'badge-champion',     prompt: `A circular achievement badge — deep red and gold — with FOUR 5-point gold stars and a small ribbon medal hanging from the bottom. Polished award medallion look, rich red enamel, gold rim, soft glow. Pure black background. ${STYLE}` },
  { name: 'badge-elite',        prompt: `A circular achievement badge — royal purple and gold — with FIVE 5-point gold stars arranged in a small crown shape and a tiny gold crown above. Velvet purple finish, gold filigree edge, regal glow. Pure black background. ${STYLE}` },
  { name: 'badge-legend',       prompt: `A circular achievement badge — pure black and radiant gold — with one giant centred 5-point gold star and a laurel wreath of small stars surrounding it. The ultimate trophy badge. Heavy gold glow, premium metallic finish, sparkle particles. Pure black background. ${STYLE}` },
  { name: 'cabinet-hero',       prompt: `A cinematic shot of a glowing red-and-gold trophy cabinet inside a BigStar Circus studio. Shelves stacked with stickers, water bottles, juggling balls, branded t-shirts, glowing golden trophies, and a centred plaque saying "BIGSTAR LEGENDS WALL" with mounted gold stars. Warm dramatic lighting, soft golden particles in the air. ${STYLE}` },
]

async function gen({ name, prompt }) {
  console.log(`→ ${name}`)
  // Try dall-e-3 returning a URL (default since they dropped response_format).
  const body = { model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'high' }
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  })
  if (!r.ok) { console.error(`  ✗ ${name}:`, r.status, (await r.text()).slice(0, 200)); return null }
  const json = await r.json()
  const item = json.data[0]
  let buf
  if (item.b64_json) buf = Buffer.from(item.b64_json, 'base64')
  else if (item.url)  buf = Buffer.from(await (await fetch(item.url)).arrayBuffer())
  else { console.error(`  ✗ ${name}: no image in response`); return null }
  const out = path.join('starreward-art', `${name}.png`)
  fs.writeFileSync(out, buf)
  console.log(`  ✓ ${(buf.length / 1024).toFixed(0)} KB → ${out}`)
  return out
}

for (const p of PROMPTS) await gen(p)
console.log('\nAll DALL-E hero art generated.')
