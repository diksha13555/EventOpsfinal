import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { EVENT_NAME } from "@/lib/event-data";
import { attentionItems, countdown, readinessBreakdown } from "@/lib/event-selectors";
import { useEventStore } from "@/lib/event-store";
import { useCountUp } from "@/lib/use-count-up";
import { StatusDot } from "./admin-ui";

function ReadinessRing({ value }: { value: number }) {
  const shown = useCountUp(value);
  const r = 64;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-4xl font-bold tabular-nums">{Math.round(shown)}%</p>
        <p className="text-xs font-medium text-muted-foreground">Ready</p>
      </div>
    </div>
  );
}

function Countdown({ ms }: { ms: number }) {
  const { days, hours, minutes } = countdown(ms);
  const parts = [
    { label: "days", value: days },
    { label: "hours", value: hours },
    { label: "min", value: minutes },
  ];
  return (
    <div className="flex items-center gap-2">
      {parts.map((p) => (
        <div key={p.label} className="w-16 rounded-md border border-border bg-background py-1.5 text-center">
          <p className="font-display text-2xl font-bold leading-none tabular-nums">{p.value}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {p.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function MissionBrief() {
  const { state, now } = useEventStore();
  const score = readinessBreakdown(state);
  const items = attentionItems(state, now);
  const urgent = items.filter((i) => i.tone === "danger").length;
  const shown = items.slice(0, 5);
  const msToStart = state.eventStart - now;
  const live = msToStart <= 0;

  const parts = [
    { label: "Tasks", value: score.tasks },
    { label: "Bookings", value: score.bookings },
    { label: "Issues", value: score.issues },
    { label: "Budget", value: score.budget },
  ];

  return (
    <section className="panel mb-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Mission brief</p>
          <h2 className="text-xl font-bold">{EVENT_NAME}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {live
              ? "The event is live."
              : `Opens ${new Date(state.eventStart).toLocaleString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}`}
          </p>
        </div>
        {live ? (
          <p className="flex items-center gap-2 text-sm font-semibold">
            <StatusDot tone="success" /> Live now
          </p>
        ) : (
          <Countdown ms={msToStart} />
        )}
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[250px_1fr]">
        <div className="flex flex-col items-center gap-5">
          <ReadinessRing value={score.total} />
          <div className="grid w-full gap-2.5">
            {parts.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="font-medium tabular-nums">{p.value}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700"
                    style={{ width: `${p.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold">Needs your attention</h3>
            {items.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {urgent} urgent · {items.length - urgent} to watch
              </p>
            )}
          </div>

          {items.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> All clear. Nothing needs you right now.
            </p>
          ) : (
            <ul className="grid gap-2">
              {shown.map((i) => (
                <li key={i.id}>
                  <Link
                    to={i.to}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <StatusDot tone={i.tone} className="mt-1.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">{i.title}</span>
                      <span className="block text-xs text-muted-foreground">{i.detail}</span>
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
              {items.length > shown.length && (
                <li className="px-1 text-xs text-muted-foreground">
                  + {items.length - shown.length} more to watch
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
