import { createServerFn } from "@tanstack/react-start";

export type DbCheck =
  | { ok: true; database: string; serverTime: string; latencyMs: number; event: { name: string; startsAt: string } | null }
  | { ok: false; problem: string; hint: string };

// Runs on the server only. The browser just receives the small result object below,
// never the connection string or any error details.
export const getDbCheck = createServerFn({ method: "GET" }).handler(async (): Promise<DbCheck> => {
  const { getPool } = await import("../server/db.server");
  const started = Date.now();

  try {
    const pool = getPool();
    const info = await pool.query<{ database: string; now: Date }>(
      "select current_database() as database, now() as now",
    );
    const events = await pool.query<{ name: string; starts_at: Date }>(
      "select name, starts_at from events order by id limit 1",
    );
    const row = events.rows[0];
    const meta = info.rows[0];
    if (!meta) throw new Error("EMPTY_RESULT");
    return {
      ok: true,
      database: meta.database,
      serverTime: meta.now.toISOString(),
      latencyMs: Date.now() - started,
      event: row ? { name: row.name, startsAt: row.starts_at.toISOString() } : null,
    };
  } catch (err) {
    console.error("[db-check] failed:", err); // full details stay in the server log only
    const e = err as { message?: string; code?: string };

    if (e.message === "DATABASE_URL_MISSING")
      return {
        ok: false,
        problem: "The server has no DATABASE_URL.",
        hint: "Locally: put it in the .env file and restart npm run dev. On Vercel: add it under Settings, Environment Variables, then redeploy.",
      };
    if (e.code === "42P01")
      return {
        ok: false,
        problem: "Connected to the database, but the tables do not exist yet.",
        hint: "Run npm run db:setup once to create them.",
      };
    if (e.code === "28P01" || e.code === "28000")
      return {
        ok: false,
        problem: "The database refused the username or password.",
        hint: "Copy the connection string from Neon again and paste the whole thing into DATABASE_URL.",
      };
    if (e.code === "ENOTFOUND" || e.code === "ECONNREFUSED" || e.code === "ETIMEDOUT" || e.code === "ECONNRESET")
      return {
        ok: false,
        problem: "Could not reach the database server.",
        hint: "Check the host name in DATABASE_URL, and try again in a few seconds in case the database is still waking up.",
      };
    return {
      ok: false,
      problem: "Something unexpected went wrong talking to the database.",
      hint: "Check the server log (terminal or Vercel Logs) for the details.",
    };
  }
});
