-- Imported leads (2026-11) — idempotent, safe to re-run.
-- Handles pasted into /admin/leads arrive with no priority yet; the local
-- enrichment script (scripts/enrich-leads.mjs) sets it later.

alter table public.leads alter column prioridad drop not null;
alter table public.leads alter column prioridad drop default;
