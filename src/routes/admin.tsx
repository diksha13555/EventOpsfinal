import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { EventStoreProvider } from "@/lib/event-store";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

// The provider lives here, so every admin page shares the same data and
// a change made on one page (moving a task) shows up on all the others.
function AdminLayout() {
  return (
    <EventStoreProvider>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </EventStoreProvider>
  );
}
