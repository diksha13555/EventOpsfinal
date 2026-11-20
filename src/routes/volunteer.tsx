import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/portal-shell";

// Layout for every /volunteer page. Only volunteers get past the shell.
export const Route = createFileRoute("/volunteer")({
  head: () => ({ meta: [{ title: "Volunteer · EventOps" }] }),
  component: () => (
    <PortalShell role="volunteer">
      <Outlet />
    </PortalShell>
  ),
});
