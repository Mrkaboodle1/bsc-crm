// Legacy redirect — Families became Contacts. Preserves any query string
// so /families?q=foo → /contacts?q=foo.

import { redirect } from 'next/navigation'

export default async function FamiliesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') params.set(k, v)
  }
  const qs = params.toString()
  redirect(`/contacts${qs ? '?' + qs : ''}`)
}
