-- SiteCheck AI — CookieYes assisted setup lead capture (AI/DECISIONS.md D33)
-- See AI/MASTER_SPEC.md and the CookieYes conversion engine decisions.

alter table leads
  add column if not exists support_requested boolean not null default false,
  add column if not exists support_phone text,
  add column if not exists support_reason text,
  add column if not exists support_status text not null default 'new'
    check (support_status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  add column if not exists support_requested_at timestamptz;

create index if not exists leads_support_requested_idx
  on leads (support_requested) where support_requested;
