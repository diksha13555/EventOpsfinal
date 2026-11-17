-- Gives every task a place in its column (1, 2, 3...). Runs every time but only touches tasks
-- that have no position yet, so it never reorders cards someone has already arranged.
update tasks t
   set position = r.rn
  from (select id, row_number() over (partition by status order by id) as rn from tasks) r
 where t.id = r.id
   and t.position is null;
