-- Tables for EventOps. Safe to run more than once (nothing is deleted).

create table if not exists events (
  id          serial primary key,
  name        text not null,
  starts_at   timestamptz not null,
  created_at  timestamptz not null default now()
);
-- Added after the first connection test, so it is added separately.
alter table events add column if not exists issues_resolved_before integer not null default 18;

create table if not exists tasks (
  id          serial primary key,
  event_id    integer not null references events(id) on delete cascade,
  title       text not null,
  owner       text not null default 'You',
  due         date,
  priority    text not null check (priority in ('High', 'Medium', 'Low')),
  status      text not null default 'Backlog' check (status in ('Backlog', 'In Progress', 'Blocked', 'Done')),
  created_at  timestamptz not null default now()
);

create table if not exists resources (
  id          serial primary key,
  event_id    integer not null references events(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('venue', 'gear')),
  slot        text not null,
  status      text not null check (status in ('Booked', 'Pending', 'Conflict', 'Free'))
);

create table if not exists issues (
  id           serial primary key,
  event_id     integer not null references events(id) on delete cascade,
  title        text not null,
  severity     text not null check (severity in ('Critical', 'High', 'Medium', 'Low')),
  status       text not null default 'Open' check (status in ('Open', 'Resolved')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- A budget category has a planned amount; what has been spent is the total of its expenses.
create table if not exists budget_categories (
  id              serial primary key,
  event_id        integer not null references events(id) on delete cascade,
  head            text not null,
  planned_amount  integer not null check (planned_amount >= 0)
);

create table if not exists expenses (
  id           serial primary key,
  category_id  integer not null references budget_categories(id) on delete cascade,
  amount       integer not null check (amount > 0),
  note         text not null default '',
  spent_on     date not null default current_date,
  created_at   timestamptz not null default now()
);

create table if not exists sponsors (
  id        serial primary key,
  event_id  integer not null references events(id) on delete cascade,
  name      text not null,
  amount    integer not null check (amount >= 0),
  status    text not null check (status in ('Paid', 'Pending')),
  note      text not null default ''
);

create table if not exists schedule_items (
  id         serial primary key,
  event_id   integer not null references events(id) on delete cascade,
  title      text not null,
  venue      text not null,
  starts_at  timestamptz not null
);

create table if not exists activity (
  id          serial primary key,
  event_id    integer not null references events(id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);
