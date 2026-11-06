-- Starter data. Safe to run more than once: it only adds the event if none exists.
insert into events (name, starts_at)
select 'Techfest 2026', now() + interval '4 days'
where not exists (select 1 from events);
