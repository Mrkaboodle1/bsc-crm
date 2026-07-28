-- ============================================================================
-- BSC CRM v1 — Migration 017: Student support needs (ADHD / neurodiverse)
-- ============================================================================
-- Drafted: 2026-06-08 by Jacky
-- Purpose: capture a child's support needs + "what works for this child" so any
--   coach picking up the class knows instantly how to help them thrive.
--   Shown on the coach Confirm/roll screen alongside allergy + medical flags.
-- Run order: after 016_pos_memberships.sql. Safe to re-run (idempotent).
-- ============================================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS support_needs    TEXT;  -- e.g. "ADHD", "Autism", "Anxiety"
ALTER TABLE students ADD COLUMN IF NOT EXISTS support_strategy TEXT;  -- "what works": "give him a job, warn before transitions"
