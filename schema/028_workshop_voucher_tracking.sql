-- ============================================================================
-- BSC CRM — Migration 028: Workshop day tracking + Play On voucher extras
-- ============================================================================
-- Adds:
--  • holiday_workshops.activity   — the daily circus arts & craft activity
--  • workshop_bookings.child_count — how many kids in this booking (clean number)
--  • workshop_bookings.amount_paid — $ collected for this booking
--  • workshop_bookings.paid        — paid yes/no (Stripe bookings come in paid)
--  • play_on_vouchers.use_type     — term / workshop / both / unused
--  • play_on_vouchers.photo_url    — a photo of the physical voucher
-- Safe to run as-is (idempotent — re-running does nothing).
-- ============================================================================

ALTER TABLE public.holiday_workshops ADD COLUMN IF NOT EXISTS activity TEXT;

ALTER TABLE public.workshop_bookings ADD COLUMN IF NOT EXISTS child_count INT NOT NULL DEFAULT 1;
ALTER TABLE public.workshop_bookings ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);
ALTER TABLE public.workshop_bookings ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.play_on_vouchers ADD COLUMN IF NOT EXISTS use_type TEXT
  CHECK (use_type IN ('term','workshop','both','unused'));
ALTER TABLE public.play_on_vouchers ADD COLUMN IF NOT EXISTS photo_url TEXT;
