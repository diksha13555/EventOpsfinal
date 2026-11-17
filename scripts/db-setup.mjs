// Creates the tables and adds the starter data.
//   npm run db:setup    creates what is missing and adds sample data if the database is empty
//   npm run db:reset    deletes ALL event data and loads fresh sample data (dates counted from today)
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

// Core file first, then every file in the ".d" folder in file-name order (same rule as the website).
const sqlFor = (name) => {
  const dir = `db/${name}.d`;
  const extra = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(`${dir}/${f}`, "utf8"))
    : [];
  return [readFileSync(`db/${name}.sql`, "utf8"), ...extra].join("\n");
};

const reset = process.argv.includes("--reset");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30_000 });

try {
  await client.connect();
  await client.query("begin");
  await client.query(sqlFor("schema"));
  if (reset) await client.query(readFileSync("db/reset.sql", "utf8"));
  await client.query(sqlFor("seed"));
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
