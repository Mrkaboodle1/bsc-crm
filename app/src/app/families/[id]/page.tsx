// Legacy redirect — /families/[id] → /contacts/[id]

import { redirect } from 'next/navigation'

export default async function FamilyRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/contacts/${id}`)
}
