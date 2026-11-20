import { Clock, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TASK_STAGES, type Priority, type TaskStatus } from "@/lib/event-data";
import { formatDue, isOverdue } from "@/lib/event-selectors";
import { useEventStore } from "@/lib/event-store";
import { cn } from "@/lib/utils";
import { StatusDot, fieldCls, type Tone } from "./admin-ui";

const stageTone: Record<TaskStatus, Tone> = {
  Backlog: "neutral",
  "In Progress": "info",
  Blocked: "danger",
  Done: "success",
};

const priorityTone: Record<Priority, Tone> = { High: "danger", Medium: "warning", Low: "neutral" };

export function TaskBoard() {
  const { state, now, addTask, moveTask } = useEventStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("High");
  const [due, setDue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title.trim(), priority, due);
    setTitle("");
    setDue("");
    setOpen(false);
  };

  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Task board</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> New task
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_STAGES.map((stage) => {
          const tasks = state.tasks.filter((t) => t.status === stage);
          return (
            <div key={stage} className="rounded-lg bg-muted/60 p-2.5">
              <p className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
                <StatusDot tone={stageTone[stage]} /> {stage}
                <span className="ml-auto tabular-nums">{tasks.length}</span>
              </p>
              <div className="grid gap-2">
                {tasks.map((t) => {
                  const late = isOverdue(t, now);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={stage === "Done" || t.id < 0}
                      onClick={() => moveTask(t.id)}
                      className="panel p-3 text-left transition-colors enabled:hover:border-primary/50 disabled:cursor-default"
                    >
                      <p className="text-sm font-medium leading-snug">{t.title}</p>
                      <p
                        className={cn(
                          "mt-2 flex items-center gap-1.5 text-xs text-muted-foreground",
                          late && "font-medium text-destructive",
                        )}
                      >
                        <Clock className="h-3 w-3" /> {formatDue(t.due)}
                        {late && " · Overdue"} · {t.owner}
                      </p>
                      {t.status === "Blocked" && t.note && (
                        <p className="mt-2 text-xs font-medium text-destructive">Blocked: {t.note}</p>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <StatusDot tone={priorityTone[t.priority]} className="h-1.5 w-1.5" />
                        {t.priority}
                        {t.id < 0 && <span className="ml-auto">Saving…</span>}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a task</DialogTitle>
            <DialogDescription>It lands in Backlog until someone picks it up.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className={fieldCls}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={fieldCls}
                aria-label="Priority"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className={fieldCls}
                aria-label="Due date"
              />
            </div>
            <Button type="submit" className="ml-auto">
              <Plus /> Add to board
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
