import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { BulkForm, type FamilyOption } from './bulk-form'
import { createBulkDrafts } from './actions'

export default async function BulkSendPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // All families with at least an email or phone — the form filters further per-channel.
  const { data, error } = await supabase
    .from('families')
    .select('id, family_name, primary_parent, email, phone, lifecycle_stage, tags')
    .order('family_name', { ascending: true })

  const families: FamilyOption[] = (data ?? [])
    .filter((f) => f.email || f.phone)
    .map((f) => ({
      id: f.id,
      name: f.family_name,
      primaryParent: f.primary_parent,
      email: f.email,
      phone: f.phone,
      lifecycle: f.lifecycle_stage,
      tags: f.tags ?? [],
    }))

  return (
    <DashboardShell
      user={user}
      currentPath="/marketing"
      pageTitle="Bulk send"
      pageSubtitle="Compose once → Jacky drafts one per recipient → you approve in /inbox → she sends."
      pageActions={
        <a
          href="/marketing"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← Marketing
        </a>
      }
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          {error.message}
        </div>
      )}

      <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-900 rounded-r-xl px-4 py-3 text-sm mb-5">
        <strong>Nothing sends here.</strong> This page creates drafts only. You approve each one (or all at
        once) in <a href="/inbox" className="underline font-bold">/inbox</a> — that&apos;s when Jacky actually sends.
      </div>

      <BulkForm families={families} action={createBulkDrafts} />
    </DashboardShell>
  )
}
