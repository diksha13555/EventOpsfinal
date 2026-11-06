// Server-only database connection. The ".server.ts" name tells the framework this file
// must never be sent to the browser, so the secret connection string stays private.
import pg from "pg";

let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL_MISSING");

  // One shared pool per server instance, kept small so a free database is never overloaded.
  pool ??= new pg.Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 20_000, // the first request after an idle period can be slow while the database wakes up
  });
  return pool;
}
