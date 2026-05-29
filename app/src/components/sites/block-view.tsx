// Pure read-only renderer for site blocks. Used by:
//  - the public site renderer at /s/[siteSlug]/[pageSlug]
//  - the editor's live preview pane
// Keep it deterministic and side-effect-free — server component-safe.

import type { Block, FormField } from '@/lib/sites/blocks'

// ── Shared styling for the bespoke "pixel-exact" blocks ──
const FRED = "'Fredoka', system-ui, sans-serif"
const RED = '#E5392B'
const BTN: React.CSSProperties = {
  display: 'inline-block', background: RED, color: '#fff', fontFamily: FRED, fontWeight: 600,
  letterSpacing: '0.5px', textTransform: 'uppercase', padding: '14px 30px', borderRadius: 40,
  fontSize: 15, boxShadow: '0 8px 20px rgba(229,57,43,.35)',
}
const CARD_COLORS: Record<'pink' | 'amber' | 'purple', string> = { pink: '#EC4899', amber: '#F7A823', purple: '#8B5CF6' }
// Break each section out of the page's centred max-width column so it spans
// the full browser width (matches the original full-bleed website layout).
const FULLBLEED: React.CSSProperties = { width: '100vw', maxWidth: '100vw', marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }
// Loads the Fredoka + Poppins fonts once (duplicate @imports are de-duped by the browser).
function Fonts() {
  return <style dangerouslySetInnerHTML={{ __html: "@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Poppins:wght@300;400;600;700&display=swap');" }} />
}

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

    // ── Bespoke pixel-exact blocks ──────────────────────────
    case 'videohero':
      return (
        <section style={{ ...FULLBLEED, position: 'relative', minHeight: 560, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff', overflow: 'hidden', background: '#1a0f24' }}>
          <Fonts />
          {block.videoUrl ? (
            <video autoPlay loop muted playsInline poster={block.posterUrl || undefined}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
              <source src={block.videoUrl} type="video/mp4" />
            </video>
          ) : block.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.posterUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
          ) : null}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,10,30,.5)', zIndex: 1 }} />
          <div style={{ position: 'relative', zIndex: 2, maxWidth: 760, padding: '64px 22px' }}>
            <h1 style={{ fontFamily: FRED, fontSize: 'clamp(40px,7vw,62px)', lineHeight: 1.05, textShadow: '0 3px 18px rgba(0,0,0,.4)', fontWeight: 600 }}>{block.title}</h1>
            {block.subtitle && <p style={{ margin: '18px auto 26px', fontSize: 18, fontWeight: 300, maxWidth: 640 }}>{block.subtitle}</p>}
            {block.cta && <a href={block.cta.href} style={BTN}>{block.cta.text}</a>}
            {block.note && <div style={{ marginTop: 14, fontFamily: FRED, letterSpacing: '1px', fontSize: 13, textTransform: 'uppercase' }}>{block.note}</div>}
          </div>
        </section>
      )

    case 'infocards':
      return (
        <section style={{ ...FULLBLEED, padding: '0 22px' }}>
          <Fonts />
          <div style={{ maxWidth: 1140, margin: '-70px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 26, position: 'relative', zIndex: 5 }}>
            {block.items.map((it, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 20, boxShadow: '0 18px 40px rgba(0,0,0,.10)', padding: '34px 26px', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 26, background: CARD_COLORS[it.color ?? 'pink'] }}>★</div>
                <h3 style={{ fontFamily: FRED, fontSize: 21, marginBottom: 10, color: '#2b2b2b' }}>{it.title}</h3>
                <p style={{ fontSize: 15, color: '#6b6b6b', lineHeight: 1.6 }}>{it.body}</p>
              </div>
            ))}
          </div>
        </section>
      )

    case 'gallery':
      return (
        <section style={{ ...FULLBLEED, padding: '10px 22px' }}>
          <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
            {block.images.map((im, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={im.url} alt={im.alt ?? ''} style={{ height: 210, width: '100%', objectFit: 'cover', borderRadius: 14 }} />
            ))}
          </div>
        </section>
      )

    case 'band': {
      const dark = block.theme !== 'light'
      return (
        <section style={{
          ...FULLBLEED,
          position: 'relative', padding: '66px 22px', textAlign: 'center', color: dark ? '#fff' : '#2b2b2b',
          backgroundColor: dark ? '#1a0f24' : 'transparent',
          backgroundImage: block.bgUrl ? `linear-gradient(rgba(15,8,20,.62),rgba(15,8,20,.62)),url(${block.bgUrl})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <Fonts />
          <div style={{ maxWidth: 820, margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontFamily: FRED, fontSize: 'clamp(28px,5vw,40px)', marginBottom: 16, fontWeight: 600 }}>{block.title}</h2>
            {block.body && <p style={{ fontWeight: 300, maxWidth: 760, margin: '0 auto 14px' }}>{block.body}</p>}
            {block.cta && <a href={block.cta.href} style={{ ...BTN, marginTop: 22 }}>{block.cta.text}</a>}
          </div>
        </section>
      )
    }

    case 'columns':
      return (
        <section style={{ ...FULLBLEED, padding: '56px 22px' }}>
          <Fonts />
          {block.title && <h2 style={{ fontFamily: FRED, fontSize: 'clamp(28px,5vw,40px)', textAlign: 'center', marginBottom: 14, color: '#2b2b2b', fontWeight: 600 }}>{block.title}</h2>}
          <div style={{ maxWidth: 1040, margin: '30px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 34, textAlign: 'center' }}>
            {block.items.map((it, i) => (
              <div key={i}>
                <h3 style={{ fontFamily: FRED, fontSize: 20, marginBottom: 8, color: block.accent ? RED : '#2b2b2b' }}>{it.title}</h3>
                <p style={{ fontSize: 15, color: '#6b6b6b', lineHeight: 1.6 }}>{it.body}</p>
              </div>
            ))}
          </div>
          {block.cta && <p style={{ textAlign: 'center', marginTop: 34 }}><a href={block.cta.href} style={BTN}>{block.cta.text}</a></p>}
        </section>
      )

    case 'testimonials':
      return (
        <section style={{
          ...FULLBLEED,
          position: 'relative', padding: '70px 22px', textAlign: 'center', color: '#fff', backgroundColor: '#1a0f24',
          backgroundImage: block.bgUrl ? `linear-gradient(rgba(15,8,20,.66),rgba(15,8,20,.66)),url(${block.bgUrl})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <Fonts />
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            {block.title && <h2 style={{ fontFamily: FRED, fontSize: 'clamp(28px,5vw,40px)', marginBottom: 24, fontWeight: 600 }}>{block.title}</h2>}
            {block.items.map((t, i) => (
              <div key={i} style={{ marginBottom: 26 }}>
                <p style={{ fontStyle: 'italic', fontWeight: 300, fontSize: 17, maxWidth: 760, margin: '0 auto 8px' }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ fontFamily: FRED, fontSize: 15 }}>{t.name}</div>
              </div>
            ))}
          </div>
        </section>
      )

    case 'navbar':
      return (
        <nav style={{
          ...FULLBLEED,
          position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '12px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <Fonts />
          <a href={block.menu[0]?.href || '/'} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            {block.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.logo} alt="Big Star Circus" style={{ height: 44, width: 'auto' }} />
            )}
          </a>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', fontFamily: FRED, fontSize: 14, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {block.menu.map((m, i) => (
              <li key={i} style={{ position: 'relative' }} className="bsc-nav-item">
                <a href={m.href} style={{ color: '#2b2b2b', textDecoration: 'none', padding: '8px 4px' }}>{m.label}{m.children && ' ▾'}</a>
                {m.children && m.children.length > 0 && (
                  <ul className="bsc-nav-sub" style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, padding: '8px 0', margin: 0, listStyle: 'none', minWidth: 240, display: 'none' }}>
                    {m.children.map((c, j) => (
                      <li key={j}><a href={c.href} style={{ display: 'block', padding: '8px 16px', color: '#2b2b2b', textDecoration: 'none', fontSize: 13, textTransform: 'none', fontWeight: 500 }}>{c.label}</a></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {block.cta && (
            <a href={block.cta.href} style={{ background: '#FF5A1F', color: '#fff', padding: '10px 18px', borderRadius: 999, fontFamily: FRED, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>{block.cta.text}</a>
          )}
          <style dangerouslySetInnerHTML={{ __html: '.bsc-nav-item:hover .bsc-nav-sub{display:block!important}' }} />
        </nav>
      )

    case 'pagehero':
      return (
        <section style={{
          ...FULLBLEED, position: 'relative', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff',
          background: '#1a0f24',
          backgroundImage: block.bgUrl ? `linear-gradient(rgba(15,8,20,.55),rgba(15,8,20,.55)),url(${block.bgUrl})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center', padding: '72px 22px',
        }}>
          <Fonts />
          <div style={{ maxWidth: 900 }}>
            <h1 style={{ fontFamily: FRED, fontSize: 'clamp(34px,6vw,56px)', fontWeight: 700, lineHeight: 1.1, margin: 0 }}>{block.title}</h1>
            {block.subtitle && <p style={{ marginTop: 14, fontSize: 'clamp(15px,1.6vw,18px)', maxWidth: 720, marginLeft: 'auto', marginRight: 'auto', fontWeight: 300 }}>{block.subtitle}</p>}
          </div>
        </section>
      )

    case 'footer': {
      const socialIcon = (kind: string) => kind === 'facebook' ? 'f' : kind === 'instagram' ? 'IG' : kind === 'youtube' ? 'YT' : kind === 'tiktok' ? 'TT' : '?'
      return (
        <footer style={{
          ...FULLBLEED, background: '#1a0f24', color: '#e8dff0', padding: '56px 22px 32px',
        }}>
          <Fonts />
          <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 40 }}>
            <div>
              {block.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.logo} alt="Big Star Circus" style={{ height: 56, width: 'auto', marginBottom: 14, filter: 'brightness(0) invert(1)' }} />
              )}
              {block.tagline && <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 12 }}>{block.tagline}</p>}
              {block.address && <p style={{ fontSize: 13, opacity: 0.75, margin: '6px 0' }}>{block.address}</p>}
              {block.phone && <p style={{ fontSize: 13, opacity: 0.75, margin: '6px 0' }}>{block.phone}</p>}
            </div>
            {block.columns.map((col, i) => (
              <div key={i}>
                <h4 style={{ fontFamily: FRED, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, color: '#fff' }}>{col.title}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {col.links.map((l, j) => (
                    <li key={j} style={{ margin: '6px 0' }}><a href={l.href} style={{ color: '#e8dff0', textDecoration: 'none', fontSize: 14 }}>{l.label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
            {block.socials && block.socials.length > 0 && (
              <div>
                <h4 style={{ fontFamily: FRED, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, color: '#fff' }}>Follow</h4>
                <div style={{ display: 'flex', gap: 10 }}>
                  {block.socials.map((s, i) => (
                    <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', color: '#1a0f24', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 12 }}>{socialIcon(s.kind)}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
          {block.copyright && (
            <div style={{ maxWidth: 1140, margin: '40px auto 0', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 20, fontSize: 12, opacity: 0.65, textAlign: 'center' }}>{block.copyright}</div>
          )}
        </footer>
      )
    }

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
