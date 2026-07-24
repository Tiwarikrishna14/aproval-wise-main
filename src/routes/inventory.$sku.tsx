import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, ArrowLeft, Plus, RotateCcw } from "lucide-react";

import { DataError, EmptyState, TableMessageRow } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventoryItem } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/inventory/$sku")({
  head: () => ({ meta: [{ title: "Stock Details - StockFlow B2B" }] }),
  component: StockDetail,
});

function StockDetail() {
  const { sku } = Route.useParams();
  const { data: item, isLoading, isError, error } = useInventoryItem(sku);

  if (isLoading) return <EmptyState message="Loading stock item from backend..." />;
  if (isError) return <DataError message={`Failed to load stock item: ${error.message}`} />;
  if (!item) return <EmptyState message="Stock item was not returned by backend." />;

  const threshold = item.threshold ?? 0;
  const available = item.available ?? 0;
  const stockPct =
    threshold > 0 ? Math.min(100, Math.round((available / (threshold * 2)) * 100)) : 0;
  const transactions = item.transactions ?? [];
  const movement = item.movement ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/inventory">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Inventory
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{item.name}</h2>
              {item.status && <StatusBadge status={item.status} />}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              SKU {item.sku} - {item.category ?? "-"}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <Stat label="Available" value={item.available} tone="primary" />
              <Stat label="Reserved" value={item.reserved} />
              <Stat label="Consumed" value={item.consumed} />
              <Stat label="Reorder Threshold" value={item.threshold} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/stock-requests/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Request Stock
              </Link>
            </Button>
            <Button variant="outline" disabled>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Decline / Return
            </Button>
            <Button variant="outline" disabled>
              <Archive className="mr-1.5 h-4 w-4" />
              Archive
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Stock level</span>
            <span className="tabular-nums font-medium">
              {item.available ?? "-"} available - reorder at {item.threshold ?? "-"} - recommended{" "}
              {item.reorder ?? "-"}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full ${
                item.status === "Out of Stock"
                  ? "bg-destructive"
                  : item.status === "Low Stock"
                    ? "bg-warning"
                    : "bg-success"
              }`}
              style={{ width: `${Math.max(stockPct, 0)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card">
          <Tabs defaultValue="overview">
            <div className="border-b border-border px-3 pt-2">
              <TabsList className="h-10 bg-transparent gap-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="txns">Transaction History</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="p-6">
              <h4 className="text-sm font-semibold">Stock Movement</h4>
              {movement.length === 0 ? (
                <div className="mt-3 text-sm text-muted-foreground">
                  No stock movement returned by backend.
                </div>
              ) : (
                <div className="mt-4 grid h-56 grid-cols-10 items-end gap-2">
                  {movement.map((point, index) => (
                    <div
                      key={point.label ?? index}
                      className="flex h-full items-end justify-center gap-0.5"
                    >
                      <Bar value={point.received} color="bg-success/80" />
                      <Bar value={point.consumed} color="bg-destructive/70" />
                      <Bar value={point.reserved} color="bg-primary/70" />
                      <Bar value={point.returned} color="bg-warning/70" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="txns" className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Date</th>
                      <th className="px-5 py-3 text-left font-medium">Type</th>
                      <th className="px-5 py-3 text-right font-medium">Quantity</th>
                      <th className="px-5 py-3 text-left font-medium">Reference</th>
                      <th className="px-5 py-3 text-left font-medium">By</th>
                      <th className="px-5 py-3 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <TableMessageRow columns={6} message="No transactions returned by backend." />
                    ) : (
                      transactions.map((transaction, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="px-5 py-3 text-muted-foreground">
                            {transaction.date ?? "-"}
                          </td>
                          <td className="px-5 py-3">{transaction.type ?? "-"}</td>
                          <td className="px-5 py-3 text-right tabular-nums font-medium">
                            {transaction.qty ?? "-"}
                          </td>
                          <td className="px-5 py-3">{transaction.ref ?? "-"}</td>
                          <td className="px-5 py-3">{transaction.by ?? "-"}</td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {transaction.notes ?? "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Reorder Threshold
                  </label>
                  <input className="input" value={item.threshold ?? ""} readOnly />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Recommended Reorder Qty
                  </label>
                  <input className="input" value={item.reorder ?? ""} readOnly />
                </div>
                <div className="sm:col-span-2">
                  <Button disabled>Save</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="h-fit space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recommended action
            </div>
            <div className="mt-2 text-sm">
              {item.reorder
                ? `Reorder ${item.reorder} units based on backend recommendation.`
                : "No reorder recommendation returned by backend."}
            </div>
            <Button className="mt-3 w-full" asChild>
              <Link to="/stock-requests/new">Request Stock</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number | string;
  tone?: "primary";
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 text-xl font-semibold tabular-nums ${tone === "primary" ? "text-primary" : ""}`}
      >
        {value ?? "-"}
      </div>
    </div>
  );
}

function Bar({ value, color }: { value?: number; color: string }) {
  return (
    <div
      className={`w-2 rounded-t ${color}`}
      style={{ height: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
    />
  );
}
