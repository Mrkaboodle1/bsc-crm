// Pure read-only renderer for site blocks. Used by:
//  - the public site renderer at /s/[siteSlug]/[pageSlug]
//  - the editor's live preview pane
// Keep it deterministic and side-effect-free — server component-safe.

import type { Block, FormField } from '@/lib/sites/blocks'

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const align = block.align ?? 'left'
      const cls = `font-extrabold text-zinc-900 tracking-tight ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      }`
      if (block.level === 1) return <h1 className={`text-4xl sm:text-5xl ${cls}`}>{block.text}</h1>
      if (block.level === 3) return <h3 className={`text-xl sm:text-2xl ${cls}`}>{block.text}</h3>
      return <h2 className={`text-2xl sm:text-3xl ${cls}`}>{block.text}</h2>
    }

    case 'paragraph': {
      const align = block.align ?? 'left'
      return (
        <p className={`text-base sm:text-lg text-zinc-700 leading-relaxed ${
          align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''
        }`}>
          {block.text}
        </p>
      )
    }

    case 'image':
      return (
        <figure className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt ?? ''} className="w-full h-auto rounded-2xl shadow-md" />
          {block.caption && (
            <figcaption className="text-xs text-zinc-500 mt-2 text-center">{block.caption}</figcaption>
          )}
        </figure>
      )

    case 'button': {
      const variant = block.variant ?? 'primary'
      const cls =
        variant === 'primary'
          ? 'bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white shadow-md hover:shadow-lg'
          : variant === 'secondary'
            ? 'bg-[#FFC107] text-zinc-900 shadow-md hover:shadow-lg'
            : 'bg-transparent border-2 border-zinc-300 text-zinc-700 hover:border-[#D72027] hover:text-[#D72027]'
      return (
        <a
          href={block.href}
          className={`inline-block font-extrabold text-base px-6 py-3 rounded-xl ${cls}`}
        >
          {block.text}
        </a>
      )
    }

    case 'spacer': {
      const h = block.size === 'sm' ? 'h-4' : block.size === 'lg' ? 'h-16' : block.size === 'xl' ? 'h-24' : 'h-8'
      return <div className={h} />
    }

    case 'divider':
      return <hr className="border-t border-zinc-200 my-6" />

    case 'hero':
      return (
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#A0151B] text-white p-10 sm:p-16">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 25% 20%, #FFC107 0%, transparent 35%), radial-gradient(circle at 75% 80%, #D72027 0%, transparent 40%)',
          }} />
          {block.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay" />
          )}
          <div className="relative max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight">{block.title}</h1>
            {block.subtitle && <p className="text-lg sm:text-2xl text-amber-300 mt-3">{block.subtitle}</p>}
            {block.cta && (
              <a
                href={block.cta.href}
                className="inline-block mt-6 bg-gradient-to-r from-[#FFC107] to-amber-400 text-zinc-900 font-extrabold text-base px-6 py-3 rounded-xl shadow-md hover:shadow-lg"
              >
                {block.cta.text} →
              </a>
            )}
          </div>
        </section>
      )

    case 'features':
      return (
        <section className="my-6">
          {block.title && <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 text-center mb-6">{block.title}</h2>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {block.items.map((it, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
                {it.icon && <div className="text-3xl mb-2">{it.icon}</div>}
                <h3 className="text-lg font-extrabold text-zinc-900 mb-1">{it.title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{it.body}</p>
              </div>
            ))}
          </div>
        </section>
      )

    case 'cta':
      return (
        <section className="bg-gradient-to-br from-[#FFC107] to-amber-400 rounded-3xl p-8 sm:p-12 text-center my-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">{block.title}</h2>
          {block.body && <p className="text-base sm:text-lg text-zinc-800 mt-2 max-w-xl mx-auto">{block.body}</p>}
          <a
            href={block.button.href}
            className="inline-block mt-5 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-base px-6 py-3 rounded-xl shadow-md hover:shadow-lg"
          >
            {block.button.text} →
          </a>
        </section>
      )

    case 'form':
      return (
        <section className="bg-white rounded-2xl shadow-md border border-zinc-200 p-6 my-6">
          {block.title && <h2 className="text-xl font-extrabold text-zinc-900 mb-4">{block.title}</h2>}
          <form method="post" action="#" className="space-y-3">
            {block.fields.map((f, i) => (
              <FieldView key={i} field={f} />
            ))}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-base px-6 py-3 rounded-xl shadow-md hover:shadow-lg"
            >
              {block.submit_label ?? 'Submit'}
            </button>
          </form>
        </section>
      )

    case 'embed':
      // Trusted because only tenant admins can edit pages, but we still
      // wrap it so it doesn't break the layout if the HTML is malformed.
      return <div className="my-4" dangerouslySetInnerHTML={{ __html: block.html }} />

    default:
      return null
  }
}

function FieldView({ field }: { field: FormField }) {
  const label = (
    <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-600 mb-1">
      {field.label}{field.required && <span className="text-[#D72027] ml-0.5">*</span>}
    </label>
  )
  const baseCls =
    'w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none'
  if (field.type === 'textarea') {
    return (
      <div>
        {label}
        <textarea name={field.name} rows={field.rows ?? 4} placeholder={field.placeholder} className={baseCls} required={field.required} />
      </div>
    )
  }
  return (
    <div>
      {label}
      <input
        type={field.type === 'phone' ? 'tel' : field.type}
        name={field.name}
        placeholder={field.placeholder}
        className={baseCls}
        required={field.required}
      />
    </div>
  )
}

// Convenience: render an array of blocks
export function PageBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  )
}
