import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_META } from "@/lib/auth-types";
import { countdown } from "@/lib/event-selectors";
import { useSession } from "@/lib/session";
import { usePortalHome } from "@/lib/use-portal-home";

// Participants see only the public side of the fest, in bigger type.
export function ParticipantHome() {
  const { state } = useSession();
  const user = state.status === "ready" ? state.user : null;
  const { data, error, now, reload } = usePortalHome();

  if (error)
    return (
      <section className="panel mx-auto max-w-xl p-6" role="alert">
        <p className="text-lg font-semibold">{error.problem}</p>
        <p className="mt-2 text-muted-foreground">{error.hint}</p>
        <Button variant="outline" className="mt-5" onClick={() => void reload()}>
          Try again
        </Button>
      </section>
    );

  if (!data || !now)
    return (
      <div aria-hidden className="grid gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  const ms = data.eventStart - now;
  const c = countdown(Math.max(ms, 0));
  const upcoming = data.schedule.filter((s) => s.at >= now);

  return (
    <div className="grid gap-5">
      <section
        className="rounded-2xl p-6 text-white sm:p-8"
        style={{ backgroundColor: ROLE_META.participant.solid }}
      >
        <p className="text-base text-white/85">Welcome, {user?.name ?? "friend"}</p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{data.eventName}</h1>
        <p className="mt-4 font-display text-2xl font-bold tabular-nums sm:text-3xl">
          {ms > 0 ? `Opens in ${c.days > 0 ? `${c.days} ${c.days === 1 ? "day" : "days"} ` : ""}${c.hours}h ${c.minutes}m` : "Happening now"}
        </p>
      </section>

      <section className="panel p-6">
        <h2 className="mb-5 text-xl font-semibold">Schedule</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">Nothing left on the schedule.</p>
        ) : (
          <ol className="grid gap-4">
            {upcoming.map((item) => (
              <li key={item.id} className="flex items-start gap-4">
                <p className="w-28 shrink-0 text-base font-semibold tabular-nums">
                  {new Date(item.at).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-medium leading-snug">{item.title}</p>
                  <p className="text-muted-foreground">{item.venue}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel flex items-start gap-4 p-6">
        <Ticket aria-hidden className="mt-1 h-6 w-6 shrink-0" style={{ color: ROLE_META.participant.solid }} />
        <div>
          <h2 className="text-xl font-semibold">Registration and teams</h2>
          <p className="mt-1 text-muted-foreground">
            Event registration and team forming are not open yet. They will appear here.
          </p>
        </div>
      </section>
    </div>
  );
}
