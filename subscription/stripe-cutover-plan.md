# Stripe Cutover Plan — New All-Year Membership

> ⚠️ HOLD — do NOT execute until Rhett says go (target: Term 4, Mon 6 Oct 2026,
> after the member survey). The current 54 subscriptions at $27 keep running
> untouched until then. This is the prepared plan only.

## New Stripe Products & recurring Prices to create (weekly billing)
| Product | Price | Interval |
|---|---|---|
| Membership — 1 class/week | $30.00 | weekly |
| Membership — 2 classes/week | $50.00 ($25/class) | weekly |
| Membership — 3 classes/week | $60.00 ($20/class) | weekly |
| Sibling — 1 class/week | $20.00 | weekly |
| Sibling — 2 classes/week | $40.00 | weekly |
| Sibling — 3 classes/week | $60.00 | weekly |

Casual class ($37) is pay-as-you-go — handle via the Reception Till / one-off
payment, NOT a subscription.

All weekly, no end date, all year (no holiday pause). **GST-free — prices are
final, NO tax added (set Stripe tax behaviour so no GST is added on top).**
Currency AUD.

## Cutover steps (on go-live, Oct 6)
1. Create the 6 Products + recurring Prices in Stripe (live mode).
2. **Map each active family** to the right new price = their child(ren)'s weekly
   class count + sibling count. (I'll generate this mapping from the CRM
   enrolments before cutover so it's ready to apply.)
3. For each existing subscription: update it to the new Price effective from the
   next billing cycle on/after 6 Oct (no mid-week proration; clean switch).
4. Families who don't continue (per survey) → cancel with 3 weeks' notice honoured.
5. New members from Oct → subscribe directly to the matching new Price.

## Key policies to encode
- Billed weekly, **all year (52 weeks)** — no school-holiday pause.
- **3 weeks' notice** to cancel.
- School-holiday weeks: the weekly $30 stands (covers the 6-hour workshop day);
  no separate charge unless extra workshop days ($60) are booked.

## Migration safety
- Communicate via the survey BEFORE any Stripe change.
- Keep a snapshot/export of all current subscriptions before edits (rollback).
- Do it in a quiet window; verify a handful before bulk-applying.

## What I need from Rhett at go-time
- Final "go" + confirmed date.
- Confirm GST handling matches current.
- Decision on any family who wants to stay on the old $27 ("grandfather") vs all
  move to new — currently: everyone moves (survey will set expectations).
