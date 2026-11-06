// Creates the tables and adds the starter data.   Run with:  npm run db:setup
import { existsSync, readFileSync } from "node:fs";
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

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30_000 });

try {
  await client.connect();
  await client.query("begin");
  await client.query(readFileSync("db/schema.sql", "utf8"));
  await client.query(readFileSync("db/seed.sql", "utf8"));
  await client.query("commit");
  const { rows } = await client.query("select name from events order by id");
  console.log(`Done. The database is ready. Events stored: ${rows.map((r) => r.name).join(", ")}`);
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("Setup failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
