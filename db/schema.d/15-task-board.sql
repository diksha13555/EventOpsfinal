-- Task board: where a card sits in its column, and why a task is blocked. Safe to run more than once.
alter table tasks add column if not exists position integer;
alter table tasks add column if not exists blocked_reason text not null default '';
