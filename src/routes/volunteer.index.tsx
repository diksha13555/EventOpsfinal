import { createFileRoute } from "@tanstack/react-router";
import { VolunteerHome } from "@/components/portal/volunteer-home";

export const Route = createFileRoute("/volunteer/")({ component: VolunteerHome });
