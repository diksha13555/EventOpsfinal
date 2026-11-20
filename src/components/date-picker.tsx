import * as Popover from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { fieldCls } from "@/components/admin-ui";
import { addDays, fromIso, startOfToday, toIso } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

// Colours the calendar with the site's own theme colour, in light and dark mode.
const themed = {
  "--rdp-accent-color": "var(--primary)",
  "--rdp-accent-background-color": "color-mix(in srgb, var(--primary) 15%, transparent)",
} as CSSProperties;

const chip =
  "rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/*
  A calendar pop-up for choosing a date. The value is "YYYY-MM-DD" text, or "" when no date is chosen,
  the same as the plain date box it replaces, so nothing on the server changes.
*/
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Pick a date",
  allowPast = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  allowPast?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = fromIso(value);
  const today = startOfToday();
  const pick = (d: Date) => {
    onChange(toIso(d));
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={selected ? `${label}: ${selected.toDateString()}. Change` : `${label}. Open calendar`}
          className={cn(fieldCls, "flex items-center justify-between gap-2 text-left", !selected && "text-muted-foreground")}
        >
          <span className="truncate">
            {selected
              ? selected.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
              : placeholder}
          </span>
          <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[60] rounded-lg border border-border bg-card p-3 text-foreground shadow-lg"
        >
          <div style={themed}>
            <DayPicker
              mode="single"
              selected={selected}
              defaultMonth={selected ?? today}
              disabled={allowPast ? undefined : { before: today }}
              onSelect={(d: Date | undefined) => d && pick(d)}
              autoFocus
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-3">
            <button type="button" className={chip} onClick={() => pick(today)}>
              Today
            </button>
            <button type="button" className={chip} onClick={() => pick(addDays(today, 1))}>
              Tomorrow
            </button>
            {value && (
              <button
                type="button"
                className={cn(chip, "ml-auto")}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear date
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
