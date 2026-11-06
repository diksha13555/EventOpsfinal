import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin-ui";
import { IssueTracker } from "@/components/issue-tracker";

export const Route = createFileRoute("/admin/issues")({
  head: () => ({ meta: [{ title: "Issues — EventOps" }] }),
  component: IssuesPage,
});

function IssuesPage() {
  return (
    <>
      <PageHeader title="Issues" description="Problems on the ground that need someone's attention." />
      <IssueTracker />
    </>
  );
}
