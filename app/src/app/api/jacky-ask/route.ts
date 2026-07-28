// Jacky's chat-with-hands endpoint.
//
// Rhett types a message in the CRM. Claude (sonnet-4-5) responds and, where
// useful, calls tools that read or WRITE the BSC database — looking up
// families, queueing email/SMS drafts into the approval inbox, updating
// lifecycle stages, etc.
//
// Critical rule baked into the system prompt + the tools themselves:
// NOTHING ever auto-sends from here. Every outbound message becomes a
// pending_action that Rhett approves in /inbox. Server-Jacky on the VPS
// is the one that actually puts messages on the wire — and only after
// approval (JACKY_AUTO_SEND=true on the VPS).
//
// Multi-tenant safety: every tool is scoped by the signed-in user's
// tenant_id via the Supabase RLS-bound server client. No tool can touch
// rows outside the user's tenant.

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 60

type Role = 'user' | 'assistant'

type ChatMessage = {
  role: Role
  content: string | Array<
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  >
}

type ToolDef = {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

// Tool definitions — kept tight so Claude can pick the right one fast.
const TOOLS: ToolDef[] = [
  {
    name: 'list_families',
    description:
      'List families. Filter by lifecycle stage (active, trial, lead, paused, lost, past) and/or a search term that matches the family name, primary parent, email, or phone. Default limit 20.',
    input_schema: {
      type: 'object',
      properties: {
        lifecycle: { type: 'string', description: 'Filter by lifecycle_stage' },
        search: { type: 'string', description: 'Free-text search across name/parent/email/phone' },
        limit: { type: 'number', description: 'Max rows (default 20, max 100)' },
      },
    },
  },
  {
    name: 'get_family',
    description: 'Get full detail on one family by id, including their students.',
    input_schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'list_pending_actions',
    description:
      'List items in the approval queue (/inbox). status defaults to pending. Useful for "what is waiting for my approval right now".',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'approved', 'sent', 'rejected', 'failed'] },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'list_recent_emails',
    description:
      'List recently received emails to the business inbox (already triaged by Server-Jacky). Useful for "show me last week\'s leads" or "did Sarah email back".',
    input_schema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'Look back this many hours (default 72)' },
        search: { type: 'string', description: 'Substring match on subject or body' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'create_email_draft',
    description:
      'Queue an outbound EMAIL draft into the approval queue. Either family_id (preferred — pulls the parent\'s email automatically) OR an explicit "to" email address. The owner will see it in /inbox and tap Approve to send. Use the business\'s warm voice and end with the Jacky sign-off.',
    input_schema: {
      type: 'object',
      required: ['subject', 'body'],
      properties: {
        family_id: { type: 'string' },
        to: { type: 'string', description: 'Email address (used if family_id is omitted)' },
        subject: { type: 'string' },
        body: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'high', 'normal', 'low'], description: 'Default normal' },
        reasoning: { type: 'string', description: 'One-sentence why for the inbox card' },
      },
    },
  },
  {
    name: 'create_sms_draft',
    description:
      'Queue an outbound SMS draft into the approval queue. Either family_id (pulls phone) OR explicit "to" mobile number. SMS body must be ≤480 chars; keep it short and warm. Rhett approves in /inbox to send.',
    input_schema: {
      type: 'object',
      required: ['body'],
      properties: {
        family_id: { type: 'string' },
        to: { type: 'string', description: 'Mobile number (used if family_id is omitted)' },
        body: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'high', 'normal', 'low'] },
        reasoning: { type: 'string' },
      },
    },
  },
  {
    name: 'update_family_lifecycle',
    description:
      'Change a family\'s lifecycle stage. Use carefully — common moves: lead → trial after first class booked, trial → active after first paid week, active → paused on hold-fee request, → lost if they say no.',
    input_schema: {
      type: 'object',
      required: ['id', 'stage'],
      properties: {
        id: { type: 'string' },
        stage: { type: 'string', enum: ['active', 'trial', 'lead', 'paused', 'past', 'lost'] },
      },
    },
  },
]

