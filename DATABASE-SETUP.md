# Database setup (do this once)

**What this does.** Until now the website kept its data in the browser, so it vanished on refresh. This step connects the website to a real PostgreSQL database online, so data can be saved properly. For now it only proves the connection works. The real tables come in the next step.

Think of it like this: the website is the dining room, the database is the pantry, and the `DATABASE_URL` is the key to the pantry. Keep the key private.

---

## Part 1 — Create the free database (about 5 minutes)

1. Go to **neon.com** and sign up (free, no card needed).
2. Create a new project. Name it `EventOps`. For the region, pick the one closest to India that is offered.
3. On the project page click **Connect**.
4. Turn **Connection pooling** ON, then copy the connection string. It starts with `postgresql://`.

> The screens change over time. If a button has moved, look for the words "Connect" or "Connection string".

## Part 2 — Try it on your own computer

Open a terminal in the project folder (the one containing `package.json`).

1. Make your private settings file:
   ```
   Copy-Item .env.example .env
   ```
2. Open the new `.env` file and replace the whole line with:
   ```
   DATABASE_URL=paste-your-connection-string-here
   ```
   Save it. **Never upload this file or share it.** It is already listed in `.gitignore`, so git ignores it.
3. Install the new package (one time):
   ```
   npm install
   ```
4. Create the tables:
   ```
   npm run db:setup
   ```
   You should see: `Done. The database is ready. Events stored: Techfest 2026`. It is safe to run again any time.
5. Start the site and open the check page:
   ```
   npm run dev
   ```
   Go to `http://localhost:5173/db-check` (use the address the terminal prints). You should see a green **Connected to the database**.

## Part 3 — Put it on your live website

1. Open your project on **vercel.com**, then **Settings**, then **Environment Variables**.
2. Add a variable named `DATABASE_URL` and paste the same connection string as the value. Tick Production (and Preview if offered). Save.
3. Send your code to GitHub so Vercel rebuilds:
   ```
   git add .
   git commit -m "Add database connection check"
   git push
   ```
   Before pushing, run `git status` and make sure **`.env` is not listed**.
4. When Vercel finishes deploying, open `https://event-ops-xejb.vercel.app/db-check`.
   If you added the variable after the deploy finished, press **Redeploy** on the latest deployment, because new variables only apply to new deployments.

When the live page shows the green message, the website and the database are connected in the real world, and the hardest unknown is solved.

---

## The real tables (Step 5B)

The dashboard now saves everything in the database, so a task you move stays moved after a refresh, on any device.

- **Nothing to set up by hand.** The first time the website loads data, it creates any missing tables and adds the sample data by itself. On Vercel, just push your code and open the site. The very first load can take 10 to 20 seconds (the free database wakes up and the tables are created). After that it is fast.
- **Your changes are never wiped by that setup.** It only adds what is missing.
- **Reset button.** On the Overview page, "Reset demo data" deletes all event data and loads fresh sample data, with dates counted from today. Use it before a demo. It asks you to confirm.
- **On your own computer** (needs the phone hotspot if your router refuses to look up Neon), two optional commands:
  - `npm run db:setup` creates what is missing (safe to repeat).
  - `npm run db:reset` deletes ALL event data and loads fresh sample data.

---

## Accounts and team tables

- The shared **`users`** table (accounts and roles) is created automatically, together with a few demo accounts. It is defined in `db/schema.d/20-users.sql`.
- **Each teammate adds their own tables in their own file**, so nobody edits the same file:
  `db/schema.d/30-participant.sql` for tables and `db/seed.d/30-participant.sql` for sample data. No code changes are needed, and the files run in file-name order.
- The setup runs by itself whenever the website server starts, so new tables reach the live database after a deploy.
- **Reset demo data never deletes accounts.**
- Full rules and examples are in `docs/TEAM-GUIDE.md`.

---

## If the page shows a red message

| Message | What to do |
|---|---|
| The server has no DATABASE_URL | Locally: check the `.env` file and restart `npm run dev`. On Vercel: add the variable, then redeploy. |
| The database refused the username or password | Copy the connection string from Neon again and paste the whole thing. |
| Could not reach the database server | Check the string for typos. Wait a few seconds and press "Check again", because the database may still be waking up. |
| Connected, but the tables do not exist yet | The website normally creates them by itself. If this message stays, run `npm run db:setup` once. |
| Something unexpected | Look at the terminal (local) or Vercel **Logs** (live) for details, and share them with the team. |

## Good to know

- After a quiet period the first request can take a few seconds while the free database wakes up. This is normal.
- The `/db-check` page is temporary and will be removed in the final version.
- Free plans change. Check Neon's pricing page for the current limits.
