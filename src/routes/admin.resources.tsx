import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin-ui";
import { ResourceBooking } from "@/components/resource-booking";

export const Route = createFileRoute("/admin/resources")({
  head: () => ({ meta: [{ title: "Resources — EventOps" }] }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <>
      <PageHeader title="Resources" description="Venues and equipment, and who has them when." />
      <ResourceBooking />
    </>
  );
}
