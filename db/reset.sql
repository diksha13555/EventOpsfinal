-- Deletes ALL event data and restarts the id numbers. Always followed by seed.sql.
truncate table activity, schedule_items, sponsors, expenses, budget_categories,
               issues, resources, tasks, events restart identity cascade;
