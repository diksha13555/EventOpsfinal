import { CheckCircle2, ClipboardCheck, Clock, IndianRupee } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EVENT_NAME } from "@/lib/event-data";
import { countdown, quickStats, timeAgo } from "@/lib/event-selectors";
import { useEventStore } from "@/lib/event-store";
import { PageHeader, StatusBadge, StatusDot, type Tone } from "./admin-ui";
import { MissionBrief } from "./mission-brief";

const runSheet = [
  { label: "Main auditorium unlocked", done: true },
  { label: "Sound lab patch verified", done: true },
  { label: "Gate scanners connected", done: true },
  { label: "Green room stocked", done: false },
];

const sponsors: { name: string; state: string; tone: Tone }[] = [
  { name: "Lumen Energy", state: "Paid", tone: "success" },
  { name: "Pulse Audio", state: "Paid", tone: "success" },
  { name: "Metro Eats", state: "Due Friday", tone: "warning" },
];

export function Overview() {
  const { state, now } = useEventStore();
  const [dialog, setDialog] = useState<null | "runsheet" | "sponsors">(null);
  const [checks, setChecks] = useState(runSheet.map((r) => r.done));
  const close = (isOpen: boolean) => {
    if (!isOpen) setDialog(null);
  };

  const q = quickStats(state);
  const stats: { label: string; value: string; tone: Tone }[] = [
    { label: "Open tasks", value: String(q.openTasks), tone: "neutral" },
    {
      label: "Bookings confirmed",
      value: `${q.bookingsConfirmed}/${q.bookingsAsked}`,
      tone: q.conflicts > 0 ? "warning" : "success",
    },
    { label: "Live issues", value: String(q.liveIssues), tone: q.liveIssues > 0 ? "danger" : "success" },
    { label: "Budget used", value: `${q.budgetPct}%`, tone: q.budgetPct >= 85 ? "warning" : "neutral" },
  ];

  const upcoming = state.schedule.filter((s) => s.at >= now).sort((a, b) => a.at - b.at).slice(0, 4);
  const next = upcoming[0];

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${EVENT_NAME} — where things stand right now.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialog("runsheet")}>
              <ClipboardCheck /> Friday run-sheet
            </Button>
            <Button variant="outline" onClick={() => setDialog("sponsors")}>
              <IndianRupee /> Sponsor pulse
            </Button>
          </div>
        }
      />

      <MissionBrief />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <StatusDot tone={s.tone} /> {s.label}
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-4 text-base font-semibold">Coming up</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <ol className="grid gap-3">
              {upcoming.map((item) => {
                const c = countdown(item.at - now);
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <p className="w-24 shrink-0 text-sm font-medium tabular-nums">
                      {new Date(item.at).toLocaleString("en-IN", {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.venue}</p>
                    </div>
                    {item.id === next?.id && (
                      <StatusBadge tone="info">
                        in {c.days > 0 ? `${c.days}d ` : ""}
                        {c.hours}h
                      </StatusBadge>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="mb-4 text-base font-semibold">Recent activity</h2>
          <ul className="grid gap-3">
            {state.activity.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <StatusDot tone="neutral" className="mt-1.5" />
                <p className="min-w-0 flex-1 text-sm leading-snug">{a.text}</p>
                <p className="shrink-0 text-xs text-muted-foreground">{timeAgo(now - a.at)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Dialog open={dialog === "runsheet"} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Friday run-sheet</DialogTitle>
            <DialogDescription>Venue checks before the gates open.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {runSheet.map((r, idx) => (
              <button
                key={r.label}
                type="button"
                aria-pressed={checks[idx]}
                onClick={() => setChecks((c) => c.map((v, i) => (i === idx ? !v : v)))}
                className="flex items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-accent"
              >
                {checks[idx] ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{r.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "sponsors"} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sponsor pulse</DialogTitle>
            <DialogDescription>Current commitments and payment status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-4">
                <p className="text-sm text-muted-foreground">Secured</p>
                <p className="font-display text-2xl font-bold tabular-nums">₹4,20,000</p>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="font-display text-2xl font-bold tabular-nums">₹64,000</p>
              </div>
            </div>
            {sponsors.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <p className="text-sm font-medium">{s.name}</p>
                <StatusBadge tone={s.tone}>{s.state}</StatusBadge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
