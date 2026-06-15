alter table tickets
add column if not exists due_at timestamptz;

create index if not exists idx_tickets_due_at on tickets (due_at);
