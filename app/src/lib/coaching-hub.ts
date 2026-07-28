// Coaching Hub content — the BSC Coach Academy, pay/progression ladder, and
// hiring kit. Static, franchise-portable reference content rendered at /coaching.

export type Module = { n: number; title: string; summary: string; points: string[] }

export const ACADEMY: Module[] = [
  {
    n: 1, title: 'The BSC Way', summary: 'Who we are, our values, and child safety first.',
    points: [
      'Our mission: build young performers, confidence and community — not just teach tricks.',
      'Core values: Creativity · Inclusivity · Safety · Community · Fun.',
      'Child safety is non-negotiable: Blue Card current, supervision ratios, never alone 1:1 out of sight.',
      'Report any concern to the head coach the same day.',
    ],
  },
  {
    n: 2, title: 'Running the Room — class structure', summary: 'Structure prevents chaos. Kill downtime, build routine.',
    points: [
      'Use STATIONS kids rotate through in small groups — everyone always doing, never queuing.',
      'Same ritual every class: same opening circle, warm-up, and finish. Predictability = calm.',
      'Burn energy FIRST (5 min big movement), then teach skill.',
      'Three rules, framed as DOs: “Safe body · Listening ears · Have a go.”',
      'Short blocks with countdowns: “2 more goes… 5-4-3-2-1, swap!”',
      'Pre-warn every transition — no cold stops.',
    ],
  },
  {
    n: 3, title: 'Big Energy, ADHD & boundary-testers', summary: 'Circus is brilliant for these kids. Prevent, don’t punish.',
    points: [
      'Prevention beats punishment: set up the environment & expectations so problems don’t start.',
      'Catch them being good — instant, specific praise. Award a Star the SECOND they do well.',
      'Give the live-wire a job: demonstrator, equipment helper, coach’s assistant.',
      'Proximity + quiet cues beat shouting. Stand near, low voice, eye level.',
      'When it tips over: stay calm, shrink the audience, offer a choice (“silks or trampoline first?”), use a 60-second reset corner (not a punishment).',
      'Check the tablet for each child’s flags & “what works” note before class.',
    ],
  },
  {
    n: 4, title: 'Roll Call, StarBand & the tablet', summary: 'Mark attendance, award stars, keep kids safe.',
    points: [
      'Take the roll every class — it’s the safety register.',
      'Award stars live for effort & milestones — instant reinforcement.',
      'Check allergy / medical / support-needs flags on the Confirm screen.',
      'Know who’s authorised to collect each child.',
    ],
  },
  {
    n: 5, title: 'Circus skill modules', summary: 'Your skills grow — and so does your pay. Each unlock = a step up.',
    points: [
      'Acro & tumbling (foundation) → Aerial (silks, lyra, trapeze) → Juggling & objects → Clowning & performance.',
      'Each discipline you’re signed off to teach is a “skill unlock” — and a pay bump.',
      'Spotting & rigging safety must be signed off before you teach aerial.',
    ],
  },
  {
    n: 6, title: 'Solo certification', summary: 'The milestone: from shadow to leading your own room.',
    points: [
      'You can run a class solo, safely and confidently.',
      'You know the roll & class structure inside out.',
      'You know the kids — names, flags, families.',
      'Signed off by the head coach. This is the Coach → Lead Coach pay jump.',
    ],
  },
  {
    n: 7, title: 'The New Rules — Membership, Holidays & Safety (from Term 4)', summary: 'Every coach & admin must know these. Full printable briefing on the Compliance page.',
    points: [
      'All-year membership: 1st child $30 / $50 / $60 for 1 / 2 / 3 classes; sibling $20/class; casual $37. Billed every week, all year (GST-free).',
      'School Holiday Program is included for members on their REGULAR class day (6hr, 9am–3pm). A different day = $60 — no day-swapping. Extra days $60.',
      'Members book holiday days FIRST — a ~5-week window each term — then it opens to the public and late members can miss out.',
      'Kids Night Out: INCLUDED free for members (weekly fee covers it), 4×/year, members book first; non-members $60.',
      'SAFETY: every child signs in & out (StarBand tap or iPad login) + your manual roll — it’s our duty of care under QLD Child Safe Standards.',
      'Classes run all year incl public holidays. Up to 2 make-up classes/term. Cancellations need 3 weeks’ notice.',
    ],
  },
]

export type PayTier = { stage: string; who: string; level: string; rate: string; note: string }

// Rates based on the Fitness Industry Award (MA000094), casual incl. 25% loading,
// current from 1 July 2025. A 4.75% increase applies from 1 July 2026 — review then.
export const PAY_TIERS: PayTier[] = [
  { stage: '1 · Trainee / Shadow Coach', who: 'Learning, always supervised, assisting classes', level: 'Award Level 1–2', rate: '~$30–31/hr', note: 'Confirm employee vs genuine work-experience status.' },
  { stage: '2 · Coach', who: 'Delivers classes with backup, knows the drills', level: 'Award Level 3', rate: '~$33/hr', note: 'Casual rate incl. loading.' },
  { stage: '3 · Lead Coach', who: 'Runs classes solo, owns the roll & structure, knows the kids', level: 'Award Level 4', rate: '~$37/hr', note: 'The big jump — “solo certified”. + lead loading.' },
  { stage: '4 · Senior / Head Coach', who: 'Programs, mentors coaches, directs shows', level: 'Award Level 5', rate: '~$40/hr+', note: 'Future head-coach track.' },
]

