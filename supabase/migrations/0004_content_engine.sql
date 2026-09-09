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
