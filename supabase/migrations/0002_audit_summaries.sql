-- SiteCheck AI — Phase 3 addition: AI-generated audit summaries.
-- See AI/MASTER_SPEC.md §9, §10.

create table if not exists audit_summaries (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits (id) on delete cascade,
  provider text not null,
  model text,
  summary text not null,
  priorities_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_summaries_audit_id_idx
  on audit_summaries (audit_id);

alter table audit_summaries enable row level security;
