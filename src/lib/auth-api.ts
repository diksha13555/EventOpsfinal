// The sign-in calls the browser can make to the server. Each one runs on the server only.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ROLES, type AuthResult, type PublicInfo, type SessionResult } from "./auth-types";

// These checks only stop absurd input. The friendly rules (and the real ones) live on the server,
// which answers with a clear message instead of an error.
const text = z.string().max(300);
const role = z.enum(ROLES);

export const getSessionApi = createServerFn({ method: "POST" }).handler(async (): Promise<SessionResult> => {
  const a = await import("../server/auth.server");
  return a.readSession();
});

export const loginApi = createServerFn({ method: "POST" })
  .validator(z.object({ email: text, password: text, role }))
  .handler(async ({ data }): Promise<AuthResult> => {
    const a = await import("../server/auth.server");
    return a.login(data.email, data.password, data.role);
  });

export const registerApi = createServerFn({ method: "POST" })
  .validator(z.object({ name: text, email: text, password: text }))
  .handler(async ({ data }): Promise<AuthResult> => {
    const a = await import("../server/auth.server");
    return a.register(data.name, data.email, data.password);
  });

export const logoutApi = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: true }> => {
  const a = await import("../server/auth.server");
  return a.logout();
});

// Administrator only: create a volunteer or another administrator.
export const createUserApi = createServerFn({ method: "POST" })
  .validator(z.object({ name: text, email: text, password: text, role }))
  .handler(async ({ data }): Promise<AuthResult> => {
    const a = await import("../server/auth.server");
    return a.createUser(data.name, data.email, data.password, data.role);
  });

export const getPublicInfoApi = createServerFn({ method: "POST" }).handler(async (): Promise<PublicInfo> => {
  const a = await import("../server/auth.server");
  return a.publicInfo();
});
