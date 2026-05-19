// Page block types — shared between the editor (which writes these into
// site_pages.blocks) and the public renderer (which reads them out).
//
// Adding a new block:
//   1. Add a new variant to `Block` here.
//   2. Add a renderer branch in `<BlockView />`  (../../components/sites/block-view.tsx)
//   3. Add an editor branch in `<BlockEditor />` (../../app/sites/[id]/pages/[pageId]/edit/block-editor.tsx)

export type Block =
  | { type: 'heading';   text: string; level?: 1 | 2 | 3; align?: 'left' | 'center' | 'right' }
  | { type: 'paragraph'; text: string; align?: 'left' | 'center' | 'right' }
  | { type: 'image';     url: string; alt?: string; caption?: string }
  | { type: 'button';    text: string; href: string; variant?: 'primary' | 'secondary' | 'ghost' }
  | { type: 'spacer';    size?: 'sm' | 'md' | 'lg' | 'xl' }
  | { type: 'divider' }
  | { type: 'hero';      title: string; subtitle?: string; image?: string; cta?: { text: string; href: string } }
  | { type: 'features';  title?: string; items: { icon?: string; title: string; body: string }[] }
  | { type: 'cta';       title: string; body?: string; button: { text: string; href: string } }
  | { type: 'form';      title?: string; submit_label?: string; fields: FormField[] }
  | { type: 'embed';     html: string }       // raw HTML escape hatch — use sparingly

export type FormField =
  | { type: 'text';     name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'email';    name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'phone';    name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'textarea'; name: string; label: string; placeholder?: string; required?: boolean; rows?: number }

export type SiteKind = 'website' | 'funnel' | 'landing'

export const KIND_LABEL: Record<SiteKind, string> = {
  website: '🌐 Website (multi-page)',
  funnel:  '🎯 Funnel (sales steps)',
  landing: '🪧 Landing page (one-pager)',
}

export const BLOCK_LABEL: Record<Block['type'], { icon: string; label: string; group: 'text' | 'media' | 'cta' | 'layout' | 'advanced' }> = {
  heading:   { icon: 'H',  label: 'Heading',     group: 'text' },
  paragraph: { icon: '¶',  label: 'Paragraph',   group: 'text' },
  image:     { icon: '🖼', label: 'Image',       group: 'media' },
  button:    { icon: '⬛', label: 'Button',      group: 'cta' },
  spacer:    { icon: '⋯',  label: 'Spacer',      group: 'layout' },
  divider:   { icon: '—',  label: 'Divider',     group: 'layout' },
  hero:      { icon: '🌟', label: 'Hero',        group: 'layout' },
  features:  { icon: '✦',  label: 'Features',    group: 'layout' },
  cta:       { icon: '🎯', label: 'CTA section', group: 'cta' },
  form:      { icon: '📝', label: 'Form',        group: 'cta' },
  embed:     { icon: '</>', label: 'HTML embed', group: 'advanced' },
}

// Convenience factories — the editor uses these when the user clicks
// "+ Add block → Heading" etc. Sensible defaults so the new block is
// immediately visible.
export function makeBlock(type: Block['type']): Block {
  switch (type) {
    case 'heading':   return { type: 'heading', text: 'Your heading here', level: 2 }
    case 'paragraph': return { type: 'paragraph', text: 'Write something compelling about your circus classes here.' }
    case 'image':     return { type: 'image', url: '/bigstar-logo.png', alt: 'Big Star Circus' }
    case 'button':    return { type: 'button', text: 'Book a free trial', href: '/contact', variant: 'primary' }
    case 'spacer':    return { type: 'spacer', size: 'md' }
    case 'divider':   return { type: 'divider' }
    case 'hero':      return { type: 'hero', title: 'Big Star Circus', subtitle: 'Where kids fly. Literally.', cta: { text: 'Book your free trial', href: '/contact' } }
    case 'features':  return {
      type: 'features',
      title: 'Why Big Star?',
      items: [
        { icon: '🎪', title: 'Real circus skills',  body: 'Aerial, acro, juggling, tumbling — taught by working performers.' },
        { icon: '⭐', title: 'Tiny coach-to-kid',   body: 'Max 8 kids per coach. Everyone gets a turn on the trapeze.' },
        { icon: '🏆', title: 'Showcases & comps',   body: 'Twice a year your kid steps under the lights.' },
      ],
    }
    case 'cta':       return { type: 'cta', title: 'Ready to fly?', body: 'Your first class is on us.', button: { text: 'Book free trial', href: '/contact' } }
    case 'form':      return {
      type: 'form',
      title: 'Get in touch',
      submit_label: 'Send enquiry',
      fields: [
        { type: 'text',     name: 'name',  label: 'Your name',  required: true },
        { type: 'email',    name: 'email', label: 'Email',      required: true },
        { type: 'phone',    name: 'phone', label: 'Phone' },
        { type: 'textarea', name: 'message', label: 'Message', rows: 4 },
      ],
    }
    case 'embed':     return { type: 'embed', html: '<!-- paste any HTML here -->' }
  }
}

// Used by the public renderer + editor preview. We trust the type checker
// but defend against legacy / hand-edited JSONB that has stray keys.
export function isBlock(x: unknown): x is Block {
  return !!x && typeof x === 'object' && 'type' in x && typeof (x as { type: unknown }).type === 'string'
}
