import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { BooksClient, type Tx } from '@/components/books-client'

export const dynamic = 'force-dynamic'

export default async function BooksPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('book_transactions')
    .select('id, date, direction, amount, gst, category, description, party, source')
    .eq('tenant_id', user.tenantId).order('date', { ascending: false }).limit(2000)

  const missing = !!error && (error.message.includes('does not exist') || error.message.includes('relation'))
  const rows = (data ?? []) as Tx[]

  return (
    <DashboardShell
      user={user}
      currentPath="/finance/books"
      pageTitle="📒 Big Star Books"
      pageSubtitle="Your money in one place — income, expenses, GST and profit"
    >
      <div className="max-w-5xl">
        {missing ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            Big Star Books needs its database table set up first. Paste migration <strong>039_books.sql</strong> into Supabase, then refresh this page.
          </div>
        ) : (
          <BooksClient initial={rows} />
        )}
      </div>
    </DashboardShell>
  )
}
