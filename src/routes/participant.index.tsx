import { createFileRoute } from "@tanstack/react-router";
import { ParticipantHome } from "@/components/portal/participant-home";

export const Route = createFileRoute("/participant/")({ component: ParticipantHome });
