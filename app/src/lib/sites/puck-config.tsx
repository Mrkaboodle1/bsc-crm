// Puck (https://github.com/measuredco/puck) configuration that powers the
// page editor and the public renderer. Each entry below is one block type
// the user can drag onto the canvas. The `render` function reuses our
// existing BlockView markup so a page looks identical in edit mode, in the
// preview iframe thumbnails, and on the live /s/<slug> URL.
//
// Big-picture: Puck stores data as `{ content: Item[], root: {...} }`
// where each Item is `{ type, props }`. Our DB stores `Block[]` (a flat
// array with `type` + flattened fields). The adapter in puck-adapter.ts
// translates between the two.

import type { Config } from '@measured/puck'
import { BlockView } from '@/components/sites/block-view'
import type { Block } from './blocks'

// ─────────────────────────────────────────────────────────────
// Shared field option sets — keeps the dropdowns consistent
// ─────────────────────────────────────────────────────────────

const ALIGN_OPTIONS = [
  { label: 'Left',   value: 'left'   },
  { label: 'Centre', value: 'center' },
  { label: 'Right',  value: 'right'  },
] as const

const BUTTON_VARIANTS = [
  { label: '🔴 Primary (red)',     value: 'primary'   },
  { label: '🟡 Secondary (yellow)', value: 'secondary' },
  { label: '⚪ Ghost (outline)',    value: 'ghost'     },
] as const

const SPACER_SIZES = [
  { label: 'Small',       value: 'sm' },
  { label: 'Medium',      value: 'md' },
  { label: 'Large',       value: 'lg' },
  { label: 'Extra large', value: 'xl' },
] as const

const FIELD_TYPES = [
  { label: 'Single line',   value: 'text'     },
  { label: 'Email',         value: 'email'    },
  { label: 'Phone number',  value: 'phone'    },
  { label: 'Multi-line',    value: 'textarea' },
] as const

// ─────────────────────────────────────────────────────────────
// Block components — render functions reuse <BlockView />
// ─────────────────────────────────────────────────────────────

// Casting helpers — Puck's strict generics get noisy; the shape always
// matches Block so a direct cast is safe.
function render<T extends Block['type']>(type: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => <BlockView block={{ type, ...props } as Block} />
}

