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
