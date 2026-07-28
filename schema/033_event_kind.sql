-- ============================================================================
-- BSC CRM — Migration 033: event "kind" (workshop / kno / event)
-- ============================================================================
-- Lets you add ANY recurring event (sausage sizzle, BSC birthday party, etc.)
-- to the Coach Events area, separate from Holiday Workshops & Kids Night Out.
-- Safe to run as-is.
-- ============================================================================

ALTER TABLE public.holiday_workshops ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'workshop';
