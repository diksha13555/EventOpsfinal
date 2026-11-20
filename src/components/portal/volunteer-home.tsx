import { AlertTriangle, Ban, CheckCircle2, Clock, LogIn, LogOut, Play, RotateCcw, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { StatusBadge, StatusDot, fieldCls, type Tone } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskNotes } from "@/components/task-notes";
import { TASK_STAGES, type Priority, type ResourceStatus, type Severity, type Task, type TaskStatus } from "@/lib/event-data";
import { countdown, formatDue, isOverdue, timeAgo } from "@/lib/event-selectors";
import { formatDuration, workedMs } from "@/lib/shift";
import { currentSlot, formatSlot, nextSlot } from "@/lib/slots";
import { groupNotes } from "@/lib/task-notes";
import { WORK_FLOW, actionsFor, type WorkAction } from "@/lib/task-flow";
import { useSession } from "@/lib/session";
import { usePortalHome } from "@/lib/use-portal-home";

const stageTone: Record<TaskStatus, Tone> = {
  Backlog: "neutral",
  "In Progress": "info",
  Blocked: "danger",
  Done: "success",
};
const stageLabel: Record<TaskStatus, string> = {
  Backlog: "To do",
  "In Progress": "In progress",
  Blocked: "Blocked",
  Done: "Done",
};
const priorityTone: Record<Priority, Tone> = { High: "danger", Medium: "warning", Low: "neutral" };
const severityTone: Record<Severity, Tone> = { Critical: "danger", High: "danger", Medium: "warning", Low: "neutral" };
const resourceTone: Record<ResourceStatus, Tone> = { Booked: "success", Pending: "warning", Conflict: "danger", Free: "neutral" };
const actionIcon: Record<WorkAction, LucideIcon> = {
  start: Play,
  done: CheckCircle2,
  block: Ban,
  resume: RotateCcw,
};

