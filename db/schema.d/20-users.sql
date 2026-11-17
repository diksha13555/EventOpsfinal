-- The ONE shared accounts table. Admin, Volunteer and Participant modules all use it.
-- Safe to run more than once. To add columns, make a NEW file (for example
-- db/schema.d/25-login.sql) with:  alter table users add column if not exists ...
create table if not exists users (
  id             serial primary key,
  login_id       text not null unique check (login_id = lower(login_id) and length(login_id) between 3 and 40),
  name           text not null,
  role           text not null check (role in ('admin', 'volunteer', 'participant')),
  password_hash  text,                                 -- stays empty until the login code sets it. NEVER store a plain password.
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Lets a task point to the person who owns it (the old text name stays for display).
alter table tasks add column if not exists owner_id integer references users(id) on delete set null;
