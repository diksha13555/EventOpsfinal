# EventOps Team Guide: Data, Accounts and Where Your Code Goes

Read this before you add anything. It keeps four people from stepping on each other's work.

## 1. The idea in one minute

Think of a shared kitchen. The **database** is the pantry everyone cooks from, and the **server code** is the staff who decide who may take what. To avoid chaos:

- There is **one shared table of people** (`users`). Everyone uses it. Nobody makes a second one.
- Each person adds their own tables in **their own file**, so two people never edit the same file at the same time.
- The **server decides what a person may do**. Hiding a button in the browser is never enough.

## 2. Who owns what

- **Admin module** (`/admin`) and the shared data setup: Prince.
- **Volunteer module** (`/volunteer`): Prince.
- **Login, accounts and the entry page** (`/`): the login teammate. Owns how passwords, sessions and route protection work.
- **Participant module** (`/participant`): the participant teammate.

Fill in the names here: login ________, participant ________.

## 3. The shared `users` table

Already created. It is defined in `db/schema.d/20-users.sql`.

| Column | Meaning |
|---|---|
| `id` | Unique number. Other tables point to it. |
| `login_id` | What the person types to sign in. Lowercase, 3 to 40 characters, unique. |
| `name` | Display name. |
| `role` | Exactly one of `admin`, `volunteer`, `participant`. These words are also used in the web addresses `/admin`, `/volunteer`, `/participant`. |
| `password_hash` | **Empty for now.** The login code fills it in. A plain password must NEVER be stored. |
| `active` | `true` normally. Set to `false` to switch an account off without deleting it. |
| `created_at` | When the account was made. |

**Demo accounts** (added once, with no passwords yet): `admin` (admin), `riya`, `arjun`, `sara`, `meera`, `dev`, `kabir` (volunteers), `participant` (participant).

**Tasks now know their owner.** The `tasks` table has a new column `owner_id` that points to `users(id)`. The old text column `owner` still exists for display. The Volunteer module will use `owner_id` for "my tasks". Tasks owned by a team such as "IT desk" have no `owner_id`, which is fine.

**To add a column to `users`** (for example `email`), do NOT edit `20-users.sql`. Make a new file, for example `db/schema.d/25-login.sql`:

```sql
alter table users add column if not exists email text unique;
```

## 4. How the database setup works

The setup SQL lives in these places and is run **in this order**:

1. `db/schema.sql` (core tables) then every file in `db/schema.d/`, in file-name order.
2. `db/seed.sql` (core sample data) then every file in `db/seed.d/`, in file-name order.

So to add your own tables, **just add files. No code changes are needed.**

- `db/schema.d/30-participant.sql` for tables.
- `db/seed.d/30-participant.sql` for sample data.
- Start the name with a two-digit number. Use `20` for accounts, `30` for participant, `40` for volunteer, and so on.

**It runs by itself.** Every time the website server starts (after a deploy, or locally), it runs the setup once. New tables and columns reach the live database automatically. Locally you can also run `npm run db:setup`. `npm run db:reset` deletes all event data and loads fresh sample data. **A reset never deletes accounts.**

**Rules for your SQL files**
- **Safe to run many times.** Use `create table if not exists`, `alter table ... add column if not exists`, and for sample data, only insert when your table is empty.
- **Only add. Never drop or rename** a table or column that someone else uses.
- **Never edit another person's file.** Ask them.
- **Point to people with `users(id)`**, for example `user_id integer references users(id) on delete cascade`.
- A mistake in your file does not take the site down: the error is written to the server log and the site keeps using the tables it already has. Check the terminal after you add a file.

Example `db/schema.d/30-participant.sql`:

```sql
create table if not exists registrations (
  id          serial primary key,
  user_id     integer not null references users(id) on delete cascade,
  event_name  text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, event_name)
);
```

## 5. Where server code goes, and the pattern to copy

- **Server-only files end in `.server.ts`** (for example `src/server/event.server.ts`). They hold database code and secrets. The framework keeps them out of the browser. Never import a `.server.ts` file from a component.
- **The calls the browser can make** live in a file like `src/lib/event-api.ts`. Each one is a server function that **checks its input with zod** and returns a plain result: `{ ok: true, data }` or `{ ok: false, problem, hint }`. Copy that file's pattern. Look at `addExpenseApi` as the best example: validation, then a call into the server file.
- **Each role has its own api file and its own data.** Create `src/lib/participant-api.ts` and `src/server/participant.server.ts` (and the same for volunteer). **Do not reuse the admin store** (`src/lib/event-store.tsx`). It belongs to the admin module and loads admin-only data.
- **Always use parameters** in SQL (`$1`, `$2`), never text glued into a query.

