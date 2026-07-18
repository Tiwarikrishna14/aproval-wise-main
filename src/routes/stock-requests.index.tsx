import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { stockRequests } from "@/lib/sample-data";

export const Route = createFileRoute("/stock-requests/")({
  head: () => ({ meta: [{ title: "Stock Requests — StockFlow B2B" }] }),
  component: StockRequestsPage,
});

function StockRequestsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Stock Requests"
        description="Raise, review and track stock replenishment requests."
        actions={<Button asChild><Link to="/stock-requests/new"><Plus className="mr-1.5 h-4 w-4" />New Request</Link></Button>}
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="text-sm text-muted-foreground">Showing 5 open requests</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Filter className="mr-1.5 h-4 w-4" />Status</Button>
            <Button variant="outline" size="sm">Priority</Button>
            <Button variant="outline" size="sm">Date</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Request</th>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-left font-medium">Required</th>
                <th className="px-4 py-3 text-left font-medium">Priority</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Current Approver</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {stockRequests.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium text-primary">{r.id}</td>
                  <td className="px-4 py-3">{r.product}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.qty}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.requiredDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.priority} /></td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">{r.approver}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.created}</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
