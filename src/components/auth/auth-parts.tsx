import {
  AlertTriangle,
  CalendarCheck,
  Eye,
  EyeOff,
  HandHelping,
  LoaderCircle,
  ShieldCheck,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPublicInfoApi } from "@/lib/auth-api";
import { ROLES, ROLE_META, type PublicInfo, type Role } from "@/lib/auth-types";
import { countdown } from "@/lib/event-selectors";
import { cn } from "@/lib/utils";

/*
  The entry page idea: every role is a pass. Picking a role changes the colour of the pass,
  and the three rings on the poster (one per role) light up to match.
*/

export const ROLE_ICON: Record<Role, LucideIcon> = {
  admin: ShieldCheck,
  volunteer: HandHelping,
  participant: Ticket,
};

// Sets --role so every part of the card can use the current pass colour.
export const roleVars = (role: Role) => ({ "--role": ROLE_META[role].solid }) as CSSProperties;
export const tint = (role: Role, percent: number) =>
  `color-mix(in srgb, ${ROLE_META[role].solid} ${percent}%, transparent)`;

const INK = "#0c0f2e"; // the poster stays dark in both light and dark mode

// ---------- Public info (event name and start time) ----------

let infoRequest: Promise<PublicInfo | null> | null = null;

// Asks the server once for the event name and start. Never blocks the form: if it fails, the countdown just stays hidden.
export function usePublicInfo(): PublicInfo | null {
  const [info, setInfo] = useState<PublicInfo | null>(null);
  useEffect(() => {
    let live = true;
    const request = (infoRequest ??= getPublicInfoApi().catch(() => null));
    void request.then((value) => {
      if (live) setInfo(value);
    });
    return () => {
      live = false;
    };
  }, []);
  return info;
}

function useCountdown(startsAt: number | undefined) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  if (!startsAt || !now) return null;
  const ms = startsAt - now;
  return ms <= 0 ? { live: true as const } : { live: false as const, ...countdown(ms) };
}

// ---------- Poster ----------

const RING_RADIUS: Record<Role, number> = { admin: 270, volunteer: 195, participant: 120 };

function Rings({ active }: { active: Role }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 600"
      className="pointer-events-none absolute -bottom-40 -right-40 h-[580px] w-[580px]"
    >
      {ROLES.map((r) => (
        <circle
          key={r}
          cx="300"
          cy="300"
          r={RING_RADIUS[r]}
          fill="none"
          stroke={ROLE_META[r].light}
          strokeWidth={r === active ? 7 : 2}
          strokeOpacity={r === active ? 0.95 : 0.28}
          className="transition-[stroke-width,stroke-opacity] duration-300 motion-reduce:transition-none"
        />
      ))}
      <circle
        cx="300"
        cy="300"
        r="58"
        fill={ROLE_META[active].solid}
        className="transition-[fill] duration-300 motion-reduce:transition-none"
      />
    </svg>
  );
}

function Brand({ onDark }: { onDark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          onDark ? "bg-white text-[#0c0f2e]" : "bg-primary text-primary-foreground",
        )}
      >
        <CalendarCheck className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-bold">EventOps</span>
    </div>
  );
}

