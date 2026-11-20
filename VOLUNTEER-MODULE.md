# Volunteer module (Step 5C, part 2)

**The loop.** An administrator gives a volunteer work. The volunteer starts it, finishes it, or says what is
blocking them. The administrator sees every change, and the admin task board and Overview update by themselves.

## What each side can do

**Administrator** (new page: **Volunteers** in the sidebar, plus a panel on Overview)
- Add a volunteer account (name, email, starting password to share with them).
- Assign work: a new task straight to a volunteer, or hand an existing task to one (or take it back).
- See each volunteer's progress bar, every task with its status, who is blocked and why, and when it last changed.
- The Task board now shows the blocked reason on the card. It and the Overview refresh every 30 seconds, so a
  volunteer's change appears without reloading. Recent activity shows lines like
  "Stage lighting rig plan moved to Done by Riya".

**Volunteer** (`/volunteer`)
- Sees only their own work, grouped: in progress, blocked, to do. Finished work is tucked under "finished".
- Buttons depend on the task: **Start**, **Mark done**, **I'm blocked** (asks for a short reason), **Resume**.
- New work from an administrator appears within 30 seconds.
- Cannot reopen finished work, touch other people's tasks, or see budget and sponsors. The server refuses all of
  that, even if someone calls it by hand.

## Status words

| Volunteer sees | Board shows | Meaning |
|---|---|---|
| To do | Backlog | assigned, not started |
| In progress | In Progress | started |
| Blocked | Blocked | stuck, with a reason |
| Done | Done | finished |

## How to try it (about 3 minutes)

1. Sign in as admin, open **Volunteers**. Riya (the demo volunteer) already has her sample tasks.
2. Press **Assign work**: pick Riya, type a task, press Assign.
3. Sign out. Sign in as the volunteer (volunteer@eventops.demo / Crew@2026). The new task is there.
4. Press **Start** on it, then **I'm blocked** on another one and type a reason.
5. Sign out, sign in as admin. Volunteers page shows Riya's blocked task with the reason. Overview shows
   "1 blocked" next to her name, and Recent activity lists what she did.
6. To add a second volunteer: **Add volunteer**, then sign in as them with the Volunteer pass.

## Good to know

- The database gets three new columns on tasks (assignee, note, updated time). The site adds them by itself on
  the first load after you deploy; that first load can take a few seconds. Nothing is deleted.
- Old sample tasks owned by a name (Riya, Arjun…) still show for a volunteer whose name matches. Once you assign
  a task to an account, the account is what counts.
- "Reset demo data" does not delete volunteer accounts. After a reset Riya's sample tasks come back.
- Starting passwords are set by the administrator. There is no "change password" screen yet.
- Not built yet (the plan lists them): volunteer bookings, reporting an issue from the volunteer screen, and
  shifts or time slots.