function buildSystemPrompt(branding: { name?: string | null; address?: string | null } | undefined, ownerName: string | null): string {
  const biz = branding?.name || 'this business'
  const loc = branding?.address ? ` (${branding.address})` : ''
  const owner = ownerName || 'the owner'
  return `You are Jacky, the AI Admin & Customer Experience Manager for ${biz}${loc}. You report to ${owner}, the business owner.

You are speaking to ${owner} INSIDE their CRM. They are a non-technical business owner who wants results, not jargon. Use the tools you have to actually GET THINGS DONE — don't just describe what could be done.

## Your hands (the tools)
- Read families, recent leads, the approval queue.
- Queue email/SMS drafts (they go to /inbox where the owner taps Approve, then Server-Jacky on the VPS sends them via Resend or ClickSend). NOTHING you queue auto-sends.
- Update a family's lifecycle stage.

## How you operate
- Use multiple tools in one turn when it makes sense (look something up THEN draft).
- When drafting messages, use a warm, friendly voice: "Hi {first_name}! 😊", short paragraphs, ONE soft call-to-action, sign as "Jacky 🎪 ${biz}".
- For SMS, keep it ≤160 chars when possible. Sign with the business name if there's room.
- Always tell the owner what you did at the end — counts, recipient names, ids — and what's now waiting for their approval.

## Hard rules
- Never identify a child by name in any drafted message unless the owner already used that name in the conversation.
- Never reveal medical / NDIS / financial details in messages.
- When you create a draft, ALWAYS tell the owner "1 draft queued in /inbox" so they know where it went.
- If unsure who exactly to send to, ASK — don't guess.

Keep your text replies short. Bullet steps if listing. No corporate jargon.`
}

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

type AnthropicResponse = {
  id: string
  content: AnthropicContent[]
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
  usage?: { input_tokens: number; output_tokens: number }
}

export async function POST(request: NextRequest) {
  const user = await verifySession()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured on the server' }, { status: 500 })
  }

  const body = (await request.json()) as { messages: ChatMessage[] }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const tenantId = user.tenantId

  // The agent loop — keep calling Claude as long as it wants tools, then stop on end_turn.
  let conversation: ChatMessage[] = body.messages.slice()
  const toolEvents: Array<{ name: string; input: unknown; result: unknown }> = []
  let safety = 0

  while (safety++ < 8) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: buildSystemPrompt(user.tenant, user.fullName),
        tools: TOOLS,
        messages: conversation,
      }),
    })

    if (!r.ok) {
      const text = await r.text()
      return NextResponse.json({ error: `Anthropic ${r.status}: ${text.slice(0, 400)}` }, { status: 502 })
    }
    const data = (await r.json()) as AnthropicResponse

    // Append assistant response to conversation history (verbatim, so Claude has context)
    conversation.push({ role: 'assistant', content: data.content as ChatMessage['content'] })

    if (data.stop_reason !== 'tool_use') {
      // Final reply — extract text and return.
      const text = data.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join('\n\n')
      return NextResponse.json({
        reply: text,
        toolEvents,
        messages: conversation,
      })
    }

    // Otherwise we run each tool and append a user-role tool_result block.
    const toolUses = data.content.filter((c): c is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } => c.type === 'tool_use')
    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }> = []

    for (const tu of toolUses) {
      const result = await runTool(tu.name, tu.input, { tenantId, userId: user.id, supabase })
      toolEvents.push({ name: tu.name, input: tu.input, result: result.summary })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(result.payload),
        is_error: !result.ok,
      })
    }
    conversation.push({ role: 'user', content: toolResults })
  }

  return NextResponse.json({ error: 'Agent loop exceeded 8 iterations — bailing.' }, { status: 500 })
}

// ───────────────────────────────────────────────────────────────────
// Tool implementations
// ───────────────────────────────────────────────────────────────────

type ToolCtx = {
  tenantId: string
  userId: string
  // Using ReturnType to avoid pulling in the SupabaseClient generic
  supabase: Awaited<ReturnType<typeof createServerSupabase>>
}

type ToolResult = {
  ok: boolean
  summary: string
  payload: unknown
}