export const puckConfig: Config = {
  // Categories control the left-hand palette grouping in Puck's editor.
  categories: {
    text:     { title: '📝 Text',     components: ['Heading', 'Paragraph'] },
    media:    { title: '🖼 Media',    components: ['Image'] },
    cta:      { title: '🎯 CTA',      components: ['Button', 'CtaSection', 'Form'] },
    layout:   { title: '📐 Layout',   components: ['Hero', 'Features', 'Spacer', 'Divider'] },
    advanced: { title: '🛠 Advanced', components: ['Embed'] },
  },
  components: {
    // ── Text ────────────────────────────────────────────────
    Heading: {
      label: 'Heading',
      fields: {
        text:  { type: 'text', label: 'Heading text' },
        level: { type: 'select', label: 'Size', options: [
          { label: 'Largest (H1)', value: 1 },
          { label: 'Medium  (H2)', value: 2 },
          { label: 'Small   (H3)', value: 3 },
        ] },
        align: { type: 'select', label: 'Alignment', options: [...ALIGN_OPTIONS] },
      },
      defaultProps: { text: 'Your heading here', level: 2, align: 'left' },
      render: render('heading'),
    },
    Paragraph: {
      label: 'Paragraph',
      fields: {
        text:  { type: 'textarea', label: 'Text' },
        align: { type: 'select', label: 'Alignment', options: [...ALIGN_OPTIONS] },
      },
      defaultProps: { text: 'Write something compelling about your circus classes here.', align: 'left' },
      render: render('paragraph'),
    },

    // ── Media ───────────────────────────────────────────────
    Image: {
      label: 'Image',
      fields: {
        url:     { type: 'text',     label: 'Image URL' },
        alt:     { type: 'text',     label: 'Alt text (for screen readers)' },
        caption: { type: 'text',     label: 'Caption (optional)' },
      },
      defaultProps: { url: '/bigstar-logo.png', alt: 'Big Star Circus', caption: '' },
      render: render('image'),
    },

    // ── CTA ─────────────────────────────────────────────────
    Button: {
      label: 'Button',
      fields: {
        text:    { type: 'text',   label: 'Button text' },
        href:    { type: 'text',   label: 'Link (where it goes)' },
        variant: { type: 'select', label: 'Style', options: [...BUTTON_VARIANTS] },
      },
      defaultProps: { text: 'Book a free trial', href: '/contact', variant: 'primary' },
      render: render('button'),
    },
    CtaSection: {
      label: 'CTA section',
      fields: {
        title: { type: 'text', label: 'Title' },
        body:  { type: 'text', label: 'Body text' },
        button: {
          type: 'object',
          label: 'Button',
          objectFields: {
            text: { type: 'text', label: 'Text' },
            href: { type: 'text', label: 'Link' },
          },
        },
      },
      defaultProps: {
        title: 'Ready to fly?',
        body: 'Your first class is on us.',
        button: { text: 'Book free trial', href: '/contact' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (props: any) => <BlockView block={{ type: 'cta', ...props } as Block} />,
    },
    Form: {
      label: 'Form',
      fields: {
        title:        { type: 'text', label: 'Form title' },
        submit_label: { type: 'text', label: 'Submit button text' },
        fields: {
          type: 'array',
          label: 'Fields',
          arrayFields: {
            type:        { type: 'select', label: 'Field type', options: [...FIELD_TYPES] },
            name:        { type: 'text',   label: 'Internal name (no spaces)' },
            label:       { type: 'text',   label: 'Label visitors see' },
            placeholder: { type: 'text',   label: 'Placeholder text' },
            required:    { type: 'radio',  label: 'Required?', options: [
              { label: 'Yes', value: true },
              { label: 'No',  value: false },
            ] },
          },
          getItemSummary: (item: { label?: string }) => item.label ?? 'Field',
          defaultItemProps: { type: 'text', name: 'field', label: 'New field', required: false },
        },
      },
      defaultProps: {
        title: 'Get in touch',
        submit_label: 'Send enquiry',
        fields: [
          { type: 'text',  name: 'name',  label: 'Your name', required: true },
          { type: 'email', name: 'email', label: 'Email',     required: true },
          { type: 'phone', name: 'phone', label: 'Phone',     required: false },
          { type: 'textarea', name: 'message', label: 'Message', rows: 4, required: false },
        ],
      },
      render: render('form'),
    },

    // ── Layout / sections ───────────────────────────────────
    Hero: {
      label: 'Hero (big banner)',
      fields: {
        title:    { type: 'text', label: 'Headline' },
        subtitle: { type: 'text', label: 'Subheadline' },
        image:    { type: 'text', label: 'Background image URL (optional)' },
        cta: {
          type: 'object',
          label: 'Call-to-action button',
          objectFields: {
            text: { type: 'text', label: 'Text' },
            href: { type: 'text', label: 'Link' },
          },
        },
      },
      defaultProps: {
        title: 'Big Star Circus',
        subtitle: 'Where kids fly. Literally.',
        image: '',
        cta: { text: 'Book your free trial', href: '/contact' },
      },
      render: render('hero'),
    },
    Features: {
      label: 'Features (3-up)',
      fields: {
        title: { type: 'text', label: 'Section title' },
        items: {
          type: 'array',
          label: 'Feature cards',
          arrayFields: {
            icon:  { type: 'text', label: 'Emoji icon' },
            title: { type: 'text', label: 'Title' },
            body:  { type: 'text', label: 'Body text' },
          },
          getItemSummary: (item: { title?: string }) => item.title ?? 'Feature',
          defaultItemProps: { icon: '✦', title: 'New feature', body: 'Describe it.' },
        },
      },
      defaultProps: {
        title: 'Why Big Star?',
        items: [
          { icon: '🎪', title: 'Real circus skills',  body: 'Aerial, acro, juggling, tumbling — taught by working performers.' },
          { icon: '⭐', title: 'Tiny coach-to-kid',   body: 'Max 8 kids per coach. Everyone gets a turn.' },
          { icon: '🏆', title: 'Showcases & comps',   body: 'Twice a year your kid steps under the lights.' },
        ],
      },
      render: render('features'),
    },
    Spacer: {
      label: 'Spacer (empty space)',
      fields: {
        size: { type: 'select', label: 'Size', options: [...SPACER_SIZES] },
      },
      defaultProps: { size: 'md' },
      render: render('spacer'),
    },
    Divider: {
      label: 'Divider (horizontal line)',
      fields: {},
      defaultProps: {},
      render: render('divider'),
    },

    // ── Advanced ────────────────────────────────────────────
    Embed: {
      label: 'HTML embed',
      fields: {
        html: { type: 'textarea', label: 'Paste any HTML here' },
      },
      defaultProps: { html: '<!-- paste any HTML here -->' },
      render: render('embed'),
    },
  },
}
