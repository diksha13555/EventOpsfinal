-- Tables for EventOps. Safe to run more than once.
create table if not exists events (
  id          serial primary key,
  name        text not null,
  starts_at   timestamptz not null,
  created_at  timestamptz not null default now()
);
