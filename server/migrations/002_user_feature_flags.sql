alter table users
add column if not exists feature_flags jsonb not null default '{"newTicketsTable": false}'::jsonb;
