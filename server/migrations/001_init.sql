create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'agent', -- admin | agent | employee
  created_at timestamptz not null default now()
);

create table if not exists refresh_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  refresh_token_hash text not null,
  user_agent text,
  ip text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  status text not null default 'open', -- open | in_progress | resolved
  priority text not null default 'medium', -- low | medium | high
  created_by uuid references users(id),
  assigned_to uuid references users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists kb_articles (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);