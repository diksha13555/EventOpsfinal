import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin-ui";
import { TaskBoard } from "@/components/task-board";

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({ meta: [{ title: "Tasks — EventOps" }] }),
  component: TasksPage,
});

function TasksPage() {
  return (
    <>
      <PageHeader title="Tasks" description="Drag cards between stages, and up or down to set their order." />
      <TaskBoard />
    </>
  );
}