async function runTool(name: string, input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  try {
    switch (name) {
      case 'list_families':       return await listFamilies(input, ctx)
      case 'get_family':          return await getFamily(input, ctx)
      case 'list_pending_actions':return await listPendingActions(input, ctx)
      case 'list_recent_emails':  return await listRecentEmails(input, ctx)
      case 'create_email_draft':  return await createEmailDraft(input, ctx)
      case 'create_sms_draft':    return await createSmsDraft(input, ctx)
      case 'update_family_lifecycle': return await updateFamilyLifecycle(input, ctx)
      default:
        return { ok: false, summary: `Unknown tool: ${name}`, payload: { error: 'unknown_tool' } }
    }
  } catch (e) {
    const msg = (e as Error).message
    return { ok: false, summary: `${name} failed: ${msg}`, payload: { error: msg } }
  }
}

async function listFamilies(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  const lifecycle = typeof input.lifecycle === 'string' ? input.lifecycle : null
  const search = typeof input.search === 'string' ? input.search.trim() : ''
  const limit = Math.min(Math.max(Number(input.limit ?? 20) || 20, 1), 100)

  let q = ctx.supabase
    .from('families')
    .select('id, family_name, primary_parent, email, phone, lifecycle_stage, source, weekly_fee_total, tags')
    .eq('tenant_id', ctx.tenantId)
    .order('family_name', { ascending: true })
    .limit(limit)
  if (lifecycle) q = q.eq('lifecycle_stage', lifecycle)
  if (search) q = q.or(`family_name.ilike.%${search}%,primary_parent.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)

  const { data, error } = await q
  if (error) return { ok: false, summary: error.message, payload: { error: error.message } }
  return {
    ok: true,
    summary: `Found ${data?.length ?? 0} families`,
    payload: { count: data?.length ?? 0, families: data ?? [] },
  }
}

async function getFamily(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  const id = String(input.id ?? '')
  if (!id) return { ok: false, summary: 'id required', payload: { error: 'id required' } }

  const { data: family, error } = await ctx.supabase
    .from('families')
    .select(`id, family_name, primary_parent, email, phone, lifecycle_stage, source, weekly_fee_total, tags, notes, created_at,
             students:students!students_family_id_fkey ( id, first_name, last_name, age, disciplines )`)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, summary: error.message, payload: { error: error.message } }
  if (!family) return { ok: false, summary: 'Not found', payload: { error: 'not_found' } }
  return { ok: true, summary: `Loaded family ${family.family_name}`, payload: family }
}

async function listPendingActions(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  const status = typeof input.status === 'string' ? input.status : 'pending'
  const limit = Math.min(Math.max(Number(input.limit ?? 20) || 20, 1), 100)
  const { data, error } = await ctx.supabase
    .from('pending_actions')
    .select('id, kind, status, priority, draft_subject, draft_recipient, created_at, reasoning')
    .eq('tenant_id', ctx.tenantId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { ok: false, summary: error.message, payload: { error: error.message } }
  return {
    ok: true,
    summary: `${data?.length ?? 0} ${status} action(s)`,
    payload: { count: data?.length ?? 0, actions: data ?? [] },
  }
}

async function listRecentEmails(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  const hours = Math.max(1, Math.min(Number(input.hours ?? 72) || 72, 720))
  const search = typeof input.search === 'string' ? input.search.trim() : ''
  const limit = Math.min(Math.max(Number(input.limit ?? 20) || 20, 1), 100)
  const since = new Date(Date.now() - hours * 3600_000).toISOString()
  let q = ctx.supabase
    .from('email_messages')
    .select('id, from_email, from_name, subject, body_text, received_at, classification, classification_confidence')
    .eq('tenant_id', ctx.tenantId)
    .gte('received_at', since)
    .order('received_at', { ascending: false })
    .limit(limit)
  if (search) q = q.or(`subject.ilike.%${search}%,body_text.ilike.%${search}%`)
  const { data, error } = await q
  if (error) return { ok: false, summary: error.message, payload: { error: error.message } }
  return {
    ok: true,
    summary: `${data?.length ?? 0} email(s) in last ${hours}h`,
    payload: { count: data?.length ?? 0, emails: data ?? [] },
  }
}

async function resolveRecipient(input: Record<string, unknown>, ctx: ToolCtx, channel: 'email' | 'sms'): Promise<{
  ok: boolean
  recipient?: string
  familyId?: string | null
  error?: string
}> {
  const explicit = typeof input.to === 'string' ? input.to.trim() : ''
  const familyId = typeof input.family_id === 'string' ? input.family_id : null
  if (familyId) {
    const { data, error } = await ctx.supabase
      .from('families')
      .select('id, email, phone')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', familyId)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: 'family not found' }
    const r = channel === 'email' ? data.email : data.phone
    if (!r) return { ok: false, error: `family has no ${channel} on file` }
    return { ok: true, recipient: r, familyId: data.id }
  }
  if (!explicit) return { ok: false, error: 'either family_id or to is required' }
  return { ok: true, recipient: explicit, familyId: null }
}

async function createEmailDraft(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  const resolved = await resolveRecipient(input, ctx, 'email')
  if (!resolved.ok) return { ok: false, summary: resolved.error!, payload: { error: resolved.error } }
  const subject = String(input.subject ?? '').trim()
  const bodyText = String(input.body ?? '').trim()
  if (!subject) return { ok: false, summary: 'subject required', payload: { error: 'subject required' } }
  if (!bodyText) return { ok: false, summary: 'body required', payload: { error: 'body required' } }

  const { data, error } = await ctx.supabase
    .from('pending_actions')
    .insert({
      tenant_id: ctx.tenantId,
      kind: 'email_outbound',
      triggered_by: 'manual',
      related_family_id: resolved.familyId,
      draft_subject: subject,
      draft_body: bodyText,
      draft_recipient: resolved.recipient,
      draft_metadata: { source: 'crm-chat', composed_by: ctx.userId },
      priority: (input.priority as string) ?? 'normal',
      reasoning: String(input.reasoning ?? 'Drafted via /jacky chat'),
      status: 'pending',
      ai_provider: 'anthropic',
      ai_model: 'claude-sonnet-4-5',
    })
    .select('id')
    .single()
  if (error) return { ok: false, summary: error.message, payload: { error: error.message } }
  return {
    ok: true,
    summary: `Queued email draft to ${resolved.recipient}`,
    payload: { pending_action_id: data!.id, recipient: resolved.recipient, channel: 'email' },
  }
}

async function createSmsDraft(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  const resolved = await resolveRecipient(input, ctx, 'sms')
  if (!resolved.ok) return { ok: false, summary: resolved.error!, payload: { error: resolved.error } }
  const bodyText = String(input.body ?? '').trim()
  if (!bodyText) return { ok: false, summary: 'body required', payload: { error: 'body required' } }
  if (bodyText.length > 480) return { ok: false, summary: 'SMS body too long (>480 chars)', payload: { error: 'too_long', length: bodyText.length } }

  const { data, error } = await ctx.supabase
    .from('pending_actions')
    .insert({
      tenant_id: ctx.tenantId,
      kind: 'sms_outbound',
      triggered_by: 'manual',
      related_family_id: resolved.familyId,
      draft_subject: null,
      draft_body: bodyText,
      draft_recipient: resolved.recipient,
      draft_metadata: { source: 'crm-chat', composed_by: ctx.userId, channel: 'sms' },
      priority: (input.priority as string) ?? 'normal',
      reasoning: String(input.reasoning ?? 'Drafted via /jacky chat'),
      status: 'pending',
      ai_provider: 'anthropic',
      ai_model: 'claude-sonnet-4-5',
    })
    .select('id')
    .single()
  if (error) return { ok: false, summary: error.message, payload: { error: error.message } }
  return {
    ok: true,
    summary: `Queued SMS draft to ${resolved.recipient}`,
    payload: { pending_action_id: data!.id, recipient: resolved.recipient, channel: 'sms' },
  }
}

async function updateFamilyLifecycle(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  const id = String(input.id ?? '')
  const stage = String(input.stage ?? '')
  if (!id || !stage) return { ok: false, summary: 'id and stage required', payload: { error: 'id+stage required' } }
  const { data, error } = await ctx.supabase
    .from('families')
    .update({ lifecycle_stage: stage })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .select('id, family_name, lifecycle_stage')
    .maybeSingle()
  if (error) return { ok: false, summary: error.message, payload: { error: error.message } }
  if (!data) return { ok: false, summary: 'Family not found', payload: { error: 'not_found' } }
  return { ok: true, summary: `${data.family_name} → ${data.lifecycle_stage}`, payload: data }
}
