-- ============================================================================
-- BSC CRM — Migration 032: flexible roster positions
-- ============================================================================
-- Lets a roster position be any label (Head Coach, Lead, Coach, Jr Coach,
-- Trainee, Assistant, …) instead of only coach/trainee/lead.
-- Safe to run as-is.
-- ============================================================================

ALTER TABLE public.class_staff    DROP CONSTRAINT IF EXISTS class_staff_role_check;
ALTER TABLE public.workshop_staff DROP CONSTRAINT IF EXISTS workshop_staff_role_check;