export function VolunteerHome() {
  const { state } = useSession();
  const user = state.status === "ready" ? state.user : null;
  const { data, error, actionError, now, reload, act, addNote, checkIn, checkOut, reportIssue } = usePortalHome();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dutyBusy, setDutyBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueSeverity, setIssueSeverity] = useState<Severity>("Medium");
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueBusy, setIssueBusy] = useState(false);
  const [blocking, setBlocking] = useState<Task | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  if (error)
    return (
      <section className="panel mx-auto max-w-xl p-6" role="alert">
        <p className="font-semibold">{error.problem}</p>
        <p className="mt-2 text-sm text-muted-foreground">{error.hint}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => void reload()}>
          Try again
        </Button>
      </section>
    );

  if (!data || !now)
    return (
      <div aria-hidden className="grid gap-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  const tasks = data.myTasks;
  const onDuty = data.shift.openSince !== null;
  const notesBy = groupNotes(data.notes);
  const liveSlot = currentSlot(data.slots, now);
  const upSlot = nextSlot(data.slots, now);
  const count = (s: TaskStatus) => tasks.filter((t) => t.status === s).length;
  // What needs attention first: work in progress, then blocked, then to do. Finished work goes last.
  const order: TaskStatus[] = ["In Progress", "Blocked", "Backlog"];
  const active = order.flatMap((s) => tasks.filter((t) => t.status === s));
  const finished = tasks.filter((t) => t.status === "Done");
  const upcoming = data.schedule.filter((s) => s.at >= now).slice(0, 5);
  const ms = data.eventStart - now;
  const c = countdown(Math.max(ms, 0));

  const run = async (task: Task, action: WorkAction, note = "") => {
    setBusyId(task.id);
    const ok = await act(task.id, action, note);
    setBusyId(null);
    return ok;
  };

  const press = (task: Task, action: WorkAction) => {
    if (action === "block") {
      setReason("");
      setReasonError(null);
      setBlocking(task);
    } else void run(task, action);
  };

  const toggleDuty = async () => {
    setDutyBusy(true);
    await (data.shift.openSince === null ? checkIn() : checkOut());
    setDutyBusy(false);
  };

  const submitIssue = async (e: FormEvent) => {
    e.preventDefault();
    if (issueTitle.trim().length < 3) return setIssueError("Describe the problem in a few words.");
    setIssueBusy(true);
    setIssueError(null);
    const problem = await reportIssue(issueTitle.trim(), issueSeverity);
    setIssueBusy(false);
    if (problem) return setIssueError(problem);
    setIssueTitle("");
    setIssueSeverity("Medium");
    setReporting(false);
  };

  const submitBlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!blocking) return;
    if (reason.trim().length < 3) return setReasonError("Say what is blocking you, in a few words.");
    if (await run(blocking, "block", reason.trim())) setBlocking(null);
    else setReasonError("That did not save. Check the message at the top of the page.");
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Hi, {user?.name ?? "there"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.eventName} {ms > 0 ? `opens in ${c.days > 0 ? `${c.days}d ` : ""}${c.hours}h ${c.minutes}m.` : "is live."}
        </p>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg border border-destructive/50 bg-card p-3 text-sm">
          {actionError}
        </p>
      )}

      <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <StatusDot tone={onDuty ? "success" : "neutral"} /> {onDuty ? "On duty" : "Not checked in"}
          </p>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {onDuty
              ? `This shift: ${formatDuration(now - (data.shift.openSince ?? now))}${data.shift.closedTodayMs > 0 ? ` · earlier today: ${formatDuration(data.shift.closedTodayMs)}` : ""}`
              : data.shift.closedTodayMs > 0
                ? `Worked today: ${formatDuration(workedMs(data.shift, now))}`
                : liveSlot
                  ? `Your shift is on now (${formatSlot(liveSlot)}). Check in when you reach ${liveSlot.place || "the venue"}.`
                  : "Check in when you reach the venue."}
          </p>
        </div>
        <Button variant={onDuty ? "outline" : "default"} disabled={dutyBusy} onClick={() => void toggleDuty()}>
          {onDuty ? <LogOut /> : <LogIn />} {dutyBusy ? "Saving…" : onDuty ? "Check out" : "Check in"}
        </Button>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TASK_STAGES.map((s) => (
          <div key={s} className="panel p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <StatusDot tone={stageTone[s]} /> {stageLabel[s]}
            </p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">{count(s)}</p>
          </div>
        ))}
      </div>

      <section className="panel p-5">
        <h2 className="mb-4 text-base font-semibold">My work</h2>
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Nothing is assigned to you yet. New work from an administrator will appear here by itself.
          </p>
        ) : active.length === 0 ? (
          <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Everything assigned to you is done. Nice work.
          </p>
        ) : (
          <ul className="grid gap-2">
            {active.map((t) => {
              const late = isOverdue(t, now);
              return (
                <li key={t.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{t.title}</p>
                      <p
                        className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${late ? "font-medium text-destructive" : "text-muted-foreground"}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> {formatDue(t.due)}
                          {late && " · Overdue"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <StatusDot tone={priorityTone[t.priority]} className="h-1.5 w-1.5" /> {t.priority}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <StatusDot tone={stageTone[t.status]} className="h-1.5 w-1.5" /> {stageLabel[t.status]}
                        </span>
                      </p>
                      {t.status === "Blocked" && t.note && (
                        <p className="mt-2 text-xs text-destructive">Blocked: {t.note}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {actionsFor(t.status).map((a, i) => {
                        const Icon = actionIcon[a];
                        return (
                          <Button
                            key={a}
                            size="sm"
                            variant={i === 0 ? "default" : "outline"}
                            disabled={busyId !== null}
                            onClick={() => press(t, a)}
                          >
                            <Icon /> {busyId === t.id && a !== "block" ? "Saving…" : WORK_FLOW[a].label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <TaskNotes notes={notesBy.get(t.id) ?? []} now={now} onAdd={(body) => addNote(t.id, body)} />
                </li>
              );
            })}
          </ul>
        )}

        {finished.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="flex cursor-pointer items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> {finished.length} finished
            </summary>
            <ul className="mt-2 grid gap-1.5 pl-6 text-muted-foreground">
              {finished.map((t) => (
                <li key={t.id} className="line-through">
                  {t.title}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="mb-4 text-base font-semibold">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing left on the schedule.</p>
        ) : (
          <ol className="grid gap-3">
            {upcoming.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <p className="w-24 shrink-0 text-sm font-medium tabular-nums">
                  {new Date(item.at).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.venue}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="mb-4 text-base font-semibold">My shifts</h2>
        {data.slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No shifts are planned for you yet. When an administrator plans one, it appears here.
          </p>
        ) : (
          <ul className="grid gap-2">
            {data.slots.map((sl) => {
              const live = sl === liveSlot;
              const over = sl.endsAt <= now;
              return (
                <li key={sl.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${over ? "text-muted-foreground" : ""}`}>{formatSlot(sl)}</p>
                    {sl.place && <p className="text-xs text-muted-foreground">{sl.place}</p>}
                  </div>
                  {live ? (
                    <StatusBadge tone="success">On now</StatusBadge>
                  ) : sl === upSlot ? (
                    <StatusBadge tone="info">Next</StatusBadge>
                  ) : over ? (
                    <StatusBadge tone="neutral">Finished</StatusBadge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Issues I reported</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIssueError(null);
              setReporting(true);
            }}
          >
            <AlertTriangle /> Report an issue
          </Button>
        </div>
        {data.myIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Seen a problem on the ground? Report it and the administrator is told straight away.
          </p>
        ) : (
          <ul className="grid gap-2">
            {data.myIssues.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{i.title}</p>
                  <p className="text-xs text-muted-foreground">reported {timeAgo(now - i.at)} ago</p>
                </div>
                <StatusBadge tone={severityTone[i.severity]}>{i.severity}</StatusBadge>
                <StatusBadge tone={i.status === "Resolved" ? "success" : "warning"}>{i.status}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="mb-4 text-base font-semibold">Venues and gear</h2>
        {data.venues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No venues or gear are listed yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.venues.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.slot}</p>
                </div>
                <StatusBadge tone={resourceTone[v.status]}>{v.status}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={reporting} onOpenChange={(o) => !o && !issueBusy && setReporting(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>Tell the administrator about a problem on the ground.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitIssue} className="grid gap-3">
            <input
              autoFocus
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              maxLength={200}
              placeholder="What happened?"
              aria-label="What happened"
              className={fieldCls}
            />
            <select
              value={issueSeverity}
              onChange={(e) => setIssueSeverity(e.target.value as Severity)}
              aria-label="Severity"
              className={fieldCls}
            >
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            {issueError && (
              <p role="alert" className="text-sm text-destructive">
                {issueError}
              </p>
            )}
            <Button type="submit" variant="destructive" className="ml-auto" disabled={issueBusy}>
              <AlertTriangle /> {issueBusy ? "Sending…" : "Send report"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={blocking !== null} onOpenChange={(o) => !o && busyId === null && setBlocking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What is blocking you?</DialogTitle>
            <DialogDescription>
              {blocking?.title}. The administrator sees this reason right away.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBlock} className="grid gap-3">
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="For example: waiting for the gate keys"
              aria-label="Reason"
              aria-invalid={reasonError ? true : undefined}
              className={fieldCls}
            />
            {reasonError && (
              <p role="alert" className="text-sm text-destructive">
                {reasonError}
              </p>
            )}
            <Button type="submit" variant="destructive" className="ml-auto" disabled={busyId !== null}>
              <Ban /> {busyId !== null ? "Saving…" : "Report blocked"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
