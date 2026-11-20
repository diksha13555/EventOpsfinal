import { XCircle } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_HOME, type Role } from "@/lib/auth-types";
import { useSession } from "@/lib/session";

/*
  Keeps people out of the wrong module: signed out goes to the entry page, and another role's address
  goes to that person's own module. This only decides what the browser shows. The real protection is on
  the server, which checks the role again on every call and refuses anything that is not allowed.
*/
export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { state, retry } = useSession();
  const user = state.status === "ready" ? state.user : null;

  useEffect(() => {
    if (state.status !== "ready") return;
    if (!user) window.location.replace("/");
    else if (user.role !== role) window.location.replace(ROLE_HOME[user.role]);
  }, [state.status, user, role]);

  if (state.status === "ready" && user?.role === role) return <>{children}</>;

  if (state.status === "error")
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <section className="panel max-w-md p-6" role="alert">
          <p className="flex items-center gap-2 font-semibold">
            <XCircle className="h-5 w-5 text-destructive" /> {state.problem}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{state.hint}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={retry}>
            Try again
          </Button>
        </section>
      </div>
    );

  // Checking who is signed in, or about to be sent somewhere else.
  return (
    <div aria-hidden className="min-h-screen bg-background p-6">
      <div className="mx-auto grid max-w-5xl gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
