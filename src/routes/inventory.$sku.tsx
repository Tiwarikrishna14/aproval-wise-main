import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Archive, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { inventory } from "@/lib/sample-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/inventory/$sku")({
  head: () => ({ meta: [{ title: "Stock Details — StockFlow B2B" }] }),
  component: StockDetail,
});

function StockDetail() {
  const { sku } = Route.useParams();
  const p = inventory.find((i) => i.sku === sku) ?? inventory[0];
  const stockPct = Math.min(100, Math.round((p.available / Math.max(p.threshold * 2, 1)) * 100));

  const txns = [
    { date: "10 Jul 2026", type: "Consumption", qty: -18, ref: "ORD-2026-1047", by: "System", notes: "Auto-consume on delivery" },
    { date: "08 Jul 2026", type: "Stock Received", qty: 120, ref: "PO-2026-0450", by: "Amit Kumar", notes: "Warehouse intake" },
    { date: "07 Jul 2026", type: "Reservation", qty: -20, ref: "ORD-2026-1048", by: "Priya Verma", notes: "Reserved for approval" },
    { date: "05 Jul 2026", type: "Return", qty: 12, ref: "RT-2026-005", by: "Warehouse", notes: "Damaged goods returned" },
    { date: "02 Jul 2026", type: "Adjustment", qty: -3, ref: "ADJ-2026-011", by: "Amit Kumar", notes: "Physical count correction" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/inventory"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Inventory</Link></Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{p.name}</h2>
              <StatusBadge status={p.status} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">SKU {p.sku} · {p.category}</div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <Stat label="Available" value={p.available} tone="primary" />
              <Stat label="Reserved" value={p.reserved} />
              <Stat label="Consumed" value={p.consumed} />
              <Stat label="Reorder Threshold" value={p.threshold} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/stock-requests/new"><Plus className="mr-1.5 h-4 w-4" />Request Stock</Link></Button>
            <Button variant="outline"><RotateCcw className="mr-1.5 h-4 w-4" />Decline / Return</Button>
            <Button variant="outline"><Archive className="mr-1.5 h-4 w-4" />Archive</Button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Stock level</span>
            <span className="tabular-nums font-medium">{p.available} available · reorder at {p.threshold} · recommended {p.reorder}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div className={`h-full ${p.status === "Out of Stock" ? "bg-destructive" : p.status === "Low Stock" ? "bg-warning" : "bg-success"}`} style={{ width: `${Math.max(stockPct, 6)}%` }} />
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
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="requests">Requests</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="p-6">
              <h4 className="text-sm font-semibold">Stock Movement — Last 30 days</h4>
              <div className="mt-3 mb-2 flex gap-4 text-xs text-muted-foreground">
                <Legend color="bg-success" label="Received" />
                <Legend color="bg-destructive" label="Consumed" />
                <Legend color="bg-primary" label="Reserved" />
                <Legend color="bg-warning" label="Returned" />
              </div>
              <div className="grid h-56 grid-cols-10 items-end gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex h-full items-end justify-center gap-0.5">
                    <div className="w-2 rounded-t bg-success/80" style={{ height: `${20 + Math.random() * 60}%` }} />
                    <div className="w-2 rounded-t bg-destructive/70" style={{ height: `${15 + Math.random() * 55}%` }} />
                    <div className="w-2 rounded-t bg-primary/70" style={{ height: `${10 + Math.random() * 45}%` }} />
                    <div className="w-2 rounded-t bg-warning/70" style={{ height: `${5 + Math.random() * 25}%` }} />
                  </div>
                ))}
              </div>
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
                    {txns.map((t, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-5 py-3 text-muted-foreground">{t.date}</td>
                        <td className="px-5 py-3"><StatusBadge status={t.type === "Stock Received" || t.type === "Return" ? "Healthy" : t.type === "Consumption" ? "Rejected" : "Under Review"} /></td>
                        <td className={`px-5 py-3 text-right tabular-nums font-medium ${t.qty > 0 ? "text-success" : "text-destructive"}`}>{t.qty > 0 ? "+" : ""}{t.qty}</td>
                        <td className="px-5 py-3">{t.ref}</td>
                        <td className="px-5 py-3">{t.by}</td>
                        <td className="px-5 py-3 text-muted-foreground">{t.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="p-6 text-sm text-muted-foreground">Orders that include this SKU are listed under the Orders module.</TabsContent>
            <TabsContent value="requests" className="p-6 text-sm text-muted-foreground">Stock requests for this SKU are listed under Stock Requests.</TabsContent>
            <TabsContent value="settings" className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                <div><label className="text-xs font-medium text-muted-foreground">Reorder Threshold</label><input className="input" defaultValue={p.threshold} /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Recommended Reorder Qty</label><input className="input" defaultValue={p.reorder} /></div>
                <div className="sm:col-span-2"><Button>Save</Button></div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="h-fit space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recommended action</div>
            <div className="mt-2 text-sm">Reorder <span className="font-semibold text-primary">{p.reorder} units</span> to return to healthy stock levels within 2 weeks.</div>
            <Button className="mt-3 w-full" asChild><Link to="/stock-requests/new">Request Stock</Link></Button>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Assigned Warehouse</div>
            <div className="mt-2 text-sm font-medium">Bhiwandi Central</div>
            <div className="text-xs text-muted-foreground">Amit Kumar · Stock Verifier</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "primary" }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${tone === "primary" ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-sm ${color}`} />{label}</span>;
}
