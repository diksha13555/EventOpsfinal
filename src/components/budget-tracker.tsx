import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { compactRupees, rupees } from "@/lib/format";
import { budgetPct, budgetSummary, formatDue, spendingSeries, sponsorSummary, todayIso } from "@/lib/event-selectors";
import { useEventStore } from "@/lib/event-store";
import { useCountUp } from "@/lib/use-count-up";
import { StatusBadge, StatusDot, fieldCls, type Tone } from "./admin-ui";

const lineConfig = {
  planned: { label: "Planned pace", color: "var(--muted-foreground)" },
  spent: { label: "Spent", color: "var(--primary)" },
} satisfies ChartConfig;

const donutConfig = { value: { label: "Spent" } } satisfies ChartConfig;

// The thin line that shows where spending SHOULD be by today if the budget were spent evenly.
function PlannedMarker({ fraction }: { fraction: number }) {
  return (
    <span
      title="Planned pace by today"
      className="absolute -top-1 h-[calc(100%+8px)] w-0.5 rounded bg-foreground/60"
      style={{ left: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
    />
  );
}

function Bar({ pct, fraction, tone = "bg-primary" }: { pct: number; fraction: number; tone?: string }) {
  return (
    <div className="relative">
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <PlannedMarker fraction={fraction} />
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  line,
  caption,
}: {
  label: string;
  value: string;
  tone: Tone;
  line: string;
  caption: string;
}) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-2 flex items-center gap-2 text-sm font-medium">
        <StatusDot tone={tone} /> {line}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

export function BudgetTracker() {
  const { state, now, addExpense } = useEventStore();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(0);
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  const b = budgetSummary(state, now);
  const sp = sponsorSummary(state);
  const remaining = useCountUp(b.remaining);
  const series = useMemo(() => spendingSeries(state, now), [state, now]);
  const today = todayIso(now);
  const categoryName = (id: number) => state.budget.find((c) => c.id === id)?.head ?? "Unknown";

  const donut = state.budget
    .filter((c) => c.spent > 0)
    .map((c, i) => ({ name: c.head, value: c.spent, opacity: Math.max(0.25, 1 - i * 0.22) }));

  const openForm = () => {
    setCategoryId(state.budget[0]?.id ?? 0);
    setAmountText("");
    setNote("");
    setDate(today);
    setError("");
    setOpen(true);
  };

  const chosen = state.budget.find((c) => c.id === categoryId);
  const amount = Number(amountText);
  const validAmount = Number.isInteger(amount) && amount >= 1 && amount <= 10_000_000;
  const afterPct = chosen && validAmount ? budgetPct(chosen.spent + amount, chosen.total) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen) return setError("Choose a category.");
    if (!validAmount) return setError("Enter a whole amount above zero (up to ₹1,00,00,000).");
    if (!date) return setError("Choose the date of the expense.");
    addExpense(chosen.id, amount, note.trim(), date);
    setOpen(false);
  };

  const pace: { tone: Tone; line: string } =
    b.aheadOfPlan > 0
      ? { tone: "warning", line: `${rupees(b.aheadOfPlan)} ahead of the planned pace` }
      : { tone: "success", line: `${rupees(-b.aheadOfPlan)} under the planned pace` };

  return (
    <div className="grid gap-4">
      {/* Headline: how much is left */}
      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Remaining budget</p>
            <p
              className={`font-display text-4xl font-bold tabular-nums sm:text-5xl ${
                b.remaining < 0 ? "text-destructive" : ""
              }`}
            >
              {rupees(remaining)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {rupees(b.spent)} spent of {rupees(b.total)} ({b.pct}%)
            </p>
          </div>
          <Button onClick={openForm}>
            <Plus /> Add expense
          </Button>
        </div>
        <div className="mt-5">
          <Bar pct={b.pct} fraction={b.fraction} tone={b.remaining < 0 ? "bg-destructive" : "bg-primary"} />
          <p className="mt-2 text-xs text-muted-foreground">
            The thin line marks where spending would be by today at an even pace.
          </p>
        </div>
      </section>

      {/* Three quick reads */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          label="Planned by today"
          value={rupees(b.plannedToDate)}
          tone={pace.tone}
          line={pace.line}
          caption="The total budget spread evenly over the 3 weeks before the event."
        />
        <Kpi
          label="Forecast at the event"
          value={b.forecast === null ? "Not enough data yet" : rupees(b.forecast)}
          tone={b.forecastGap === null ? "neutral" : b.forecastGap >= 0 ? "success" : "danger"}
          line={
            b.forecastGap === null
              ? "Needs at least one day of spending"
              : b.forecastGap >= 0
                ? `${rupees(b.forecastGap)} under budget`
                : `${rupees(-b.forecastGap)} over budget`
          }
          caption="Spending so far, continued at the same daily pace."
        />
        <Kpi
          label="Sponsor money received"
          value={rupees(sp.paid)}
          tone={sp.net >= 0 ? "success" : "warning"}
          line={sp.net >= 0 ? `${rupees(sp.net)} left after spending` : `Spending is ${rupees(-sp.net)} ahead of it`}
          caption={`${rupees(sp.pending)} more is still to come.`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="panel p-5 lg:col-span-2">
          <h2 className="mb-2 text-base font-semibold">Where the money went</h2>
          {donut.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No spending yet.</p>
          ) : (
            <>
              <ChartContainer config={donutConfig} className="mx-auto aspect-auto h-48 w-full">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, name) => (
                          <span className="tabular-nums">
                            {String(name)}: {rupees(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={donut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="var(--card)"
                    isAnimationActive={false}
                  >
                    {donut.map((d) => (
                      <Cell key={d.name} fill="var(--primary)" fillOpacity={d.opacity} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="mt-3 grid gap-1.5 text-sm">
                {donut.map((d) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary" style={{ opacity: d.opacity }} />
                    <span className="flex-1">{d.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {rupees(d.value)} · {Math.round((d.value / b.spent) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel p-5 lg:col-span-3">
          <h2 className="mb-2 text-base font-semibold">Spent vs planned pace</h2>
          <ChartContainer config={lineConfig} className="aspect-auto h-64 w-full">
            <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDue}
                tickLine={false}
                axisLine={false}
                interval={4}
                tickMargin={8}
              />
              <YAxis tickFormatter={compactRupees} tickLine={false} axisLine={false} width={58} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => formatDue(String(label))}
                    formatter={(value, name) => (
                      <span className="tabular-nums">
                        {lineConfig[name as keyof typeof lineConfig]?.label ?? String(name)}: {rupees(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <ReferenceLine x={today} stroke="var(--border)" strokeDasharray="4 4" />
              <Line
                dataKey="planned"
                type="linear"
                stroke="var(--color-planned)"
                strokeWidth={2}
                strokeDasharray="6 5"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="spent"
                type="stepAfter"
                stroke="var(--color-spent)"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-primary" /> Spent so far
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 border-t-2 border-dashed border-muted-foreground" /> Planned pace
            </span>
            <span>The vertical line is today.</span>
          </p>
        </section>
      </div>

      {/* Categories */}
      <section className="panel p-5">
        <h2 className="mb-4 text-base font-semibold">By category</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {state.budget.map((c) => {
            const pct = budgetPct(c.spent, c.total);
            return (
              <div key={c.id} className="rounded-lg border border-border p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{c.head}</p>
                  <p className="font-display text-lg font-bold tabular-nums">{pct}%</p>
                </div>
                <div className="mt-3">
                  <Bar pct={pct} fraction={b.fraction} tone={pct > 100 ? "bg-destructive" : "bg-primary"} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {rupees(c.spent)} of {rupees(c.total)}
                </p>
                {pct > 100 ? (
                  <div className="mt-2">
                    <StatusBadge tone="danger">Over budget</StatusBadge>
                  </div>
                ) : pct >= 85 ? (
                  <div className="mt-2">
                    <StatusBadge tone="warning">Near the limit</StatusBadge>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent expenses */}
      <section className="panel p-5">
        <h2 className="mb-4 text-base font-semibold">Recent expenses</h2>
        {state.expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses yet. Use "Add expense" to record one.</p>
        ) : (
          <ul className="grid divide-y divide-border">
            {state.expenses.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.note || categoryName(e.categoryId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryName(e.categoryId)} · {formatDue(e.spentOn)}
                    {e.id < 0 && " · Saving…"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{rupees(e.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an expense</DialogTitle>
            <DialogDescription>It is added to the category total and updates every number straight away.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Category
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className={fieldCls}
              >
                {state.budget.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.head}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Amount (₹)
                <input
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  placeholder="e.g. 50000"
                  className={fieldCls}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-medium">
              Note (optional)
              <input
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was it for?"
                className={fieldCls}
              />
            </label>
            {afterPct !== null && afterPct >= 85 && (
              <p className="text-sm text-muted-foreground">
                This puts {chosen?.head} at {afterPct}% of its budget{afterPct > 100 ? ", which is over the limit" : ""}.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="ml-auto">
              <Plus /> Add expense
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
