-- ============================================================================
-- BSC CRM — Migration 037: emergency contact name on families
-- ============================================================================
-- Adds an emergency-contact NAME field (the phone field already exists).
-- Safe to run as-is.
-- ============================================================================

alter table public.families add column if not exists emergency_name text;
