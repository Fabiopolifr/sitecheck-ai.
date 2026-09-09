-- SiteCheck AI — Phase 2 initial schema
-- See AI/MASTER_SPEC.md §10 and AI/ARCHITECTURE.md.
--
-- All tables are accessed exclusively through the server using the
-- app's own Postgres connection (see src/lib/db/pgClient.ts) — a
-- self-managed database (e.g. on a Hostinger VPS) has no public HTTP API
-- and no anon/authenticated client concept of its own, so access control
-- is enforced by keeping the database unreachable from outside the
-- server (no public port, credentials only in DATABASE_URL) rather than
-- by row-level policies. Row Level Security is still enabled with no
-- public policies as defense in depth (see AI/DECISIONS.md).

create extension if not exists pgcrypto;

create table if not exists audits (
  id uuid primary key,
  status text not null check (status in ('completed', 'failed')),
  requested_url text not null,
  final_url text,
  hostname text not null,
  industry text not null default 'real_estate',
  site_score integer,
  band text check (band in ('strong', 'good', 'needs_attention', 'critical')),
  failure_reason text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text
);

create index if not exists audits_created_at_idx on audits (created_at desc);
create index if not exists audits_hostname_idx on audits (hostname);

create table if not exists audit_checks (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits (id) on delete cascade,
  check_id text not null,
  category text not null,
  status text not null check (status in ('pass', 'warning', 'fail', 'unknown')),
  confidence numeric not null,
  weight numeric not null,
  value_json jsonb,
  evidence text,
  created_at timestamptz not null default now()
);

create index if not exists audit_checks_audit_id_idx on audit_checks (audit_id);
create index if not exists audit_checks_check_id_status_idx
  on audit_checks (check_id, status);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references audits (id) on delete set null,
  email text not null,
  first_name text,
  consent_marketing boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists leads_audit_id_idx on leads (audit_id);
create index if not exists leads_created_at_idx on leads (created_at desc);

create table if not exists affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references audits (id) on delete set null,
  partner text not null,
  destination text not null,
  detected_issue text,
  utm_source text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_clicks_audit_id_idx on affiliate_clicks (audit_id);
create index if not exists affiliate_clicks_created_at_idx on affiliate_clicks (created_at desc);

alter table audits enable row level security;
alter table audit_checks enable row level security;
alter table leads enable row level security;
alter table affiliate_clicks enable row level security;
