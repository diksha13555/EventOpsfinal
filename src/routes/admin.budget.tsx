import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin-ui";
import { BudgetTracker } from "@/components/budget-tracker";

export const Route = createFileRoute("/admin/budget")({
  head: () => ({ meta: [{ title: "Budget — EventOps" }] }),
  component: BudgetPage,
});

function BudgetPage() {
  return (
    <>
      <PageHeader title="Budget" description="What has been spent against what was planned." />
      <BudgetTracker />
    </>
  );
}
