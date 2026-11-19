import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { loginApi } from "@/lib/auth-api";
import {
  DEMO_ACCOUNTS,
  ROLES,
  ROLE_HOME,
  ROLE_META,
  checkEmail,
  type AuthFail,
  type Role,
} from "@/lib/auth-types";
import { cn } from "@/lib/utils";
import {
  AuthFrame,
  FormAlert,
  PasswordField,
  PassHeader,
  ROLE_ICON,
  SubmitButton,
  TextField,
  roleVars,
  tint,
  usePublicInfo,
} from "./auth-parts";

type Problem = Omit<AuthFail, "ok">;

const NETWORK: Problem = {
  problem: "Could not reach the server.",
  hint: "Check your internet connection and try again.",
};

export function LoginPage() {
  const [role, setRole] = useState<Role>("participant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<Problem | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const radios = useRef<Partial<Record<Role, HTMLButtonElement | null>>>({});
  const info = usePublicInfo();
  const meta = ROLE_META[role];

  // The free database sleeps when nobody uses it. If sign-in takes a while, say why.
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, [busy]);

  const pick = (next: Role) => {
    setRole(next);
    setError(null);
  };

  // Arrow keys move between the three passes, like any radio group.
  const onRadioKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = ROLES[(ROLES.indexOf(role) + step + ROLES.length) % ROLES.length] as Role;
    pick(next);
    radios.current[next]?.focus();
  };

  const fail = (problem: Problem, focus: "email" | "password") => {
    setError(problem);
    (focus === "email" ? emailRef : passwordRef).current?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const emailMsg = checkEmail(email);
    if (emailMsg) return fail({ problem: emailMsg, hint: "Use the email your account was created with.", field: "email" }, "email");
    if (!password) return fail({ problem: "Enter your password.", hint: "Passwords are case sensitive.", field: "password" }, "password");

    setBusy(true);
    setError(null);
    try {
      const r = await loginApi({ data: { email, password, role } });
      if (r.ok) {
        // A full page load (not a soft navigation) so the new session cookie is used from the first request
        // and nothing from an earlier visitor stays in memory.
        window.location.assign(ROLE_HOME[r.user.role]);
        return; // stay in the busy state while the next page opens
      }
      setBusy(false);
      fail(r, r.field === "email" ? "email" : "password");
    } catch {
      setBusy(false);
      setError(NETWORK);
    }
  };

  const fillDemo = (a: (typeof DEMO_ACCOUNTS)[number]) => {
    setRole(a.role);
    setEmail(a.email);
    setPassword(a.password);
    setError(null);
  };

  return (
    <AuthFrame active={role}>
      <div className="w-full max-w-md">
        <form
          onSubmit={submit}
          noValidate
          aria-busy={busy}
          style={roleVars(role)}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <PassHeader role={role} />

          <div className="grid gap-5 p-6">
            <div>
              <h1 className="font-display text-2xl font-bold">Sign in</h1>
              <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
                {meta.blurb}
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Sign in as"
              onKeyDown={onRadioKey}
              className="grid grid-cols-3 gap-2"
            >
              {ROLES.map((r) => {
                const on = r === role;
                const Icon = ROLE_ICON[r];
                return (
                  <button
                    key={r}
                    ref={(node) => {
                      radios.current[r] = node;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => pick(r)}
                    style={on ? { borderColor: ROLE_META[r].solid, backgroundColor: tint(r, 12) } : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border-2 px-1 py-2.5 text-[13px] font-medium transition-colors motion-reduce:transition-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--role)]",
                      on ? "text-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden className="h-5 w-5" />
                    {ROLE_META[r].short}
                  </button>
                );
              })}
            </div>

            <TextField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="name@college.edu"
              value={email}
              onChange={setEmail}
              inputRef={emailRef}
              invalid={error?.field === "email"}
            />
            <PasswordField
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              inputRef={passwordRef}
              invalid={!!error && error.field !== "email"}
            />

            {error && (
              <FormAlert problem={error.problem} hint={error.hint}>
                {error.suggestRole && (
                  <button
                    type="button"
                    onClick={() => pick(error.suggestRole as Role)}
                    className="mt-2 font-semibold underline underline-offset-4"
                  >
                    Switch to the {ROLE_META[error.suggestRole].short} pass
                  </button>
                )}
              </FormAlert>
            )}

            <div className="grid gap-2">
              <SubmitButton busy={busy}>
                {busy ? `Opening your ${meta.short.toLowerCase()} space…` : `Sign in as ${meta.label.toLowerCase()}`}
              </SubmitButton>
              {slow && (
                <p role="status" className="text-center text-xs text-muted-foreground">
                  Waking up the database. The first sign-in after a quiet spell can take up to 20 seconds.
                </p>
              )}
            </div>

            {role === "participant" ? (
              <p className="text-center text-sm text-muted-foreground">
                New here?{" "}
                <Link to="/register" className="font-semibold text-foreground underline underline-offset-4">
                  Create a participant account
                </Link>
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {meta.label} accounts are created by an event administrator.
              </p>
            )}
          </div>
        </form>

        {info?.demoLogins && (
          <details className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm">
            <summary className="flex cursor-pointer items-center gap-2 font-medium">
              <KeyRound aria-hidden className="h-4 w-4 text-muted-foreground" /> Demo logins for reviewers
            </summary>
            <ul className="mt-3 grid gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.role} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                  <div className="min-w-0">
                    <p className="font-medium">{ROLE_META[a.role].label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.email} · {a.password}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fillDemo(a)}
                    className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                  >
                    Fill in
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </AuthFrame>
  );
}
