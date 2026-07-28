-- ============================================================================
-- BSC CRM v1 — Migration 022: Coach pay / tax compliance fields
-- ============================================================================
-- Drafted: 2026-06-08 by Jacky. Track each coach's tax/pay status so payroll
-- stays clean: ABN (for contractors), whether a TFN is on file (employees), and
-- whether super is paid. `employment_type` already exists (casual/contractor/
-- trainee_honorarium etc). Run after 021. Safe to re-run.
-- ============================================================================

ALTER TABLE coaches ADD COLUMN IF NOT EXISTS abn        TEXT;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS tfn_held   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS super_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS pay_note   TEXT;
