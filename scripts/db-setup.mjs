// Creates the tables and adds the starter data.
//   npm run db:setup    creates what is missing and adds sample data if the database is empty
//   npm run db:reset    deletes ALL event data and loads fresh sample data (dates counted from today)
// Accounts (users) are never deleted by either command. Demo accounts are added if missing,
// unless DEMO_ACCOUNTS=off is set.
import { randomBytes, scrypt } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";
import pg from "pg";

// Read DATABASE_URL from the .env file if it is not already set (no extra package needed).
if (!process.env.DATABASE_URL && existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Copy .env.example to .env and paste your Neon connection string into it.");
  process.exit(1);
}

// Same format as src/server/password.server.ts:  scrypt$<salt>$<key>
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await promisify(scrypt)(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

// Keep in step with DEMO_ACCOUNTS in src/lib/auth-types.ts.
const demoAccounts = [
  { role: "admin", name: "Event Admin", email: "admin@eventops.demo", password: "Admin@2026" },
  { role: "volunteer", name: "Riya", email: "volunteer@eventops.demo", password: "Crew@2026" },
  { role: "participant", name: "Aarav", email: "participant@eventops.demo", password: "Guest@2026" },
];

const reset = process.argv.includes("--reset");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30_000 });

try {
  await client.connect();
  await client.query("begin");
  await client.query(readFileSync("db/schema.sql", "utf8"));
  if (reset) await client.query(readFileSync("db/reset.sql", "utf8"));
  await client.query(readFileSync("db/seed.sql", "utf8"));
  if (process.env.DEMO_ACCOUNTS !== "off") {
    for (const a of demoAccounts) {
      await client.query(
        `insert into users (name, email, password_hash, role) values ($1, $2, $3, $4) on conflict (email) do nothing`,
        [a.name, a.email, await hashPassword(a.password), a.role],
      );
    }
  }
  await client.query("commit");

  const count = async (table) => (await client.query(`select count(*)::int as n from ${table}`)).rows[0].n;
  const parts = [];
  for (const t of ["tasks", "resources", "issues", "budget_categories", "expenses", "sponsors", "schedule_items", "activity", "users"])
    parts.push(`${t}: ${await count(t)}`);
  console.log(`Done. The database is ready${reset ? " (all data was reset)" : ""}.`);
  console.log(parts.join(" | "));
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("Setup failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
