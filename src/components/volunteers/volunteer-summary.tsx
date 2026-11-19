import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/admin-ui";
import { currentSlot } from "@/lib/slots";
import { useVolunteerOverview } from "@/lib/use-volunteer-overview";

// A small panel for the Overview page: where each volunteer stands, at a glance.
export function VolunteerSummary() {
  const { data, error, now } = useVolunteerOverview();
  if (error || !data) return null; // the full Volunteers page explains any problem; Overview stays quiet

  return (
    <section className="panel mb-4 p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Volunteers</h2>
        <Link to="/admin/volunteers" className="text-sm font-medium underline underline-offset-4">
          Manage volunteers
        </Link>
      </div>
      {data.volunteers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No volunteers yet. Add one to start assigning work.</p>
      ) : (
        <ul className="grid gap-2">
          {data.volunteers.map((p) => {
            const done = p.tasks.filter((t) => t.status === "Done").length;
            const blocked = p.tasks.filter((t) => t.status === "Blocked").length;
            const going = p.tasks.filter((t) => t.status === "In Progress").length;
            const missed =
              p.shift.openSince === null && currentSlot(data.slots.filter((sl) => sl.userId === p.id), now) !== undefined;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{p.name}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {missed && <StatusBadge tone="warning">Not checked in</StatusBadge>}
                  {p.shift.openSince !== null && <StatusBadge tone="success">On duty</StatusBadge>}
                  {blocked > 0 && <StatusBadge tone="danger">{blocked} blocked</StatusBadge>}
                  {going > 0 && <StatusBadge tone="info">{going} in progress</StatusBadge>}
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {done} of {p.tasks.length} done
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
