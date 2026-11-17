import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  LayoutDashboard,
  ListChecks,
  Menu,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useEventStore } from "@/lib/event-store";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Tasks", to: "/admin/tasks", icon: ListChecks, exact: false },
  { label: "Resources", to: "/admin/resources", icon: Building2, exact: false },
  { label: "Issues", to: "/admin/issues", icon: AlertTriangle, exact: false },
  { label: "Budget", to: "/admin/budget", icon: Wallet, exact: false },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <CalendarCheck className="h-4 w-4" />
      </span>
      <span className="font-display text-lg font-bold">EventOps</span>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="grid gap-1">
      {nav.map(({ label, to, icon: Icon, exact }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact }}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          activeProps={{ className: "bg-accent text-foreground" }}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { state } = useEventStore();
  return (
    <div className="flex items-center gap-3 border-t border-border px-3 pt-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
        A
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">Administrator</p>
        <p className="truncate text-xs text-muted-foreground">{state.eventName || "EventOps"}</p>
      </div>
    </div>
  );
}

// Shows a grey placeholder while the data loads, or a clear message if the database cannot be reached.
function Gate({ children }: { children: ReactNode }) {
  const { state, loadError, retryLoad } = useEventStore();
  if (state.ready) return <>{children}</>;

  if (loadError)
    return (
      <section className="panel mx-auto max-w-xl p-6" role="alert">
        <p className="flex items-center gap-2 font-semibold">
          <XCircle className="h-5 w-5 text-destructive" /> {loadError.problem}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{loadError.hint}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={retryLoad}>
          Try again
        </Button>
      </section>
    );

  return (
    <div aria-hidden className="grid gap-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

// A dismissible banner shown when a change could not be saved.
function SaveErrorBanner() {
  const { saveError, dismissSaveError } = useEventStore();
  if (!saveError) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-destructive/50 bg-card p-3 text-sm"
    >
      <p>{saveError}</p>
      <button type="button" onClick={dismissSaveError} className="shrink-0 font-medium underline">
        Dismiss
      </button>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { state, saving } = useEventStore();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="bottom-right" />
      {/* Sidebar: always visible on large screens */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r border-border bg-card py-5 lg:flex">
        <Brand />
        <div className="flex-1 px-3">
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      {/* Sidebar on phones: slides over the page when the menu button is pressed */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="relative flex h-full w-64 flex-col gap-6 border-r border-border bg-card py-5">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 px-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <SidebarFooter />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold">{state.eventName || "EventOps"}</p>
          <div className="ml-auto flex items-center gap-2">
            {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
            <span className="hidden rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline">
              Admin
            </span>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <SaveErrorBanner />
          <Gate>{children}</Gate>
        </main>
      </div>
    </div>
  );
}
