create table if not exists spaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  created_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists space_members (
  space_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint space_members_pkey primary key (space_id, user_id),
  constraint space_members_space_id_fkey foreign key (space_id) references spaces(id) on delete cascade,
  constraint space_members_user_id_fkey foreign key (user_id) references users(id) on delete cascade
);

create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  space_id uuid not null,
  name text not null,
  description text not null default '',
  archived_at timestamptz,
  created_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint projects_space_id_fkey foreign key (space_id) references spaces(id) on delete cascade,
  constraint projects_id_space_id_key unique (id, space_id),
  constraint projects_space_id_name_key unique (space_id, name)
);

create table if not exists project_members (
  project_id uuid not null,
  space_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint project_members_pkey primary key (project_id, user_id),
  constraint project_members_project_space_fkey foreign key (project_id, space_id) references projects(id, space_id) on delete cascade,
  constraint project_members_space_member_fkey foreign key (space_id, user_id) references space_members(space_id, user_id) on delete cascade
);

create index if not exists idx_space_members_user_id on space_members (user_id);
create index if not exists idx_projects_space_id on projects (space_id);
create index if not exists idx_project_members_user_id on project_members (user_id);
create index if not exists idx_project_members_space_id on project_members (space_id);

insert into spaces (name, description)
select 'Default space', 'Space created for tickets that existed before project access was introduced.'
where not exists (
  select 1
  from spaces
  where name = 'Default space'
);

with default_space as (
  select id
  from spaces
  where name = 'Default space'
  order by created_at, id
  limit 1
)
insert into projects (space_id, name, description)
select default_space.id, 'Default project', 'Project created for tickets that existed before project access was introduced.'
from default_space
where not exists (
  select 1
  from projects
  where projects.space_id = default_space.id
    and projects.name = 'Default project'
);

with default_space as (
  select id
  from spaces
  where name = 'Default space'
  order by created_at, id
  limit 1
)
insert into space_members (space_id, user_id)
select default_space.id, users.id
from default_space
cross join users
on conflict do nothing;

with default_project as (
  select projects.id as project_id, projects.space_id
  from projects
  join spaces on spaces.id = projects.space_id
  where spaces.name = 'Default space'
    and projects.name = 'Default project'
  order by projects.created_at, projects.id
  limit 1
)
insert into project_members (project_id, space_id, user_id)
select default_project.project_id, default_project.space_id, users.id
from default_project
cross join users
on conflict do nothing;

alter table tickets
add column if not exists project_id uuid;

with default_project as (
  select projects.id as project_id
  from projects
  join spaces on spaces.id = projects.space_id
  where spaces.name = 'Default space'
    and projects.name = 'Default project'
  order by projects.created_at, projects.id
  limit 1
)
update tickets
set project_id = default_project.project_id
from default_project
where tickets.project_id is null;

alter table tickets
alter column project_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tickets_project_id_fkey'
      and conrelid = 'tickets'::regclass
  ) then
    alter table tickets
    add constraint tickets_project_id_fkey
    foreign key (project_id) references projects(id);
  end if;
end $$;

create index if not exists idx_tickets_project_id on tickets (project_id);
