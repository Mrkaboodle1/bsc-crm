import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ConversationsInbox, type Conversation } from '@/components/conversations-inbox'

export default async function ConversationsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Inbound emails = the conversations. (Facebook / Instagram DMs join here once
  // Meta is connected.) Newest first.
  const { data: emails, error } = await supabase
    .from('email_messages')
    .select(`
      id, from_email, from_name, subject, body_text, received_at, classification, read_at, message_id,
      family:families!email_messages_matched_family_id_fkey ( id, family_name, lifecycle_stage )
    `)
    .order('received_at', { ascending: false })
    .limit(100)

  // Jacky's drafted replies, keyed to the inbound email.
  const ids = (emails ?? []).map((e) => e.id)
  const draftByEmail: Record<string, string> = {}
  if (ids.length > 0) {
    const { data: drafts } = await supabase
      .from('pending_actions')
      .select('source_email_id, draft_body, status')
      .in('source_email_id', ids)
      .neq('status', 'sent')
    for (const d of drafts ?? []) {
      if (d.source_email_id && d.draft_body && !draftByEmail[d.source_email_id]) draftByEmail[d.source_email_id] = d.draft_body
    }
  }

  const conversations: Conversation[] = (emails ?? []).map((e) => {
    const fam = Array.isArray(e.family) ? e.family[0] : e.family
    const body = e.body_text ?? ''
    return {
      id: e.id,
      fromName: e.from_name,
      fromEmail: e.from_email,
      subject: e.subject,
      preview: body.replace(/\s+/g, ' ').trim().slice(0, 120),
      bodyText: body,
      receivedAt: e.received_at,
      classification: e.classification,
      read: !!e.read_at,
      messageId: e.message_id,
      familyId: fam?.id ?? null,
      familyName: fam?.family_name ?? null,
      lifecycle: fam?.lifecycle_stage ?? null,
      draft: draftByEmail[e.id] ?? null,
    }
  })

  return (
    <DashboardShell
      user={user}
      currentPath="/conversations"
      pageTitle="Chat"
      pageSubtitle="One inbox for replies — email now, Facebook & Instagram once connected."
    >
      {error && error.message.includes('does not exist') ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          The conversations inbox needs a one-time database setup. Ask Jacky to finish it.
        </div>
      ) : (
        <ConversationsInbox conversations={conversations} />
      )}
    </DashboardShell>
  )
}
