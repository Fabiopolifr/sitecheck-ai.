-- SiteCheck AI / FreeCookieBe — TUTTE le migration in un unico file.
--
-- Come si usa: apri Neon → SQL Editor, incolla TUTTO questo file, Run.
-- È sicuro eseguirlo anche più volte e anche se alcune tabelle
-- esistono già: ogni istruzione usa "if not exists", quindi salta
-- ciò che c'è già senza toccare i dati esistenti.
--
-- Rigenerato da migrations/0001..0008. Se aggiungi una migration
-- nuova, aggiungila anche qui in fondo.


-- ===================================================================
-- 0001_init.sql
-- ===================================================================
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

-- ===================================================================
-- 0002_audit_summaries.sql
-- ===================================================================
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

-- ===================================================================
-- 0003_analytics_events.sql
-- ===================================================================
-- SiteCheck AI — Phase 4 addition: internal funnel analytics.
-- See AI/MASTER_SPEC.md §14.

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  audit_id uuid references audits (id) on delete set null,
  event_name text not null check (event_name in (
    'landing_view',
    'audit_started',
    'audit_completed',
    'audit_failed',
    'results_viewed',
    'email_submitted',
    'affiliate_clicked'
  )),
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on analytics_events (created_at desc);
create index if not exists analytics_events_session_id_idx
  on analytics_events (session_id);
create index if not exists analytics_events_event_name_idx
  on analytics_events (event_name);

alter table analytics_events enable row level security;

-- ===================================================================
-- 0004_content_engine.sql
-- ===================================================================
-- SiteCheck AI — Phase 5 addition: content engine.
-- See AI/MASTER_SPEC.md §15-19.

create table if not exists content_insights (
  id uuid primary key default gen_random_uuid(),
  industry text not null,
  metric text not null,
  sample_size integer not null,
  value jsonb not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  source_query_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists content_insights_created_at_idx
  on content_insights (created_at desc);

create table if not exists content_posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'data_insight',
    'educational',
    'problem_pain',
    'quiz',
    'site_score_concept',
    'conversion_cta'
  )),
  source_type text not null check (source_type in ('evergreen', 'insight')),
  source_reference uuid references content_insights (id) on delete set null,
  headline text not null,
  body text not null,
  cta text,
  image_url text,
  status text not null default 'queued' check (status in (
    'queued', 'approved', 'published', 'rejected'
  )),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists content_posts_status_idx on content_posts (status);
create index if not exists content_posts_created_at_idx
  on content_posts (created_at desc);

create table if not exists content_publications (
  id uuid primary key default gen_random_uuid(),
  content_post_id uuid not null references content_posts (id) on delete cascade,
  platform text not null,
  external_id text,
  status text not null default 'pending' check (status in (
    'pending', 'published', 'failed'
  )),
  published_at timestamptz,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_publications_post_id_idx
  on content_publications (content_post_id);

alter table content_insights enable row level security;
alter table content_posts enable row level security;
alter table content_publications enable row level security;

-- ===================================================================
-- 0005_cookieyes_support.sql
-- ===================================================================
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

-- ===================================================================
-- 0006_outreach.sql
-- ===================================================================
-- SiteCheck AI — automated outreach: daily audit of user-supplied and
-- Google Maps-discovered sites, eligibility filtering (privacy/cookie
-- issues), automatic email to eligible ones. See AI/DECISIONS.md D37.

create table if not exists outreach_sites (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('manual', 'google_maps')),
  business_name text,
  website text not null,
  domain text not null,
  city text,
  query_used text,
  audit_id uuid references audits (id) on delete set null,
  site_score integer,
  band text,
  contact_email text,
  eligible boolean,
  eligibility_reason text,
  status text not null default 'queued' check (status in (
    'queued', 'analyzed', 'ineligible', 'no_email_found',
    'emailed', 'send_failed', 'suppressed'
  )),
  created_at timestamptz not null default now(),
  analyzed_at timestamptz,
  emailed_at timestamptz
);

create unique index if not exists outreach_sites_domain_idx
  on outreach_sites (domain);
create index if not exists outreach_sites_status_idx on outreach_sites (status);
create index if not exists outreach_sites_source_idx on outreach_sites (source);
create index if not exists outreach_sites_created_at_idx
  on outreach_sites (created_at desc);

create table if not exists outreach_suppressions (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  domain text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists outreach_suppressions_domain_idx
  on outreach_suppressions (domain);

alter table outreach_sites enable row level security;
alter table outreach_suppressions enable row level security;

-- ===================================================================
-- 0007_app_settings.sql
-- ===================================================================
-- Generic key/value store for small app-wide flags (e.g. pausing the
-- outreach automation) that need to persist across requests/deploys
-- without a dedicated table per flag. See AI/DECISIONS.md.
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ===================================================================
-- 0008_outreach_variants.sql
-- ===================================================================
-- Subject-line A/B testing + follow-up sequence for outreach emails.
-- See AI/DECISIONS.md D42.
alter table outreach_sites add column if not exists email_variant text;
alter table outreach_sites add column if not exists clicked_at timestamptz;
alter table outreach_sites add column if not exists follow_up_sent_at timestamptz;
alter table outreach_sites add column if not exists follow_up_variant text;


-- ===================================================================
-- VERIFICA — esegui questa query dopo il Run qui sopra.
-- Devi vedere 10 righe: se ci sono tutte, il database è a posto.
-- ===================================================================
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'audits', 'audit_checks', 'audit_summaries', 'leads',
    'affiliate_clicks', 'analytics_events', 'content_insights',
    'content_posts', 'outreach_sites', 'app_settings'
  )
order by table_name;
