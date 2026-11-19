// Shared by the browser and the server: the three roles, where each one lands after sign-in,
// and the rules for names, emails and passwords. The server re-checks every rule; the browser
// uses the same functions only to give instant feedback.

export const ROLES = ["admin", "volunteer", "participant"] as const;
export type Role = (typeof ROLES)[number];

export type SessionUser = { id: number; name: string; email: string; role: Role };

// Where each role lands after signing in.
export const ROLE_HOME = {
  admin: "/admin",
  volunteer: "/volunteer",
  participant: "/participant",
} as const;

// How each role looks and sounds on the entry page. `solid` is a fill (white text passes contrast on it);
// `light` is for text and lines on the dark poster.
export const ROLE_META: Record<
  Role,
  { label: string; short: string; pass: string; blurb: string; line: string; solid: string; light: string }
> = {
  admin: {
    label: "Administrator",
    short: "Admin",
    pass: "All-areas pass",
    blurb: "Tasks, bookings, issues and the budget for the whole event.",
    line: "Run the fest.",
    solid: "#2f56d9",
    light: "#9db2ff",
  },
  volunteer: {
    label: "Volunteer",
    short: "Volunteer",
    pass: "Crew pass",
    blurb: "Your tasks, your shifts and the live schedule.",
    line: "Work the shift.",
    solid: "#0b7a75",
    light: "#5eead4",
  },
  participant: {
    label: "Participant",
    short: "Participant",
    pass: "Attendee pass",
    blurb: "The event schedule, registration and your team.",
    line: "Join the fun.",
    solid: "#8a2be2",
    light: "#dcb0ff",
  },
};

// A failed sign-in, registration or account action. `field` says which input to point at.
export type AuthFail = {
  ok: false;
  problem: string;
  hint: string;
  field?: "name" | "email" | "password";
  suggestRole?: Role; // set when the account exists but belongs to another role
};
export type AuthResult = { ok: true; user: SessionUser } | AuthFail;

// What the server answers when the browser asks "who is signed in?".
export type SessionResult =
  | { ok: true; user: SessionUser | null }
  | { ok: false; problem: string; hint: string };

// The only things the entry page may learn before anyone signs in.
export type PublicInfo = {
  event: { name: string; startsAt: number } | null;
  demoLogins: boolean; // false when DEMO_ACCOUNTS=off is set on the server
};

// Sample accounts so a reviewer can try all three roles. They are created automatically the first time
// the database is set up. Set DEMO_ACCOUNTS=off on the server (Vercel) before real use to stop that.
export const DEMO_ACCOUNTS = [
  { role: "admin", name: "Event Admin", email: "admin@eventops.demo", password: "Admin@2026" },
  { role: "volunteer", name: "Riya", email: "volunteer@eventops.demo", password: "Crew@2026" },
  { role: "participant", name: "Aarav", email: "participant@eventops.demo", password: "Guest@2026" },
] as const satisfies readonly { role: Role; name: string; email: string; password: string }[];

// ---- Input rules (return an error message, or null when the value is fine) ----

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function checkName(value: string): string | null {
  const n = value.trim();
  if (n.length < 2) return "Enter your full name.";
  if (n.length > 80) return "Keep the name under 80 characters.";
  return null;
}

export function checkEmail(value: string): string | null {
  const e = value.trim();
  if (!e) return "Enter your email.";
  if (e.length > 120 || !EMAIL_RE.test(e)) return "Enter a valid email, like name@college.edu.";
  return null;
}

export function checkNewPassword(value: string): string | null {
  if (value.length < 8) return "Use at least 8 characters.";
  if (value.length > 100) return "Keep the password under 100 characters.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Include at least one letter and one number.";
  return null;
}
