-- Starter data. Safe to run more than once: it does nothing if tasks already exist.
-- All dates are counted from today (India time), so the demo always looks current.
do $$
declare
  ev       integer;
  start_ts timestamptz := ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '4 days 9 hours') at time zone 'Asia/Kolkata');
  today    date := (now() at time zone 'Asia/Kolkata')::date;
  cat      integer;
begin
  if exists (select 1 from tasks) then
    return;
  end if;

  select id into ev from events order by id limit 1;
  if ev is null then
    insert into events (name, starts_at) values ('Techfest 2026', start_ts) returning id into ev;
  else
    update events set name = 'Techfest 2026', starts_at = start_ts where id = ev;
  end if;

  insert into tasks (event_id, title, owner, due, priority, status) values
    (ev, 'Print sponsor standees',             'Riya',   today + 3, 'Medium', 'Backlog'),
    (ev, 'Book shuttle vans',                  'Arjun',  today + 2, 'Low',    'Backlog'),
    (ev, 'Order volunteer T-shirts',           'Sara',   today + 2, 'Medium', 'Backlog'),
    (ev, 'Stage lighting rig plan',            'Meera',  today - 1, 'High',   'In Progress'),
    (ev, 'Judge invites round 2',              'Dev',    today + 1, 'Medium', 'In Progress'),
    (ev, 'Finalise hackathon problem statements', 'Kabir', today + 2, 'High', 'In Progress'),
    (ev, 'Wi-Fi uplink approval',              'IT desk', today + 1, 'High',  'Blocked'),
    (ev, 'Registration portal live',           'Kabir',  today - 6, 'Low',    'Done'),
    (ev, 'Food stall contracts',               'Sara',   today - 7, 'Low',    'Done'),
    (ev, 'Sound vendor confirmed',             'Arjun',  today - 5, 'Medium', 'Done'),
    (ev, 'Poster design approved',             'Riya',   today - 4, 'Low',    'Done'),
    (ev, 'Sponsor logos collected',            'Riya',   today - 3, 'Low',    'Done'),
    (ev, 'Volunteer roster v1',                'Meera',  today - 3, 'Medium', 'Done'),
    (ev, 'Medical desk arranged',              'Dev',    today - 2, 'Medium', 'Done');

  insert into resources (event_id, name, kind, slot, status) values
    (ev, 'Main Auditorium', 'venue', 'Fri 09:00 – 18:00', 'Booked'),
    (ev, 'Open Air Ground', 'venue', 'Sat 16:00 – 23:00', 'Conflict'),
    (ev, 'Lab Block C',     'venue', 'Sat 08:00 – 20:00', 'Free'),
    (ev, 'Sound System A',  'gear',  'Fri – Sun',         'Booked'),
    (ev, 'LED Wall 12ft',   'gear',  'Sat only',          'Pending'),
    (ev, 'Seminar Hall 2',  'venue', 'Sun 10:00 – 14:00', 'Free');

  insert into issues (event_id, title, severity, status, created_at) values
    (ev, 'Generator backup missing at Ground', 'High',   'Open', now() - interval '20 hours'),
    (ev, 'Volunteer badges misprinted',        'Medium', 'Open', now() - interval '8 hours'),
    (ev, 'Green room AC noisy',                'Low',    'Open', now() - interval '3 hours');

  insert into budget_categories (event_id, head, planned_amount) values (ev, 'Stage & Sound', 200000) returning id into cat;
  insert into expenses (category_id, amount, note, spent_on) values
    (cat, 90000, 'Stage rental advance',  today - 12),
    (cat, 58000, 'Lighting rig deposit',  today - 6);

  insert into budget_categories (event_id, head, planned_amount) values (ev, 'Hospitality', 120000) returning id into cat;
  insert into expenses (category_id, amount, note, spent_on) values
    (cat, 40000, 'Catering advance',      today - 10),
    (cat, 22000, 'Volunteer meals',       today - 4);

  insert into budget_categories (event_id, head, planned_amount) values (ev, 'Marketing', 60000) returning id into cat;
  insert into expenses (category_id, amount, note, spent_on) values
    (cat, 26000, 'Posters and standees',  today - 9),
    (cat, 15000, 'Social media ads',      today - 5);

  insert into budget_categories (event_id, head, planned_amount) values (ev, 'Prizes', 150000) returning id into cat;
  insert into expenses (category_id, amount, note, spent_on) values
    (cat, 70000, 'Cash prizes',           today - 8),
    (cat, 20000, 'Trophies',              today - 3);

  insert into sponsors (event_id, name, amount, status, note) values
    (ev, 'Lumen Energy', 250000, 'Paid',    ''),
    (ev, 'Pulse Audio',  170000, 'Paid',    ''),
    (ev, 'Metro Eats',    64000, 'Pending', 'Due Friday');

  insert into schedule_items (event_id, title, venue, starts_at) values
    (ev, 'Opening ceremony',          'Main Auditorium', start_ts),
    (ev, '24-hour hackathon kickoff', 'Lab Block C',     start_ts + interval '2 hours'),
    (ev, 'Sponsor expo opens',        'Seminar Hall 2',  start_ts + interval '6 hours'),
    (ev, 'Cultural night',            'Open Air Ground', start_ts + interval '31 hours');

  insert into activity (event_id, text, created_at) values
    (ev, 'Medical desk arranged moved to Done',              now() - interval '2 hours'),
    (ev, 'Wi-Fi uplink approval moved to Blocked',           now() - interval '5 hours'),
    (ev, 'Issue logged: Generator backup missing at Ground', now() - interval '20 hours');
end $$;
