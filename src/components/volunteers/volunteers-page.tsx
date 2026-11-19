import { CalendarPlus, ClipboardPlus, Clock, UserPlus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader, StatusBadge, StatusDot, fieldCls, type Tone } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/date-picker";
import { TaskNotes } from "@/components/task-notes";
import { Skeleton } from "@/components/ui/skeleton";
import { checkEmail, checkName, checkNewPassword } from "@/lib/auth-types";
import type { Priority, TaskStatus } from "@/lib/event-data";
import { formatDue, isOverdue, timeAgo } from "@/lib/event-selectors";
import { formatDuration, workedMs } from "@/lib/shift";
import { TIME_OPTIONS, currentSlot, formatSlot, slotTimes } from "@/lib/slots";
import { groupNotes, type TaskNote } from "@/lib/task-notes";
import { useVolunteerOverview } from "@/lib/use-volunteer-overview";
import type { VolunteerRow, VolunteerTask } from "@/lib/volunteers-api";

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

function TaskLine({
  task,
  now,
  volunteers,
  onAssign,
  disabled,
  showAge,
  notes,
  onNote,
}: {
  task: VolunteerTask;
  now: number;
  volunteers: VolunteerRow[];
  onAssign: (taskId: number, volunteerId: number | null) => void;
  disabled: boolean;
  showAge: boolean;
  notes: TaskNote[];
  onNote: (taskId: number, body: string) => Promise<string | null>;
}) {
  const late = task.status !== "Done" && isOverdue(task, now);
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium leading-snug ${task.status === "Done" ? "text-muted-foreground line-through" : ""}`}>
            {task.title}
          </p>
          <p className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${late ? "font-medium text-destructive" : "text-muted-foreground"}`}>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {formatDue(task.due)}
              {late && " · Overdue"}
            </span>
            <span>{task.priority} priority</span>
            {showAge && <span>updated {timeAgo(now - task.updatedAt)} ago</span>}
          </p>
          {task.status === "Blocked" && task.note && (
            <p className="mt-2 text-xs font-medium text-destructive">Blocked: {task.note}</p>
          )}
        </div>
        <StatusBadge tone={stageTone[task.status]}>{stageLabel[task.status]}</StatusBadge>
        <select
          aria-label={`Assign ${task.title}`}
          value=""
          disabled={disabled}
          onChange={(e) => e.target.value && onAssign(task.id, e.target.value === "none" ? null : Number(e.target.value))}
          className={`${fieldCls} h-8 w-auto py-0 text-xs`}
        >
          <option value="">Move to…</option>
          {volunteers.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
          <option value="none">Unassign</option>
        </select>
      </div>
      <TaskNotes notes={notes} now={now} onAdd={(body) => onNote(task.id, body)} />
    </li>
  );
}