function PosterCountdown({ info }: { info: PublicInfo | null }) {
  const c = useCountdown(info?.event?.startsAt);
  if (!info?.event || !c) return null;
  if (c.live) return <p className="font-display text-2xl font-bold">{info.event.name} is live now.</p>;
  const parts = [
    { unit: c.days === 1 ? "day" : "days", value: c.days },
    { unit: c.hours === 1 ? "hour" : "hours", value: c.hours },
    { unit: "min", value: c.minutes },
  ];
  return (
    <div>
      <p className="text-sm text-white/70">{info.event.name} opens in</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-5 font-display tabular-nums">
        {parts.map((p) => (
          <span key={p.unit} className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold">{p.value}</span>
            <span className="text-sm text-white/65">{p.unit}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

function Poster({ active, info }: { active: Role; info: PublicInfo | null }) {
  return (
    <aside
      className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"
      style={{ backgroundColor: INK }}
    >
      <Rings active={active} />
      <div className="relative z-10">
        <Brand onDark />
      </div>
      <div className="relative z-10">
        <div className="font-display text-4xl font-bold leading-[1.1] xl:text-6xl">
          {ROLES.map((r) => (
            <p
              key={r}
              className={cn(
                "flex items-center gap-4 transition-opacity duration-300 motion-reduce:transition-none",
                r === active ? "opacity-100" : "opacity-35",
              )}
            >
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: ROLE_META[r].light }}
              />
              {ROLE_META[r].line}
            </p>
          ))}
        </div>
        <p className="mt-6 max-w-sm text-base leading-relaxed text-white/70">
          Tasks, bookings, schedules and teams for the whole fest, in one place.
        </p>
      </div>
      <div className="relative z-10 min-h-[4.5rem]">
        <PosterCountdown info={info} />
      </div>
    </aside>
  );
}

// On phones the poster becomes a slim band at the top.
function Band({ info }: { info: PublicInfo | null }) {
  const c = useCountdown(info?.event?.startsAt);
  let line = "";
  if (info?.event && c) line = c.live ? `${info.event.name} is live now` : `${info.event.name} opens in ${c.days}d ${c.hours}h`;
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6 lg:hidden"
      style={{ backgroundColor: INK }}
    >
      <Brand onDark />
      {line && <p className="text-sm text-white/75">{line}</p>}
    </div>
  );
}

export function AuthFrame({ active, children }: { active: Role; children: ReactNode }) {
  const info = usePublicInfo();
  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      <Poster active={active} info={info} />
      <div className="flex min-h-screen flex-col">
        <Band info={info} />
        <div className="flex justify-end px-4 pt-3 sm:px-6">
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">{children}</main>
        <p className="px-6 pb-6 text-center text-xs text-muted-foreground">
          Trouble signing in? Ask an event administrator.
        </p>
      </div>
    </div>
  );
}

// ---------- The pass ----------

// The coloured strip at the top of the card. A small slot at the top makes it read as a lanyard pass.
export function PassHeader({ role }: { role: Role }) {
  const Icon = ROLE_ICON[role];
  return (
    <div
      className="relative flex items-center justify-between px-6 pb-4 pt-7 text-white transition-colors duration-300 motion-reduce:transition-none"
      style={{ backgroundColor: "var(--role)" }}
    >
      <span aria-hidden className="absolute left-1/2 top-2.5 h-1.5 w-14 -translate-x-1/2 rounded-full bg-black/25" />
      <div>
        <p className="font-display text-xl font-bold leading-tight">{ROLE_META[role].pass}</p>
        <p className="text-sm text-white/85">EventOps</p>
      </div>
      <Icon aria-hidden className="h-9 w-9 text-white/90" />
    </div>
  );
}

// ---------- Form pieces ----------

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-base outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[var(--role)] aria-[invalid=true]:border-destructive";

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  invalid?: boolean;
  hint?: string;
  placeholder?: string;
};

export function TextField({
  type = "text",
  inputMode,
  ...p
}: FieldProps & { type?: "text" | "email"; inputMode?: "email" | "text" }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {p.label}
      </label>
      <input
        id={id}
        ref={p.inputRef}
        type={type}
        inputMode={inputMode}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        autoComplete={p.autoComplete}
        placeholder={p.placeholder}
        aria-invalid={p.invalid || undefined}
        aria-describedby={p.hint ? `${id}-hint` : undefined}
        autoCapitalize="none"
        spellCheck={false}
        className={inputCls}
      />
      {p.hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {p.hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField(p: FieldProps) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {p.label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={p.inputRef}
          type={show ? "text" : "password"}
          value={p.value}
          onChange={(e) => p.onChange(e.target.value)}
          autoComplete={p.autoComplete}
          aria-invalid={p.invalid || undefined}
          aria-describedby={p.hint ? `${id}-hint` : undefined}
          className={cn(inputCls, "pr-12")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--role)]"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {p.hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {p.hint}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ problem, hint, children }: { problem: string; hint: string; children?: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm">
      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className="font-semibold">{problem}</p>
        <p className="text-muted-foreground">{hint}</p>
        {children}
      </div>
    </div>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-white transition-[filter,background-color] duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--role)] focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-wait disabled:opacity-80 motion-reduce:transition-none"
      style={{ backgroundColor: "var(--role)" }}
    >
      {busy && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  );
}
