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
  // ── Bespoke "pixel-exact" blocks (match the bigstarcircus.com.au design) ──
  | { type: 'videohero'; title: string; subtitle?: string; note?: string; videoUrl?: string; posterUrl?: string; cta?: { text: string; href: string } }
  | { type: 'infocards'; items: { color?: 'pink' | 'amber' | 'purple'; title: string; body: string }[] }
  | { type: 'gallery';   images: { url: string; alt?: string }[] }
  | { type: 'band';      title: string; body?: string; bgUrl?: string; theme?: 'curtain' | 'stage' | 'light'; cta?: { text: string; href: string } }
  | { type: 'columns';   title?: string; accent?: boolean; items: { title: string; body: string }[]; cta?: { text: string; href: string } }
  | { type: 'testimonials'; title?: string; bgUrl?: string; items: { quote: string; name: string }[] }
  | { type: 'navbar';    logo?: string; menu: { label: string; href: string; children?: { label: string; href: string }[] }[]; cta?: { text: string; href: string } }
  | { type: 'footer';    logo?: string; tagline?: string; columns: { title: string; links: { label: string; href: string }[] }[]; address?: string; phone?: string; socials?: { kind: 'facebook' | 'instagram' | 'youtube' | 'tiktok'; href: string }[]; copyright?: string }
  | { type: 'pagehero';  title: string; subtitle?: string; bgUrl?: string }

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
  videohero:    { icon: '🎬', label: 'Video hero',   group: 'layout' },
  infocards:    { icon: '🃏', label: 'Info cards (3)', group: 'layout' },
  gallery:      { icon: '🖼', label: 'Photo gallery', group: 'media' },
  band:         { icon: '🎭', label: 'Feature band',  group: 'layout' },
  columns:      { icon: '🪧', label: 'Text columns',  group: 'layout' },
  testimonials: { icon: '⭐', label: 'Testimonials',  group: 'layout' },
  navbar:       { icon: '🧭', label: 'Top menu bar',  group: 'layout' },
  footer:       { icon: '🦶', label: 'Footer',        group: 'layout' },
  pagehero:     { icon: '🏷', label: 'Page banner',   group: 'layout' },
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
    case 'videohero': return {
      type: 'videohero',
      title: 'Big Star Circus',
      subtitle: 'We aim at inspiring our students to dream more, learn more, do more, and become more in their respective journeys of life.',
      note: '3 free trial classes — up to 3 in one week!',
      videoUrl: '',
      posterUrl: '/bigstar-logo.png',
      cta: { text: 'Select a class to trial today!', href: '/contact' },
    }
    case 'infocards': return {
      type: 'infocards',
      items: [
        { color: 'pink',   title: 'Free Trial Class', body: 'Try three free trial classes within the same week — circus, aerial, acrobatics and drama.' },
        { color: 'amber',  title: 'Timetable',        body: 'Classes run Monday to Saturday, plus unforgettable birthday parties on Sundays!' },
        { color: 'purple', title: 'Prices',           body: 'Options starting at $27 per class, with discounts for siblings and multiple classes.' },
      ],
    }
    case 'gallery': return {
      type: 'gallery',
      images: [
        { url: '/bigstar-logo.png', alt: 'Circus class' },
        { url: '/bigstar-logo.png', alt: 'Circus class' },
        { url: '/bigstar-logo.png', alt: 'Circus class' },
        { url: '/bigstar-logo.png', alt: 'Circus class' },
      ],
    }
    case 'band': return {
      type: 'band',
      title: 'Rhett Morrow — Head Coach',
      body: 'A professional circus artist with over 15 years of experience, performing in Australia and overseas.',
      theme: 'curtain',
      bgUrl: '',
      cta: { text: 'Learn more about us', href: '/about' },
    }
    case 'columns': return {
      type: 'columns',
      title: 'Types of Classes',
      accent: true,
      items: [
        { title: 'Circus Fusion Classes', body: 'Combine the best of circus arts and fitness, creating a fun, dynamic experience!' },
        { title: 'Aerial Classes for Kids & Adults', body: 'A thrilling way to build strength, flexibility, and confidence!' },
        { title: 'Circus Gymnastics', body: 'Master essential skills such as balance, tumbling, handstands, and cartwheels.' },
      ],
      cta: { text: 'More about our classes', href: '/classes' },
    }
    case 'testimonials': return {
      type: 'testimonials',
      title: 'What our families are saying...',
      bgUrl: '',
      items: [
        { quote: 'We’ve had such a wonderful experience with Big Star Circus! In just a few weeks, she’s come out of her shell and absolutely loves it.', name: '— Stephanie W, May 2025' },
        { quote: 'Seriously fun, engaging circus skills workshop. Our crew had a brilliant time. We are heading back!!!', name: '— Deb and the crew' },
      ],
    }
    case 'navbar': return {
      type: 'navbar',
      logo: '/bigstar-logo.png',
      menu: [
        { label: 'Home',         href: '/s/bigstar' },
        { label: 'About Us',     href: '/s/bigstar/about' },
        { label: 'Free Trial',   href: '/s/bigstar/free-trial' },
        { label: 'What We Offer', href: '#', children: [
          { label: 'Birthday Party',           href: '/s/bigstar/birthday-party' },
          { label: 'Weekly Classes',           href: '/s/bigstar/weekly-classes' },
          { label: 'School Holidays',          href: '/s/bigstar/school-holidays' },
          { label: 'Kids Night Out',           href: '/s/bigstar/kids-night-out' },
          { label: 'Talent Show',              href: '/s/bigstar/talent-show' },
          { label: 'Bubby & Me Toddler Circus', href: '/s/bigstar/bubby-me' },
          { label: 'Homeschool Classes',       href: '/s/bigstar/homeschool' },
        ] },
        { label: 'Prices',     href: '/s/bigstar/prices' },
        { label: 'Contact Us', href: '/s/bigstar/contact' },
      ],
    }
    case 'footer': return {
      type: 'footer',
      logo: '/bigstar-logo.png',
      tagline: 'Inspiring young performers across the Gold Coast.',
      columns: [
        { title: 'Explore', links: [
          { label: 'About Us',    href: '/s/bigstar/about' },
          { label: 'Prices',      href: '/s/bigstar/prices' },
          { label: 'Contact Us',  href: '/s/bigstar/contact' },
        ] },
        { title: 'Policies', links: [
          { label: 'Terms of Use',         href: '/s/bigstar/terms-of-use' },
          { label: 'Make-Up Class Policy', href: '/s/bigstar/makeup-policy' },
          { label: 'Terms of Service',     href: '/s/bigstar/terms-of-service' },
        ] },
      ],
      address: 'Unit 1/14 Harper St, Molendinar QLD 4214',
      socials: [
        { kind: 'facebook',  href: 'https://www.facebook.com/bigstarcircus' },
        { kind: 'instagram', href: 'https://www.instagram.com/bigstarcircus' },
        { kind: 'youtube',   href: 'https://www.youtube.com/@bigstarcircus' },
      ],
      copyright: '© Big Star Circus. All rights reserved.',
    }
    case 'pagehero': return { type: 'pagehero', title: 'About Us', subtitle: 'Learn more about who we are.', bgUrl: '' }
  }
}

// Used by the public renderer + editor preview. We trust the type checker
// but defend against legacy / hand-edited JSONB that has stray keys.
export function isBlock(x: unknown): x is Block {
  return !!x && typeof x === 'object' && 'type' in x && typeof (x as { type: unknown }).type === 'string'
}
