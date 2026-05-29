// Translates between our DB shape (a flat `Block[]` array stored in JSONB)
// and Puck's editor shape (`{ content: { type, props }[], root }`).
//
// Existing data stays compatible — when the editor saves we extract the
// blocks back into the same flat-array format, so /s/<slug> renderer and
// every iframe thumbnail keep working without a migration.

import type { Data } from '@measured/puck'
import type { Block } from './blocks'

const BLOCK_TO_PUCK: Record<Block['type'], string> = {
  heading:   'Heading',
  paragraph: 'Paragraph',
  image:     'Image',
  button:    'Button',
  spacer:    'Spacer',
  divider:   'Divider',
  hero:      'Hero',
  features:  'Features',
  cta:       'CtaSection',
  form:      'Form',
  embed:     'Embed',
  videohero:    'VideoHero',
  infocards:    'InfoCards',
  gallery:      'Gallery',
  band:         'Band',
  columns:      'Columns',
  testimonials: 'Testimonials',
}

const PUCK_TO_BLOCK: Record<string, Block['type']> = Object.fromEntries(
  Object.entries(BLOCK_TO_PUCK).map(([k, v]) => [v, k as Block['type']]),
)

// crypto.randomUUID() isn't available in older runtimes but is fine in
// Node 16+ and all modern browsers.
function genId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function toPuckData(blocks: Block[]): Data {
  return {
    content: blocks.map((b) => {
      const puckType = BLOCK_TO_PUCK[b.type]
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type: _t, ...props } = b
      return {
        type: puckType,
        props: { ...props, id: genId(puckType) },
      }
    }),
    root: { props: {} },
  }
}

export function fromPuckData(data: Data): Block[] {
  return (data.content ?? []).map((item) => {
    const blockType = PUCK_TO_BLOCK[item.type as string]
    if (!blockType) return null
    // Drop the Puck-internal `id` field — our schema doesn't track it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = (item.props ?? {}) as Record<string, unknown>
    return { type: blockType, ...rest } as Block
  }).filter((b): b is Block => b !== null)
}
