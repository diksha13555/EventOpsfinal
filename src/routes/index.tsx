import { createFileRoute, redirect } from "@tanstack/react-router";

// For now the site opens straight into the admin console.
// Later this page becomes the login screen that sends each role to its own module.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
