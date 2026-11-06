import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDbCheck } from "@/lib/db-check";

// Temporary page used to prove the website can talk to the database. Removed before the final version.
export const Route = createFileRoute("/db-check")({
  head: () => ({ meta: [{ title: "Database check — EventOps" }, { name: "robots", content: "noindex" }] }),
  loader: () => getDbCheck(),
  component: DbCheckPage,
});

function DbCheckPage() {
  const result = Route.useLoaderData();
  const router = useRouter();

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold">Database check</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A temporary page that shows whether the website can reach its database.
      </p>

      <section className="panel p-6">
        {result.ok ? (
          <>
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-success" /> Connected to the database
            </p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Database</dt>
                <dd className="font-medium">{result.database}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Server time</dt>
                <dd className="font-medium">{result.serverTime}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Answered in</dt>
                <dd className="font-medium tabular-nums">{result.latencyMs} ms</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Event stored in the database</dt>
                <dd className="font-medium">
                  {result.event ? result.event.name : "none yet (run npm run db:setup)"}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-semibold">
              <XCircle className="h-5 w-5 text-destructive" /> {result.problem}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{result.hint}</p>
          </>
        )}
        <Button variant="outline" size="sm" className="mt-5" onClick={() => router.invalidate()}>
          Check again
        </Button>
      </section>
    </main>
  );
}