export const INCENTIVES: string[] = [
  '🎪 Skill unlocks — each new circus discipline you’re signed off on earns more.',
  '⭐ Solo certified — the day you stop shadowing and lead = the Coach → Lead jump.',
  '🧒 Knows the room — every kid’s name, flags & family known = milestone bonus.',
  '📅 Loyalty step-up — annual rise so great coaches stay.',
]

export const COMPLIANCE_NOTE =
  'Pay rates are guided by the Fitness Industry Award (MA000094). Casual employees must be paid at least the casual minimum (incl. 25% loading) for the work they do. Genuine volunteer/work-experience honorariums are different — confirm each person’s status. Rates rise ~4.75% from 1 July 2026.'

export const PERFECT_COACH = {
  strategy: 'Hire gymnastics / acro / cheer / dance coaches — NOT circus performers. Performers’ priority is the stage; coaches’ priority is the room. Gym coaches already have the Blue Card, First Aid, the want-to-coach, and the foundations — and they’re moldable.',
  haveAlready: ['Coaching background with children', 'Blue Card + First Aid', 'Acro / tumbling / gymnastics / dance foundations', 'Coaching-first mindset, patience, reliability, warmth', 'Great with energetic & neurodiverse kids', 'Wants a long-term career'],
  weTrain: ['Aerial (silks, lyra, trapeze)', 'Juggling & object manipulation', 'Clowning & performance', 'Show programming & BSC class structure'],
  redFlags: ['“Performer wanting income between gigs”', 'Unreliable / job-hopper', 'Not coachable / ego in the room', 'Dismissive of neurodiverse kids'],
}

export const KEY_INTERVIEW_QUESTION = 'Do you want to perform, or do you want to build performers?'

export type TraineeLevel = { key: string; title: string; duties: string[]; pay: string; note?: string }
// From Rhett's Canva trainee booklet. Pay figures are his — confirm each meets
// the Fitness Award junior minimum for the trainee's age (accountant signs off).
export const TRAINEE_PATHWAY: TraineeLevel[] = [
  { key: 'trainee_trainer', title: 'Trainee Trainer', duties: ['Shadow trainers', 'Help with setup & student support', 'Learn class-management basics', 'Keep your logbook'], pay: '$0 · ~100 hrs', note: 'Unpaid ONLY if genuine observation/learning — not doing real coaching work.' },
  { key: 'junior_trainer', title: 'Junior Trainer', duties: ['Assist trainers in running sections', 'Lead warm-ups & cooldowns', 'Communicate with students'], pay: '~$10/hr', note: 'Casual junior employee — check against the Fitness Award junior minimum.' },
  { key: 'assistant_trainer', title: 'Assistant Trainer', duties: ['Help plan classes & teach under supervision', 'Assist with assessments & parent feedback'], pay: 'from 15yr · ~$13.50/hr', note: 'Needs a TFN (NOT an ABN — they’re an employee, not a contractor).' },
  { key: 'trainer', title: 'Trainer', duties: ['Independently plan & run classes', 'Manage progression & evaluations', 'Communicate with parents', 'Ensure safety & proper equipment use'], pay: '$25+/hr' },
]

export const ZERO_TALENT = ['Being on time', 'Good body language', 'Strong work ethic', 'Extra effort', 'Energy', 'Attitude & passion', 'Being coachable', 'Being prepared', 'No chatting back']

export type CoachVideo = { n: number; title: string; desc: string; length: string }

// Coach onboarding video course — recorded personally by Rhett. Shown "coming soon"
// until the videos are filmed. Scripts live in bsc-crm/coach-training/video-scripts.md.
export const COACH_VIDEOS: CoachVideo[] = [
  { n: 1, title: 'Welcome to the Family', desc: 'Who we are, our mission and our five values.', length: '~2 min' },
  { n: 2, title: 'Safety Is Everything', desc: 'Blue Card, supervision, authorised pickup, reporting concerns.', length: '~2 min' },
  { n: 3, title: 'How We Run a Class', desc: 'Stations, routine, burning energy first, the three rules.', length: '~3 min' },
  { n: 4, title: 'Big Energy Kids', desc: 'Managing ADHD, neurodiverse & boundary-testing kids the BSC way.', length: '~3 min' },
  { n: 5, title: 'Stars & Rewards', desc: 'How and when to award stars — instant, specific, genuine.', length: '~2 min' },
  { n: 6, title: 'The Tablet & Roll Call', desc: 'Attendance as a safety register, reading flags, awarding stars.', length: '~2 min' },
  { n: 7, title: 'Learning the Circus Craft', desc: 'Acro → aerial → juggling → performance, and skill sign-offs.', length: '~2 min' },
  { n: 8, title: 'Where This Goes — Your Path & Pay', desc: 'The coach ladder, solo certification and how your pay grows.', length: '~2 min' },
]
