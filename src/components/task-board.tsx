import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TASK_STAGES, type Priority, type Task, type TaskStatus } from "@/lib/event-data";
import { formatDue, isOverdue } from "@/lib/event-selectors";
import { useEventStore } from "@/lib/event-store";
import { columnOf, computeDrop, type DropOver } from "@/lib/task-order";
import { cn } from "@/lib/utils";
import { StatusDot, fieldCls, type Tone } from "./admin-ui";

const stageTone: Record<TaskStatus, Tone> = {
  Backlog: "neutral",
  "In Progress": "info",
  Blocked: "danger",
  Done: "success",
};

const priorityTone: Record<Priority, Tone> = { High: "danger", Medium: "warning", Low: "neutral" };

const colId = (status: TaskStatus) => `col:${status}`;
const statusOfCol = (id: string) => id.slice(4) as TaskStatus;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

// What a card looks like (used by the real card and by the copy that follows your finger or mouse).
function CardBody({ task, late }: { task: Task; late: boolean }) {
  return (
    <>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <p
        className={cn(
          "mt-2 flex items-center gap-1.5 text-xs text-muted-foreground",
          late && "font-medium text-destructive",
        )}
      >
        <Clock className="h-3 w-3" /> {formatDue(task.due)}
        {late && " · Overdue"}
      </p>
      {task.status === "Blocked" && task.blockedReason && (
        <p className="mt-2 text-xs italic text-muted-foreground">Blocked: {task.blockedReason}</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span
          title={task.owner}
          aria-label={`Owner: ${task.owner}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground"
        >
          {initials(task.owner)}
        </span>
        <span className="truncate">{task.owner}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <StatusDot tone={priorityTone[task.priority]} className="h-1.5 w-1.5" />
          {task.priority}
        </span>
      </div>
      {task.id < 0 && <p className="mt-1 text-xs text-muted-foreground">Saving…</p>}
    </>
  );
}

function SortableCard({ task, late }: { task: Task; late: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: task.id < 0, // a card that is still being saved cannot be moved yet
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-card={task.id}
      {...attributes}
      {...listeners}
      className={cn(
        "panel touch-manipulation select-none p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        task.id < 0 ? "cursor-default" : "cursor-grab active:cursor-grabbing hover:border-primary/50",
        isDragging && "opacity-40",
      )}
    >
      <CardBody task={task} late={late} />
    </div>
  );
}

function Column({
  status,
  count,
  total,
  highlighted,
  children,
}: {
  status: TaskStatus;
  count: number;
  total: number;
  highlighted: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: colId(status) });
  return (
    <div
      ref={setNodeRef}
      data-column={status}
      className={cn("rounded-lg bg-muted/60 p-2.5 transition-shadow", highlighted && "ring-2 ring-primary/60")}
    >
      <p className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
        <StatusDot tone={stageTone[status]} /> {status}
        <span className="ml-auto tabular-nums">{count === total ? total : `${count} of ${total}`}</span>
      </p>
      {children}
    </div>
  );
}

export function TaskBoard() {
  const { state, now, addTask, moveTask } = useEventStore();

  // filters
  const [owner, setOwner] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | Priority>("All");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // dragging
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);
  const [pendingBlock, setPendingBlock] = useState<{ id: number; index: number } | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState("");

  // new task form
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("High");
  const [due, setDue] = useState("");

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), // a click does not start a drag
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }), // press and hold, so scrolling still works
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const owners = useMemo(() => [...new Set(state.tasks.map((t) => t.owner))].sort(), [state.tasks]);
  const passes = (t: Task) =>
    (owner === "All" || t.owner === owner) &&
    (priorityFilter === "All" || t.priority === priorityFilter) &&
    (!overdueOnly || isOverdue(t, now));
  const filtering = owner !== "All" || priorityFilter !== "All" || overdueOnly;
  const shown = state.tasks.filter(passes).length;
  const activeTask = activeId === null ? null : (state.tasks.find((t) => t.id === activeId) ?? null);

  const doMove = (id: number, status: TaskStatus, index: number, reason?: string) => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    moveTask(id, status, index, reason);
    if (status !== task.status) toast(`${task.title} moved to ${status}`);
  };

  const dropOverOf = (e: DragEndEvent | DragOverEvent): DropOver | null => {
    const over = e.over;
    if (!over) return null;
    if (typeof over.id === "string") return { kind: "column", status: statusOfCol(over.id) };
    const moved = e.active.rect.current.translated;
    const below = moved ? moved.top + moved.height / 2 > over.rect.top + over.rect.height / 2 : false;
    return { kind: "card", id: Number(over.id), below };
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(Number(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const over = dropOverOf(e);
    if (!over) return setOverStatus(null);
    setOverStatus(over.kind === "column" ? over.status : (state.tasks.find((t) => t.id === over.id)?.status ?? null));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverStatus(null);
    const over = dropOverOf(e);
    if (!over) return;
    const id = Number(e.active.id);
    const drop = computeDrop(state.tasks, id, over);
    if (!drop) return;
    const task = state.tasks.find((t) => t.id === id);
    if (drop.status === "Blocked" && task?.status !== "Blocked") {
      setBlockReason("");
      setBlockError("");
      setPendingBlock({ id, index: drop.index }); // ask why before moving it into Blocked
      return;
    }
    doMove(id, drop.status, drop.index);
  };

  const confirmBlock = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!pendingBlock) return;
    if (!blockReason.trim()) return setBlockError("Please say why this task is blocked.");
    doMove(pendingBlock.id, "Blocked", pendingBlock.index, blockReason.trim());
    setPendingBlock(null);
  };

  const submitTask = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!title.trim()) return;
    addTask(title.trim(), priority, due);
    setTitle("");
    setDue("");
    setOpen(false);
  };

  const nameOf = (id: unknown) => state.tasks.find((t) => t.id === Number(id))?.title ?? "Task";
  const columnName = (id: unknown) => {
    if (typeof id === "string") return statusOfCol(id);
    return state.tasks.find((t) => t.id === Number(id))?.status ?? "a column";
  };

  return (
    <section className="panel p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Task board</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> New task
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          aria-label="Filter by owner"
          className={cn(fieldCls, "h-9 w-auto min-w-36")}
        >
          <option value="All">All owners</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "All" | Priority)}
          aria-label="Filter by priority"
          className={cn(fieldCls, "h-9 w-auto min-w-36")}
        >
          <option value="All">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <button
          type="button"
          aria-pressed={overdueOnly}
          onClick={() => setOverdueOnly((v) => !v)}
          className={cn(
            "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
            overdueOnly ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-accent",
          )}
        >
          Overdue only
        </button>
        {filtering && (
          <>
            <span className="text-sm text-muted-foreground tabular-nums">
              Showing {shown} of {state.tasks.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setOwner("All");
                setPriorityFilter("All");
                setOverdueOnly(false);
              }}
              className="text-sm font-medium underline"
            >
              Clear filters
            </button>
          </>
        )}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Drag a card to another column to change its stage, or up and down to reorder. On a phone, press and hold a card
        first. With the keyboard: focus a card, press Space, use the arrow keys, then Space again.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverStatus(null);
        }}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "To pick up a task, press Space. Use the arrow keys to move it, Space to drop it, or Escape to cancel.",
          },
          announcements: {
            onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
            onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over ${columnName(over.id)}.` : undefined),
            onDragEnd: ({ active, over }) =>
              over ? `${nameOf(active.id)} was dropped in ${columnName(over.id)}.` : `${nameOf(active.id)} was put back.`,
            onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
          },
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TASK_STAGES.map((stage) => {
            const all = columnOf(state.tasks, stage);
            const visible = all.filter(passes);
            return (
              <Column key={stage} status={stage} count={visible.length} total={all.length} highlighted={overStatus === stage && activeId !== null}>
                <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid min-h-16 content-start gap-2">
                    {visible.map((t) => (
                      <SortableCard key={t.id} task={t} late={isOverdue(t, now)} />
                    ))}
                  </div>
                </SortableContext>
              </Column>
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="panel cursor-grabbing p-3 shadow-lg ring-2 ring-primary/40">
              <CardBody task={activeTask} late={isOverdue(activeTask, now)} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Why is it blocked? */}
      <Dialog open={pendingBlock !== null} onOpenChange={(o) => !o && setPendingBlock(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why is it blocked?</DialogTitle>
            <DialogDescription>
              A short reason helps the team. It shows on the card and in the Overview alerts.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={confirmBlock} className="grid gap-3">
            <input
              autoFocus
              value={blockReason}
              maxLength={200}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. Waiting for the vendor's quote"
              className={fieldCls}
              aria-label="Reason"
            />
            {blockError && (
              <p role="alert" className="text-sm text-destructive">
                {blockError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPendingBlock(null)}>
                Cancel
              </Button>
              <Button type="submit">Move to Blocked</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New task */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a task</DialogTitle>
            <DialogDescription>It lands at the bottom of Backlog until someone picks it up.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitTask} className="grid gap-3">
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
