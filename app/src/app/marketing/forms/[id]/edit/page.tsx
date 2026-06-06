import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { FormBuilder } from '@/components/form-builder'

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: form } = await supabase.from('forms').select('id, name, slug, intro, fields').eq('id', id).maybeSingle()

  return (
    <DashboardShell
      user={user}
      currentPath="/marketing/forms"
      pageTitle={form ? `Edit: ${form.name}` : 'Edit form'}
      pageSubtitle="Add fields and choose what parents see. Saves instantly to the live link."
      pageActions={<a href="/marketing/forms" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-zinc-50">← All forms</a>}
    >
      {form
        ? <FormBuilder form={{ id: form.id, name: form.name, slug: form.slug, intro: form.intro, fields: Array.isArray(form.fields) ? form.fields : [] }} />
        : <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center text-zinc-500">Form not found. <a href="/marketing/forms" className="text-[#D72027] font-semibold">Back to forms</a></div>}
    </DashboardShell>
  )
}
