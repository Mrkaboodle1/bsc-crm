// Page templates — used when creating a new page in a site. Each entry is
// a friendly name + a starter blocks array. Saves new users from staring
// at a blank canvas.

import { makeBlock, type Block } from './blocks'

export type PageTemplate = {
  id: string
  name: string
  icon: string
  description: string
  /** factory so each call returns a fresh array (no shared mutable refs) */
  build: () => { name: string; slug: string; blocks: Block[] }
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    icon: '⬜',
    description: 'Start with nothing and build it your way.',
    build: () => ({ name: 'New page', slug: 'new-page', blocks: [] }),
  },
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    description: 'Hero, features, social proof, call-to-action.',
    build: () => ({
      name: 'Home',
      slug: 'home',
      blocks: [
        {
          type: 'hero',
          title: 'Big Star Circus',
          subtitle: 'Where kids fly. Literally.',
          cta: { text: 'Book a free trial', href: '/f/trial' },
        },
        makeBlock('features'),
        makeBlock('cta'),
      ],
    }),
  },
  {
    id: 'about',
    name: 'About us',
    icon: '🎪',
    description: 'Story, team, mission — who we are and why.',
    build: () => ({
      name: 'About us',
      slug: 'about',
      blocks: [
        { type: 'heading', text: 'About Big Star Circus', level: 1, align: 'center' },
        { type: 'paragraph', text: 'We\'re a real working circus studio on the Gold Coast — teaching aerial, acro, juggling, and tumbling to kids and adults since 2015.', align: 'center' },
        makeBlock('image'),
        { type: 'features', title: 'What makes us different', items: [
          { icon: '🏆', title: 'Working performers',  body: 'Our coaches still tour, perform, and compete. They bring the real thing to the floor.' },
          { icon: '⭐', title: 'Tiny ratios',          body: 'Max 8 kids per coach. Everyone gets a turn on the trapeze.' },
          { icon: '🎭', title: 'Showcases & comps',   body: 'Twice a year your kid steps under the lights.' },
        ] },
        makeBlock('cta'),
      ],
    }),
  },
  {
    id: 'contact',
    name: 'Contact',
    icon: '✉️',
    description: 'Form + studio address + opening hours.',
    build: () => ({
      name: 'Contact',
      slug: 'contact',
      blocks: [
        { type: 'heading', text: 'Get in touch', level: 1, align: 'center' },
        { type: 'paragraph', text: 'Drop us a line and we\'ll get back within a working day. Or call us directly.', align: 'center' },
        makeBlock('form'),
      ],
    }),
  },
  {
    id: 'pricing',
    name: 'Pricing',
    icon: '💲',
    description: 'Term fees, casual rates, NDIS notes.',
    build: () => ({
      name: 'Pricing',
      // 'prices' (not 'pricing') — the default navbar links to /s/bigstar/prices.
      slug: 'prices',
      blocks: [
        { type: 'heading', text: 'Pricing', level: 1, align: 'center' },
        { type: 'paragraph', text: 'Simple weekly rates. No lock-in. NDIS plan-managed welcome.', align: 'center' },
        { type: 'features', title: 'Choose a plan', items: [
          { icon: '🎟', title: 'Casual',   body: '$45/class — pay as you go. Great for trying us out.' },
          { icon: '⭐', title: 'Term',     body: '$35/week — committed weekly slot, billed via subscription.' },
          { icon: '♿', title: 'NDIS',     body: 'We invoice plan-managers directly. No out-of-pocket.' },
        ] },
        makeBlock('cta'),
      ],
    }),
  },
  {
    id: 'thank-you',
    name: 'Thank you',
    icon: '🙏',
    description: 'Funnel end-step after sign-up or purchase.',
    build: () => ({
      name: 'Thank you',
      slug: 'thank-you',
      blocks: [
        { type: 'heading', text: 'You\'re in 🎉', level: 1, align: 'center' },
        { type: 'paragraph', text: 'We\'ll be in touch within one working day with the next step. Keep an eye on your inbox (and check spam if you don\'t see us).', align: 'center' },
        { type: 'spacer', size: 'md' },
        { type: 'button', text: 'Back to home', href: '/s/bigstar', variant: 'secondary' },
      ],
    }),
  },
  {
    id: 'trial',
    name: 'Free trial offer',
    icon: '🎯',
    description: 'Single-purpose landing page that asks for one thing.',
    build: () => ({
      name: 'Free trial',
      slug: 'trial',
      blocks: [
        {
          type: 'hero',
          title: 'Your first circus class is free',
          subtitle: 'Aerial, acro, tumbling — pick your day, we\'ll save you a spot.',
          cta: { text: 'Claim my free trial', href: '#form' },
        },
        { type: 'features', title: 'What you get', items: [
          { icon: '🎪', title: '60-minute class',  body: 'A real session with a working coach — not a 15-minute taster.' },
          { icon: '👕', title: 'Loaner uniform',  body: 'We supply the gear. Just bring water and a smile.' },
          { icon: '🎁', title: 'No commitment',   body: 'Love it? Roll into a term spot. Don\'t love it? No worries.' },
        ] },
        makeBlock('form'),
      ],
    }),
  },
]

export function getTemplate(id: string): PageTemplate | null {
  return PAGE_TEMPLATES.find((t) => t.id === id) ?? null
}
