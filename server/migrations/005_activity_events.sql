create table if not exists activity_events (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references users(id) on delete set null,
  actor_email text not null,
  kind text not null,
  title text not null,
  description text not null default '',
  resource_type text not null,
  resource_id uuid,
  resource_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_events_created_at on activity_events (created_at desc);
create index if not exists idx_activity_events_kind on activity_events (kind);
