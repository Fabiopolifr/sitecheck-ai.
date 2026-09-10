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
