import { createFileRoute } from "@tanstack/react-router";

import { DataError, TableLoadingRows, TableMessageRow } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useStockVerification } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/stock-verification")({
  head: () => ({ meta: [{ title: "Stock Verification - StockFlow B2B" }] }),
  component: StockVerify,
});

function StockVerify() {
  const { data: items = [], isLoading, isError, error } = useStockVerification();
  const totalReq = items.reduce((sum, item) => sum + (item.req ?? 0), 0);
  const totalAvail = items.reduce((sum, item) => sum + Math.min(item.req ?? 0, item.avail ?? 0), 0);
  const totalShort = items.reduce((sum, item) => sum + (item.shortage ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Stock Verification"
        description="Confirm stock availability before an order proceeds to the next approval step."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card label="Total Requested" value={totalReq} />
        <Card label="Total Available" value={totalAvail} tone="success" />
        <Card label="Total Shortage" value={totalShort} tone="destructive" />
        <Card label="Items" value={items.length} />
      </div>

      {isError ? (
        <DataError message={`Failed to load stock verification data: ${error.message}`} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Requested</th>
                <th className="px-4 py-3 text-right font-medium">Warehouse</th>
                <th className="px-4 py-3 text-right font-medium">Reserved</th>
                <th className="px-4 py-3 text-right font-medium">Approved Qty</th>
                <th className="px-4 py-3 text-right font-medium">Shortage</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoadingRows columns={9} />
              ) : items.length === 0 ? (
                <TableMessageRow
                  columns={9}
                  message="No stock verification items returned by backend."
                />
              ) : (
                items.map((item) => (
                  <tr key={item.id ?? item.sku} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.req ?? "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.avail ?? "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.reserved ?? "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.approved ?? "-"}</td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium ${
                        (item.shortage ?? 0) > 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {item.shortage ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {item.status ? <StatusBadge status={item.status} /> : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <input className="input h-8" placeholder="Add note" disabled />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" disabled>
                        Suggest Alt.
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled>
          Send Back
        </Button>
        <Button variant="outline" disabled>
          Reject Item
        </Button>
        <Button variant="outline" disabled>
          Suggest Alternative
        </Button>
        <Button variant="outline" disabled>
          Partially Approve
        </Button>
        <Button disabled>Confirm Stock</Button>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "success" | "destructive";
}) {
  const color =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
