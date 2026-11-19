import { Link } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { registerApi } from "@/lib/auth-api";
import { ROLE_HOME, checkEmail, checkName, checkNewPassword, type AuthFail } from "@/lib/auth-types";
import {
  AuthFrame,
  FormAlert,
  PasswordField,
  PassHeader,
  SubmitButton,
  TextField,
  roleVars,
} from "./auth-parts";

type Problem = Omit<AuthFail, "ok">;

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Problem | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const fail = (problem: Problem) => {
    setError(problem);
    const target = { name: nameRef, email: emailRef, password: passwordRef }[problem.field ?? "password"];
    target.current?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    // The same rules the server uses, so mistakes show instantly. The server still checks everything.
    const nameMsg = checkName(name);
    if (nameMsg) return fail({ problem: nameMsg, hint: "Use the name people know you by.", field: "name" });
    const emailMsg = checkEmail(email);
    if (emailMsg) return fail({ problem: emailMsg, hint: "We use it to sign you in.", field: "email" });
    const passMsg = checkNewPassword(password);
    if (passMsg) return fail({ problem: passMsg, hint: "Pick something others cannot guess.", field: "password" });

    setBusy(true);
    setError(null);
    try {
      const r = await registerApi({ data: { name, email, password } });
      if (r.ok) {
        window.location.assign(ROLE_HOME[r.user.role]); // full load, so the new session is used straight away
        return;
      }
      setBusy(false);
      fail(r);
    } catch {
      setBusy(false);
      setError({ problem: "Could not reach the server.", hint: "Check your internet connection and try again." });
    }
  };

  return (
    <AuthFrame active="participant">
      <form
        onSubmit={submit}
        noValidate
        aria-busy={busy}
        style={roleVars("participant")}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <PassHeader role="participant" />
        <div className="grid gap-5 p-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Get your attendee pass to register for events and join a team.
            </p>
          </div>

          <TextField
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={setName}
            inputRef={nameRef}
            invalid={error?.field === "name"}
          />
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@college.edu"
            value={email}
            onChange={setEmail}
            inputRef={emailRef}
            invalid={error?.field === "email"}
          />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number."
            value={password}
            onChange={setPassword}
            inputRef={passwordRef}
            invalid={error?.field === "password"}
          />

          {error && <FormAlert problem={error.problem} hint={error.hint} />}

          <SubmitButton busy={busy}>{busy ? "Creating your pass…" : "Create account"}</SubmitButton>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/" className="font-semibold text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthFrame>
  );
}
