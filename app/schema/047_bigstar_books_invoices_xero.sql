-- Big Star Books — invoices, Xero-style upgrade.
-- Adds: reference, "amounts are" (GST exclusive/inclusive/none), per-line account
-- (income category), and an 'awaiting' status (Xero's "Awaiting Payment").

alter table public.bs_invoices add column if not exists reference text;
alter table public.bs_invoices add column if not exists amounts_are text not null default 'exclusive';
alter table public.bs_invoice_lines add column if not exists account text;

-- Allow Xero-style statuses (draft → awaiting → paid, plus sent/void).
alter table public.bs_invoices drop constraint if exists bs_invoices_status_check;
alter table public.bs_invoices add constraint bs_invoices_status_check
  check (status in ('draft','awaiting','sent','paid','void'));
