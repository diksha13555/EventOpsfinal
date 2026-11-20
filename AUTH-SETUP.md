# Login and the three modules (Step 5C, part 1)

**What this adds.** A real entry page at `/`. Each person signs in with an email and password and is sent to
their own module: Administrator to `/admin`, Volunteer to `/volunteer`, Participant to `/participant`.
Participants can create their own account at `/register`. No new packages, so no `npm install` is needed.

## How it works (plain version)

- **Passwords are never stored.** The database keeps a salted scrypt hash. Not even the team can read a password.
- **Signing in** gives the browser a random key in a secure cookie (`eventops_session`, valid 7 days, hidden from
  page scripts). The database stores only a fingerprint of that key. Signing out deletes it.
- **The server is the guard, not the buttons.** Every server call checks who is asking. Calls that change event
  data are Administrator-only: a Volunteer or Participant who calls them directly is refused. The screens also
  redirect people away from the wrong module, but that is only for looks.
- **Role choice on the entry page.** The pass you pick must match the account. A right password with the wrong
  pass shows "This is a Volunteer account" with a button to switch. A wrong email or password never says which
  of the two was wrong.
- **Too many wrong passwords** (5) pauses that account for 10 minutes.

## Demo logins (for the teacher)

| Role | Email | Password |
|---|---|---|
| Administrator | admin@eventops.demo | Admin@2026 |
| Volunteer | volunteer@eventops.demo | Crew@2026 |
| Participant | participant@eventops.demo | Guest@2026 |

They are created automatically the first time anyone signs in (or by `npm run db:setup`). The volunteer is named
**Riya**, so "My tasks" shows the tasks whose owner is Riya. Anyone who knows these can reset the demo data, so
before real use add `DEMO_ACCOUNTS=off` in Vercel and delete the three accounts. With that variable set, the demo box
disappears from the entry page too.

## What each module has right now

| Module | Today | Still to build |
|---|---|---|
| Administrator | Everything it had, now behind login, with the user's name and a sign-out button | Page to create volunteers (the server call `createUserApi` already exists) |
| Volunteer | My tasks with "Mark done" (shows up in the admin Recent activity), schedule | My bookings, report an issue, full shift view |
| Participant | Welcome, countdown, schedule | Register for events, form a team, announcements |

Volunteers and participants can never receive budget or sponsor data: they use their own small server calls
(`src/lib/portal-api.ts`), not the admin ones.

## If something goes wrong

| Message | What to do |
|---|---|
| Could not reach the database server | Wait a few seconds and try again. The free database may be waking up. |
| The server has no DATABASE_URL | Same fix as before: `.env` locally, or Vercel Environment Variables, then redeploy. |
| Build error mentioning `@tanstack/react-start/server` | Send the exact error to the team. The cookie helpers come from that package. |
| "You are signed out" inside the admin pages | The 7-day session ended. Sign in again. |
| Locked out of an account | Wait 10 minutes. |

## Good to know

- Signing in and out reloads the whole page on purpose, so nothing from the previous person stays in memory.
- The first sign-in after a quiet period can take 10 to 20 seconds (database wakes up). The page tells the user.
- Your existing event data is untouched. `npm run db:reset` and the Reset button never delete accounts.
