import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/portal-shell";

// Layout for every /participant page. Only participants get past the shell.
export const Route = createFileRoute("/participant")({
  head: () => ({ meta: [{ title: "Participant · EventOps" }] }),
  component: () => (
    <PortalShell role="participant">
      <Outlet />
    </PortalShell>
  ),
});
