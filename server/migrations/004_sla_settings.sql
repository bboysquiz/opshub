create table if not exists sla_settings (
  id boolean primary key default true check (id),
  low_minutes integer not null check (low_minutes > 0),
  medium_minutes integer not null check (medium_minutes > 0),
  high_minutes integer not null check (high_minutes > 0),
  updated_at timestamptz not null default now()
);

insert into sla_settings (id, low_minutes, medium_minutes, high_minutes)
values (true, 1440, 480, 240)
on conflict (id) do nothing;
