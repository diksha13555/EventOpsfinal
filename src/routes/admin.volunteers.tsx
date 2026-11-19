import { createFileRoute } from "@tanstack/react-router";
import { VolunteersPage } from "@/components/volunteers/volunteers-page";

export const Route = createFileRoute("/admin/volunteers")({ component: VolunteersPage });
