// Star Reward design library — stored per-tenant in tenants.settings.reward_designs
// (JSON, so no migration needed). Falls back to the built-in BSC defaults until
// the owner customises it. Franchise-ready: each business curates its own.

export type RewardDesign = {
  id: string
  section: string            // one of SECTION_META ids
  title: string
  desc: string
  viewUrl?: string           // Canva (or any) link
  pdf?: string               // local pdf slug in /public/star-rewards/<slug>.pdf
  pdfUrl?: string            // external pdf link
  pages?: number
}

export const SECTION_META: { id: string; title: string; description: string }[] = [
  { id: 'skill-cards', title: 'Skill Cards', description: 'The main per-discipline progression cards. One row per level — student name, class, photo per skill, teacher sign-off.' },
  { id: 'progress-cards', title: 'Progress Cards', description: 'Supplementary cards used alongside the Skill Cards.' },
  { id: 'books', title: 'Books & Decoration', description: 'Stars challenge book and studio wall decor.' },
  { id: 'other', title: 'Other Designs', description: 'Anything else your team uses.' },
]

export const DEFAULT_DESIGNS: RewardDesign[] = [
  { id: 'gymnastic-skill-card', section: 'skill-cards', title: 'Gymnastic Skill Card', desc: 'Pre-Conditioning + Levels 1–5 + Performance Troupe finale. 7 pages.', viewUrl: 'https://www.canva.com/d/5a0lWtu4Esa6l8v', pdf: 'gymnastic-skill-card', pages: 7 },
  { id: 'aerial-skill-card', section: 'skill-cards', title: 'Aerial Skill Card', desc: 'Silks, lyra, trapeze progression. 7 pages.', viewUrl: 'https://www.canva.com/d/ag_CH0J5qN2wFWn', pdf: 'aerial-skill-card', pages: 7 },
  { id: 'juggling-skill-card', section: 'skill-cards', title: 'Juggling Skill Card', desc: 'Toss patterns and progression skills. 6 pages.', viewUrl: 'https://www.canva.com/d/mE_43LIw-IlNTQ3', pdf: 'juggling-skill-card', pages: 6 },
  { id: 'hoops-skill-cards', section: 'skill-cards', title: 'Hoops Skill Cards', desc: 'Aerial hoop / lyra progression. 7 pages.', viewUrl: 'https://www.canva.com/d/Vrh4dhmcPIc2Cb0', pdf: 'hoops-skill-cards', pages: 7 },
  { id: 'flower-stick-skill-cards', section: 'skill-cards', title: 'Flower Stick Skill Cards', desc: 'Flower / devil stick progression. 6 pages.', viewUrl: 'https://www.canva.com/d/cmnb9e-AJT-bUhV', pdf: 'flower-stick-skill-cards', pages: 6 },
  { id: 'silk-lyra-progress-cards', section: 'progress-cards', title: 'Silk / Lyra Progress Cards', desc: 'Supplementary aerial progression detail. 6 pages.', viewUrl: 'https://www.canva.com/d/xWVQqAnHYYkIbAN', pdf: 'silk-lyra-progress-cards', pages: 6 },
  { id: 'acrobatics-progress-cards', section: 'progress-cards', title: 'Acrobatics Progress Cards', desc: 'Acro pair and group work progression. 10 pages.', viewUrl: 'https://www.canva.com/d/TuCw5KwnL6-xP_f', pdf: 'acrobatics-progress-cards', pages: 10 },
  { id: 'juggling-progress-cards', section: 'progress-cards', title: 'JUGGLING Progress Cards (Long)', desc: 'Extended juggling progression — every skill broken down. 13 pages.', viewUrl: 'https://www.canva.com/d/jADxsYLlmTgNu7d', pdf: 'juggling-progress-cards', pages: 13 },
  { id: 'strength-challenge-cards', section: 'progress-cards', title: 'Strength Challenge Cards', desc: 'Conditioning challenges to award stars. 4 pages.', viewUrl: 'https://www.canva.com/d/eCColfReqLUyean', pdf: 'strength-challenge-cards', pages: 4 },
  { id: 'stars-challenge-book-1', section: 'books', title: 'BigStar Circus Stars Challenge Book 1', desc: 'The Stars Challenge booklet that families take home. 8 pages.', viewUrl: 'https://www.canva.com/d/6dAnS_0YOtxEMvb', pdf: 'stars-challenge-book-1', pages: 8 },
  { id: 'a3-decoration', section: 'books', title: 'A3 Decoration', desc: 'Large-format studio wall decor for the Star Rewards system. 5 pages.', viewUrl: 'https://www.canva.com/d/wD8p859yl58UKIc', pdf: 'a3-decoration', pages: 5 },
]

export function normaliseDesigns(stored: unknown): RewardDesign[] {
  if (!Array.isArray(stored)) return DEFAULT_DESIGNS
  const valid = stored.filter((d): d is RewardDesign => !!d && typeof d === 'object' && typeof (d as RewardDesign).title === 'string')
  return valid
}