export function VolunteersPage() {
  const v = useVolunteerOverview();
  const [dialog, setDialog] = useState<null | "work" | "person" | "shift">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // "Assign work" form
  const [title, setTitle] = useState("");
  const [volunteerId, setVolunteerId] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [due, setDue] = useState("");
  // "Plan a shift" form
  const [slotVolunteer, setSlotVolunteer] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("13:00");
  const [slotPlace, setSlotPlace] = useState("");
  // "Add volunteer" form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const open = (which: "work" | "person" | "shift") => {
    setFormError(null);
    setDialog(which);
  };

  const assign = async (taskId: number, id: number | null) => {
    setMessage(null);
    setMessage(await v.assign(taskId, id));
  };

  const submitWork = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setFormError("Enter what the volunteer should do.");
    if (!volunteerId) return setFormError("Choose a volunteer.");
    setBusy(true);
    const problem = await v.assignWork(title.trim(), Number(volunteerId), priority, due);
    setBusy(false);
    if (problem) return setFormError(problem);
    setTitle("");
    setDue("");
    setDialog(null);
  };

  const submitSlot = async (e: FormEvent) => {
    e.preventDefault();
    if (!slotVolunteer) return setFormError("Choose a volunteer.");
    if (!slotDate) return setFormError("Pick the day from the calendar.");
    const times = slotTimes(slotDate, slotStart, slotEnd);
    if (!times) return setFormError("The end time must be after the start time. For a night shift, plan two shifts.");
    setBusy(true);
    const problem = await v.addSlot(Number(slotVolunteer), times.startsAt, times.endsAt, slotPlace.trim());
    setBusy(false);
    if (problem) return setFormError(problem);
    setSlotPlace("");
    setDialog(null);
  };

  const removeSlot = async (id: number) => {
    setMessage(await v.removeSlot(id));
  };

  const submitPerson = async (e: FormEvent) => {
    e.preventDefault();
    const problem = checkName(name) ?? checkEmail(email) ?? checkNewPassword(password);
    if (problem) return setFormError(problem);
    setBusy(true);
    const failed = await v.addVolunteer(name.trim(), email.trim(), password);
    setBusy(false);
    if (failed) return setFormError(failed);
    setName("");
    setEmail("");
    setPassword("");
    setDialog(null);
  };

  const header = (
    <PageHeader
      title="Volunteers"
      description="Assign work and see where each volunteer stands."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => open("work")} disabled={!v.data || v.data.volunteers.length === 0}>
            <ClipboardPlus /> Assign work
          </Button>
          <Button variant="outline" onClick={() => open("shift")} disabled={!v.data || v.data.volunteers.length === 0}>
            <CalendarPlus /> Plan a shift
          </Button>
          <Button variant="outline" onClick={() => open("person")}>
            <UserPlus /> Add volunteer
          </Button>
        </div>
      }
    />
  );

  if (v.error)
    return (
      <>
        {header}
        <section className="panel max-w-xl p-6" role="alert">
          <p className="font-semibold">{v.error.problem}</p>
          <p className="mt-2 text-sm text-muted-foreground">{v.error.hint}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => void v.reload()}>
            Try again
          </Button>
        </section>
      </>
    );

  if (!v.data || !v.now)
    return (
      <>
        {header}
        <div aria-hidden className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );

  const { volunteers, unassigned, slots } = v.data;
  const notesBy = groupNotes(v.data.notes);
  const all = volunteers.flatMap((p) => p.tasks);
  const count = (s: TaskStatus) => all.filter((t) => t.status === s).length;
  const tiles: { label: string; value: number; tone: Tone }[] = [
    { label: "To do", value: count("Backlog"), tone: "neutral" },
    { label: "In progress", value: count("In Progress"), tone: "info" },
    { label: "Blocked", value: count("Blocked"), tone: count("Blocked") > 0 ? "danger" : "success" },
    { label: "Done", value: count("Done"), tone: "success" },
  ];

  return (
    <>
      {header}

      {message && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/50 bg-card p-3 text-sm">
          {message}
        </p>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="panel p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <StatusDot tone={t.tone} /> {t.label}
            </p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>

      {volunteers.length === 0 ? (
        <section className="panel p-6">
          <p className="font-semibold">No volunteers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a volunteer account first. They sign in with the email and password you set, and the work you assign
            appears on their screen.
          </p>
          <Button className="mt-4" onClick={() => open("person")}>
            <UserPlus /> Add volunteer
          </Button>
        </section>
      ) : (
        <div className="grid gap-4">
          {volunteers.map((p) => {
            const done = p.tasks.filter((t) => t.status === "Done").length;
            const blocked = p.tasks.filter((t) => t.status === "Blocked").length;
            const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
            const mine = slots.filter((sl) => sl.userId === p.id);
            const missed = currentSlot(mine, v.now) !== undefined && p.shift.openSince === null;
            return (
              <section key={p.id} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{p.name}</h2>
                    <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {missed && <StatusBadge tone="warning">Shift started, not checked in</StatusBadge>}
                    {p.shift.openSince !== null ? (
                      <StatusBadge tone="success">On duty · {formatDuration(v.now - p.shift.openSince)}</StatusBadge>
                    ) : workedMs(p.shift, v.now) > 0 ? (
                      <span className="text-sm text-muted-foreground">Off duty · worked {formatDuration(workedMs(p.shift, v.now))} today</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not checked in</span>
                    )}
                    {blocked > 0 && <StatusBadge tone="danger">{blocked} blocked</StatusBadge>}
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {done} of {p.tasks.length} done
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
                </div>
                {mine.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Planned shifts for ${p.name}`}>
                    {mine.map((sl) => (
                      <li key={sl.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs">
                        <Clock aria-hidden className="h-3 w-3 text-muted-foreground" />
                        {formatSlot(sl)}
                        {sl.place && <span className="text-muted-foreground">· {sl.place}</span>}
                        <button
                          type="button"
                          aria-label={`Remove shift ${formatSlot(sl)} for ${p.name}`}
                          disabled={v.saving}
                          onClick={() => void removeSlot(sl.id)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {p.tasks.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Nothing assigned yet.</p>
                ) : (
                  <ul className="mt-4 grid gap-2">
                    {p.tasks.map((t) => (
                      <TaskLine key={t.id} task={t} now={v.now} volunteers={volunteers} onAssign={assign} disabled={v.saving} showAge notes={notesBy.get(t.id) ?? []} onNote={v.addNote} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {unassigned.length > 0 && volunteers.length > 0 && (
        <section className="panel mt-4 p-5">
          <h2 className="text-base font-semibold">Not given to a volunteer</h2>
          <p className="mt-1 text-sm text-muted-foreground">These tasks belong to staff or nobody. Pick a volunteer to hand one over.</p>
          <ul className="mt-4 grid gap-2">
            {unassigned.map((t) => (
              <TaskLine key={t.id} task={t} now={v.now} volunteers={volunteers} onAssign={assign} disabled={v.saving} showAge={false} notes={notesBy.get(t.id) ?? []} onNote={v.addNote} />
            ))}
          </ul>
        </section>
      )}

      <Dialog open={dialog === "work"} onOpenChange={(o) => !o && !busy && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign work</DialogTitle>
            <DialogDescription>It appears on the volunteer’s screen within half a minute.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitWork} className="grid gap-3">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What should they do?" aria-label="Task" className={fieldCls} />
            <select value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)} aria-label="Volunteer" className={fieldCls}>
              <option value="">Choose a volunteer</option>
              {volunteers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} aria-label="Priority" className={fieldCls}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <DatePicker value={due} onChange={setDue} label="Due date" placeholder="Pick a due date" />
            </div>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <Button type="submit" className="ml-auto" disabled={busy}>
              <ClipboardPlus /> {busy ? "Assigning…" : "Assign"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "shift"} onOpenChange={(o) => !o && !busy && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan a shift</DialogTitle>
            <DialogDescription>
              When you expect this volunteer on duty. They see it on their screen, and you are warned if they have not checked in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitSlot} className="grid gap-3">
            <select value={slotVolunteer} onChange={(e) => setSlotVolunteer(e.target.value)} aria-label="Volunteer" className={fieldCls}>
              <option value="">Choose a volunteer</option>
              {volunteers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <DatePicker value={slotDate} onChange={setSlotDate} label="Shift day" placeholder="Pick the day" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={slotStart} onChange={(e) => setSlotStart(e.target.value)} aria-label="Starts at" className={fieldCls}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    Starts {t.label}
                  </option>
                ))}
              </select>
              <select value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} aria-label="Ends at" className={fieldCls}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    Ends {t.label}
                  </option>
                ))}
              </select>
            </div>
            <input value={slotPlace} onChange={(e) => setSlotPlace(e.target.value)} maxLength={80} placeholder="Where? (optional, for example Main gate)" aria-label="Where" className={fieldCls} />
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <Button type="submit" className="ml-auto" disabled={busy}>
              <CalendarPlus /> {busy ? "Planning…" : "Plan shift"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "person"} onOpenChange={(o) => !o && !busy && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a volunteer</DialogTitle>
            <DialogDescription>
              Share the email and this starting password with them. They use both to sign in with the Volunteer pass.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitPerson} className="grid gap-3">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" aria-label="Full name" autoComplete="off" className={fieldCls} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" autoComplete="off" className={fieldCls} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Starting password (8+ characters, a letter and a number)" aria-label="Starting password" autoComplete="off" className={fieldCls} />
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <Button type="submit" className="ml-auto" disabled={busy}>
              <UserPlus /> {busy ? "Creating…" : "Create volunteer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
