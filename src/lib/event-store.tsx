import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_STATE,
  TASK_STAGES,
  makeSeed,
  type EventState,
  type Priority,
  type Severity,
} from "./event-data";

type Action =
  | { type: "init"; now: number }
  | { type: "add_task"; title: string; priority: Priority; due: string; now: number }
  | { type: "move_task"; id: number; now: number }
  | { type: "add_issue"; title: string; severity: Severity; now: number }
  | { type: "resolve_issue"; id: number; now: number };

const nextId = (items: { id: number }[]) => items.reduce((max, i) => Math.max(max, i.id), 0) + 1;

function log(state: EventState, text: string, now: number) {
  return [{ id: nextId(state.activity), text, at: now }, ...state.activity].slice(0, 20);
}

function reducer(state: EventState, action: Action): EventState {
  switch (action.type) {
    case "init":
      return makeSeed(action.now);

    case "add_task":
      return {
        ...state,
        tasks: [
          ...state.tasks,
          {
            id: nextId(state.tasks),
            title: action.title,
            owner: "You",
            due: action.due,
            priority: action.priority,
            status: "Backlog",
          },
        ],
        activity: log(state, `Task added: ${action.title}`, action.now),
      };

    case "move_task": {
      const task = state.tasks.find((t) => t.id === action.id);
      if (!task) return state;
      const next = TASK_STAGES[TASK_STAGES.indexOf(task.status) + 1]; // Done has no next stage
      if (!next) return state;
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, status: next } : t)),
        activity: log(state, `${task.title} moved to ${next}`, action.now),
      };
    }

    case "add_issue":
      return {
        ...state,
        issues: [
          { id: nextId(state.issues), title: action.title, severity: action.severity, status: "Open" },
          ...state.issues,
        ],
        activity: log(state, `Issue logged: ${action.title}`, action.now),
      };

    case "resolve_issue": {
      const issue = state.issues.find((i) => i.id === action.id);
      if (!issue) return state;
      return {
        ...state,
        issues: state.issues.map((i) => (i.id === issue.id ? { ...i, status: "Resolved" } : i)),
        activity: log(state, `Issue resolved: ${issue.title}`, action.now),
      };
    }
  }
}

type Store = {
  state: EventState;
  now: number; // refreshed every 30 seconds so countdowns and "overdue" stay current
  addTask: (title: string, priority: Priority, due: string) => void;
  moveTask: (id: number) => void;
  addIssue: (title: string, severity: Severity) => void;
  resolveIssue: (id: number) => void;
};

const StoreContext = createContext<Store | null>(null);

export function EventStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [now, setNow] = useState(0);

  // The demo data is created in the browser (not on the server) because it depends on today's date.
  useEffect(() => {
    const t = Date.now();
    setNow(t);
    dispatch({ type: "init", now: t });
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const store = useMemo<Store>(
    () => ({
      state,
      now,
      addTask: (title, priority, due) =>
        dispatch({ type: "add_task", title, priority, due, now: Date.now() }),
      moveTask: (id) => dispatch({ type: "move_task", id, now: Date.now() }),
      addIssue: (title, severity) => dispatch({ type: "add_issue", title, severity, now: Date.now() }),
      resolveIssue: (id) => dispatch({ type: "resolve_issue", id, now: Date.now() }),
    }),
    [state, now],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useEventStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useEventStore must be used inside <EventStoreProvider>");
  return store;
}
