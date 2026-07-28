// ── Central Hive automation feed ─────────────────────────────────────────────
// Every franchise's CRM "feeds the Hive": when something happens (a new lead,
// a trial booking, a member joining) we POST a small, FRANCHISE-TAGGED event to
// one central n8n instance the franchisor owns. n8n does the actual sending
// (email/SMS), so each franchise gets working automations without running or
// touching n8n themselves.
//
// Configured once, centrally, via env vars:
//   N8N_HIVE_WEBHOOK_URL  — the catch-all webhook on the central Hive
//   N8N_HIVE_SECRET       — optional shared secret, sent as X-Hive-Secret
//
// If N8N_HIVE_WEBHOOK_URL is unset, this is a silent no-op — safe to ship before
// the Hive is wired up. Always fire-and-forget: a slow or down Hive must NEVER
// block or break the customer-facing action that triggered it.

export type AutomationEvent =
  | 'lead.created'
  | 'trial.booked'
  | 'member.joined'
  | 'family.paused'
  | 'family.lost'

type EventData = Record<string, unknown>

export async function fireAutomationEvent(
  tenantId: string,
  event: AutomationEvent,
  data: EventData,
  tenantName?: string | null,
): Promise<void> {
  const url = process.env.N8N_HIVE_WEBHOOK_URL
  if (!url) return // Hive not connected yet — dormant, no-op.

  const secret = process.env.N8N_HIVE_SECRET
  const payload = {
    tenant_id: tenantId,
    tenant_name: tenantName ?? null,
    event,
    occurred_at: new Date().toISOString(),
    data,
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-Hive-Secret': secret } : {}),
      },
      body: JSON.stringify(payload),
      // Cap the wait so a slow Hive can't hang the user's request.
      signal: AbortSignal.timeout(4000),
    })
  } catch (err) {
    // Never throw — automation is best-effort.
    console.error('[automation] Hive event failed:', event, err)
  }
}
