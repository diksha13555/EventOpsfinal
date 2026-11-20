# Volunteer module, part 4: task notes and planned shifts

## 1. Task notes (volunteer and administrator)
- Under every task on the volunteer screen there is **Add a note** (or **Notes (2)** once there are some).
  Press it, type, **Post**. The volunteer can write on any of their own tasks, including blocked ones.
- On the administrator's **Volunteers** page the same thread sits under each task. The administrator can
  read the volunteer's notes and reply. The volunteer sees the reply on their screen within 30 seconds.
- Administrator notes are marked "(admin)". Each note shows who wrote it and how long ago.
- Recent activity on Overview logs "Note on <task> by Riya", so the administrator knows to look.
- Notes are plain text, up to 500 characters. A volunteer can only write on their own tasks (the server checks).

## 2. Planned shifts (administrator plans, volunteer sees)
- **Volunteers > Plan a shift**: choose the volunteer, pick the day from the calendar, choose start and end
  times (every half hour), and optionally where (for example "Main gate").
- The shift shows as a small tag on that volunteer's card, with an X to remove it.
- The volunteer gets a **My shifts** panel with each shift marked **On now**, **Next** or **Finished**. While a shift is
  on, their check-in card says "Your shift is on now (...). Check in when you reach <place>."
- The administrator is warned if a shift has started and the volunteer has not checked in: an orange
  "Shift started, not checked in" badge on the Volunteers page and "Not checked in" on Overview.
- A shift cannot end before it starts, cannot be longer than 16 hours, and cannot overlap another shift for the
  same volunteer. For a night shift, plan two shifts (one up to midnight, one after).
- Planned shifts and check-ins are separate on purpose: the plan says when they should be there, the
  check-in says when they really were.

## How to try it (about 4 minutes)
1. Admin: **Volunteers > Plan a shift**. Choose Riya, pick today from the calendar, set a start a few minutes ago
   and an end a few hours from now, add "Main gate", press Plan shift.
2. The Volunteers page shows an orange "Shift started, not checked in" next to Riya, and Overview shows "Not checked in".
3. Sign in as the volunteer (volunteer@eventops.demo / Crew@2026). **My shifts** shows "On now" and the check-in
   card mentions Main gate. Press **Check in**.
4. Press **Add a note** on a task, write "Need two more chairs", Post.
5. Sign in as admin. Open Volunteers: Riya shows "On duty", the orange warning is gone, and the task's
   Notes (1) opens to her message. Reply "On the way". Back on the volunteer screen the reply appears.

## Good to know
- Two new database tables (task notes, shift slots) are created by the site itself on the first load after
  deploying. Nothing is deleted. "Reset demo data" removes notes with the tasks they belong to, but keeps planned shifts.
- Shift times use the device's clock and timezone, so the administrator and volunteers should be on India time.
- Not built yet: telling a volunteer by sound or message when a note arrives (they see it on the next refresh), and
  a printable shift roster.
