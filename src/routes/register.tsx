import { createFileRoute, redirect } from "@tanstack/react-router";
import { RegisterPage } from "@/components/auth/register-page";
import { getSessionApi } from "@/lib/auth-api";
import { ROLE_HOME } from "@/lib/auth-types";

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    const r = await getSessionApi().catch(() => null);
    if (r?.ok && r.user) throw redirect({ to: ROLE_HOME[r.user.role] });
  },
  head: () => ({ meta: [{ title: "Create account · EventOps" }] }),
  component: RegisterPage,
});
