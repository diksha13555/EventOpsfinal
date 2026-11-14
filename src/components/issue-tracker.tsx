import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Severity } from "@/lib/event-data";
import { quickStats } from "@/lib/event-selectors";
import { useEventStore } from "@/lib/event-store";
import { StatusBadge, fieldCls, type Tone } from "./admin-ui";

const severityTone: Record<Severity, Tone> = {
  Critical: "danger",
  High: "danger",
  Medium: "warning",
  Low: "neutral",
};

export function IssueTracker() {
  const { state, addIssue, resolveIssue } = useEventStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState<Severity>("Critical");

  const openIssues = state.issues.filter((i) => i.status === "Open");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addIssue(text.trim(), severity);
    setText("");
    setOpen(false);
  };

  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Open issues</h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <AlertTriangle /> Report an issue
        </Button>
      </div>

      {openIssues.length === 0 ? (
        <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          No open issues. Nice work.
        </p>
      ) : (
        <div className="grid gap-2">
          {openIssues.map((i) => (
            <div
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{i.title}</p>
              <StatusBadge tone={severityTone[i.severity]}>{i.severity}</StatusBadge>
              <Button size="sm" variant="outline" disabled={i.id < 0} onClick={() => resolveIssue(i.id)}>
                <CheckCircle2 /> Resolve
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-success" /> {quickStats(state).resolvedIssues} issues
        resolved this week
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>Let the crew know about an on-ground problem.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What happened?"
              className={fieldCls}
            />
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className={fieldCls}
              aria-label="Severity"
            >
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <Button type="submit" variant="destructive" className="ml-auto">
              <AlertTriangle /> Log issue
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
