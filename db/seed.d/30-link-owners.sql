-- Connects each task's owner NAME to the matching user (only tasks that are not linked yet).
-- Runs every time and is harmless to repeat.
update tasks t
   set owner_id = u.id
  from users u
 where t.owner_id is null
   and lower(u.name) = lower(t.owner);
