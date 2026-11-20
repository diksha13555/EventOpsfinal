import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "@/components/auth/login-page";
import { getSessionApi } from "@/lib/auth-api";
import { ROLE_HOME } from "@/lib/auth-types";

// The entry page. Someone who is already signed in goes straight to their own module.
export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const r = await getSessionApi().catch(() => null);
    if (r?.ok && r.user) throw redirect({ to: ROLE_HOME[r.user.role] });
  },
  head: () => ({ meta: [{ title: "Sign in · EventOps" }] }),
  component: LoginPage,
});