## 6. For the login teammate

**Build these, in this order:**

1. `src/server/auth.server.ts` with:
   - `hashPassword(plain)` and `verifyPassword(plain, hash)`. Choose a standard method (bcrypt, scrypt or argon2). Never invent your own.
   - Creating, reading and clearing a **session** stored in a **secure, HTTP-only cookie** (the framework has cookie-session helpers; check its current docs).
   - `requireUser()` which returns the signed-in user or refuses, and `requireRole(...roles)` which refuses if the role is not allowed.
2. **Sign in** by `login_id` and password. Use one generic message for every failure ("Wrong ID or password"), so nobody can learn which IDs exist. Only `active = true` accounts may sign in.
3. **Entry page** at `/` (`src/routes/index.tsx`, which right now just redirects to `/admin`): role choice, ID and password, clear errors, a Register link for participants, and the demo logins box.
4. **Registration** for participants. It must create the account with the role **`participant` always**. **Never take the role from the browser.** The role of a signed-in user always comes from the session on the server.
5. **Demo accounts:** set `password_hash` for `admin`, one volunteer (`riya`) and `participant` so a teacher can try each role. (SQL cannot make a secure hash itself, so use a small script or the sign-up code.)
6. **Route protection:** in the layout routes (`src/routes/admin.tsx`, and the new `volunteer.tsx` and `participant.tsx`), use `beforeLoad` to redirect to `/` when nobody is signed in, and to the person's own module when their role does not match.
7. **Server-side checks:** every server function must call `requireRole(...)`. Protecting only the pages is not enough, because anyone can call a server function directly.
8. **Hand-over to Prince:** tell Prince when `requireRole` exists. Prince then adds it to every function in `src/lib/event-api.ts`, including **Reset demo data**, which is admin-only. **Until then the admin endpoints are open to anyone with the link.**

**Test list before you say it is done:** wrong password shows the generic error; a deactivated account cannot sign in; a Participant who types `/admin` is sent away; a Participant who calls an admin server function directly is refused; the role in a registration request is ignored; signing out really ends the session.

## 7. For the participant teammate

- Build `/participant` as its own layout and pages. Your festive styling goes here.
- Your tables go in `db/schema.d/30-participant.sql` and sample data in `db/seed.d/30-participant.sql`.
- Read the public schedule through **your own** server function (the schedule lives in the `schedule_items` table). Registrations and teams are your tables pointing to `users(id)`.
- Participants must never see internal data: tasks, budget, sponsors, issues.
- Until login is ready, build with the demo account `participant`, and use one small function (for example `getCurrentUser()`) that the login code will replace.

## 8. Getting set up on your own computer

1. Ask Prince for access to the GitHub repository. Clone it and open the folder with `package.json` in VS Code.
2. Run `npm install` (a few minutes).
3. Copy `.env.example` to `.env`. **Ask Prince privately** for a database address to put in `DATABASE_URL`. **Never commit `.env`.**
4. Run `npm run dev` and open `http://localhost:8080/admin`.
5. **Shared database warning:** everyone using the same `DATABASE_URL` writes to the same data as the live site, and a teammate's testing can change what the teacher sees. Better: create your own **Neon branch** (a private copy of the database) and use that address locally. Reset demo data restores a clean state any time.
6. If you see `getaddrinfo ENOTFOUND ...neon.tech`, your internet provider's address lookup refuses Neon. Use a phone hotspot or a VPN, or switch your computer's DNS to `8.8.8.8` and `8.8.4.4`. This only affects your own computer, never the live site.

## 9. Git rules

- **Pull before you start, push small changes often,** with clear commit messages.
- **Never commit `.env`** or paste the database address anywhere public.
- **Your git email must match your GitHub account** (`git config user.email`). Vercel's free plan blocks builds from commits it cannot match.
- **Vercel's free plan may refuse builds from other people's commits.** If your push is blocked, open a pull request and Prince merges it.
- **Do not add packages casually.** Tell the team first, because the live build must still pass.
- **Run `npm run build` before you push.** If it fails on your computer, it will fail on Vercel.

## 10. Questions to settle early

1. Which hashing method will the login code use?
2. Does a participant register with an ID they choose, or with their email? (Needs an `email` column if email.)
3. Can volunteers and admins be created only by an admin? (Recommended: yes.)
4. Who writes the demo-password script?
