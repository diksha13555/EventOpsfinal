import { budgetPct } from "@/lib/event-selectors";
import { useEventStore } from "@/lib/event-store";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const lakh = (n: number) => `₹${(n / 100000).toFixed(2)}L`;

export function BudgetTracker() {
  const { state } = useEventStore();
  const spent = state.budget.reduce((sum, b) => sum + b.spent, 0);
  const total = state.budget.reduce((sum, b) => sum + b.total, 0);

  return (
    <section className="panel p-5">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">Total spent</p>
        <p className="font-display text-3xl font-bold tabular-nums">
          {lakh(spent)} <span className="text-lg font-medium text-muted-foreground">of {lakh(total)}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {state.budget.map((b) => {
          const pct = budgetPct(b.spent, b.total);
          return (
            <div key={b.head} className="rounded-lg border border-border p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold">{b.head}</p>
                <p className="font-display text-lg font-bold tabular-nums">{pct}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                {rupees(b.spent)} of {rupees(b.total)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
