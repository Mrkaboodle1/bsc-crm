import { createServerSupabaseAdmin } from '@/lib/supabase-server'
import { PublicLeadForm } from '@/components/public-lead-form'
import { PublicFormRenderer, type FormField } from '@/components/public-form-renderer'
import { RichText } from '@/lib/rich-text'

// Built-in fallback forms (work even before the Form Builder table exists).
const FORMS: Record<string, { title: string; blurb: string }> = {
  trial: { title: 'Book a Free Trial', blurb: 'Come and try a class on us! Pop your details in and our team will lock in a free trial that suits your child.' },
  enquiry: { title: 'Get in touch', blurb: 'Have a question about classes, parties or shows? Send us a message and we’ll get straight back to you.' },
  party: { title: 'Birthday Party Enquiry', blurb: 'Birthday parties are a blast! Tell us a little about your party and we’ll send through the details.' },
  webinar: { title: 'Save my spot', blurb: 'Register for our online info session. Pop your details in and we’ll email you the link to join.' },
}

function Shell({ title, blurb, brand, children }: { title: string; blurb?: string; brand: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#D72027] to-[#A0151B] px-6 py-5 text-white text-center">
          <div className="text-3xl mb-1">🎪</div>
          <h1 className="text-xl font-extrabold">{title}</h1>
          <p className="text-xs text-amber-100 mt-0.5">{brand}</p>
        </div>
        <div className="p-6">
          {blurb && <p className="text-sm text-zinc-600 mb-5 leading-relaxed whitespace-pre-line"><RichText text={blurb} /></p>}
          {children}
        </div>
      </div>
    </div>
  )
}

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const admin = await createServerSupabaseAdmin()
  let brand = 'Welcome'
  let businessName = 'our team'
  try {
    const { data: t } = await admin.from('tenants').select('name, address').order('created_at').limit(1).maybeSingle()
    if (t?.name) { businessName = t.name; brand = t.address ? `${t.name} · ${t.address.split(',').slice(-2, -1)[0]?.trim() || t.address}` : t.name }
  } catch { /* ignore */ }

  // 1. Try a builder-created form from the database.
  try {
    const { data: form } = await admin.from('forms').select('name, intro, fields, status').eq('slug', slug).maybeSingle()
    if (form && form.status !== 'archived') {
      const fields = (Array.isArray(form.fields) ? form.fields : []) as FormField[]
      return <Shell title={form.name} blurb={form.intro ?? undefined} brand={brand}><PublicFormRenderer slug={slug} fields={fields} businessName={businessName} /></Shell>
    }
  } catch { /* table not set up yet — fall through to built-ins */ }

  // 2. Built-in fallback.
  const cfg = FORMS[slug] ?? FORMS.enquiry
  return <Shell title={cfg.title} blurb={cfg.blurb} brand={brand}><PublicLeadForm formSlug={slug} businessName={businessName} /></Shell>
}
