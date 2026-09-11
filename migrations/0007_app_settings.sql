-- Generic key/value store for small app-wide flags (e.g. pausing the
-- outreach automation) that need to persist across requests/deploys
-- without a dedicated table per flag. See AI/DECISIONS.md.
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
