import { MapPin, Package } from "lucide-react";
import type { ResourceStatus } from "@/lib/event-data";
import { useEventStore } from "@/lib/event-store";
import { cn } from "@/lib/utils";
import { StatusBadge, type Tone } from "./admin-ui";

const statusTone: Record<ResourceStatus, Tone> = {
  Booked: "success",
  Conflict: "danger",
  Free: "neutral",
  Pending: "warning",
};

export function ResourceBooking() {
  const { state } = useEventStore();

  return (
    <section className="panel p-5">
      <h2 className="mb-4 text-base font-semibold">Resource booking</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {state.resources.map((r) => {
          const Icon = r.kind === "venue" ? MapPin : Package;
          return (
            <div
              key={r.id}
              className={cn(
                "rounded-lg border border-border p-4",
                r.status === "Conflict" && "border-destructive/50",
              )}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 text-muted-foreground" /> {r.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{r.slot}</p>
              <div className="mt-3">
                <StatusBadge tone={statusTone[r.status]}>{r.status}</StatusBadge>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
