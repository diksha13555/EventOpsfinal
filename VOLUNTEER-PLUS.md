# Volunteer module, part 3: four additions

## 1. Calendar date picker (Administrator, Assign work)
The "Due date" box in **Volunteers > Assign work** is now a calendar pop-up. Click it, click a day, done.
- Past days are greyed out. **Today** and **Tomorrow** shortcuts sit under the calendar, and **Clear date** removes it.
- It uses the packages you already have (react-day-picker and Radix popover), coloured with your theme.
- It is a reusable piece: `src/components/date-picker.tsx`. To use it elsewhere (for example the Task board's
  New task box), replace the `<input type="date" ...>` with
  `<DatePicker value={due} onChange={setDue} label="Due date" />`.

## 2. Check in / check out (Volunteer)
- A card at the top of `/volunteer`: **Check in** when you arrive, **Check out** when you leave.
- While on duty it shows the running time of this shift and anything worked earlier today.
- The database allows only one open shift per volunteer, so a double tap cannot create two.
- The administrator sees it on **Volunteers** (green "On duty · 2h 10m", or "Off duty · worked 3h 05m today") and
  as an "On duty" badge on Overview. Recent activity logs "Riya checked in" and "Riya checked out after 3h 05m".
- "Today" means today in India time.

## 3. Report an issue (Volunteer)
- **Issues I reported** panel with a **Report an issue** button (what happened + severity).
- It appears in the administrator's **Issues** list and the Overview "Live issues" count within 30 seconds, and
  Recent activity says who reported it.
- When the administrator presses Resolve, the volunteer's list changes from Open to Resolved.

## 4. Venues and gear (Volunteer)
- A read-only **Venues and gear** panel showing each venue or item with its status (Booked, Pending, Conflict, Free),
  so a volunteer knows what is ready. Volunteers cannot change bookings. Participants do not see this panel.

## How to try it (about 4 minutes)
1. Admin: **Volunteers > Assign work**. Click the Due date box and pick a day from the calendar.
2. Sign in as the volunteer (volunteer@eventops.demo / Crew@2026). Press **Check in**.
3. Press **Report an issue**, type something, send it. Look at Venues and gear.
4. Sign in as admin: Volunteers shows Riya "On duty"; Issues has the new issue; Recent activity shows both.
5. Resolve the issue as admin, then look at the volunteer screen: it now says Resolved.

## Good to know
- Two small database additions (a shifts table and a "reported by" column on issues) are made by the site itself on
  the first load after deploying. Nothing is deleted.
- Still not built: shift time slots (planned start and end), and a volunteer-side "add a note" to a task.
