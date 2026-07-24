import { createFileRoute, Link } from "@tanstack/react-router";
import { Filter, Plus } from "lucide-react";

import { DataError, TableLoadingRows, TableMessageRow } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useStockRequests } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/stock-requests/")({
  head: () => ({ meta: [{ title: "Stock Requests - StockFlow B2B" }] }),
  component: StockRequestsPage,
});

function StockRequestsPage() {
  const { data: requests = [], isLoading, isError, error } = useStockRequests();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Stock Requests"
        description="Raise, review and track stock replenishment requests."
        actions={
          <Button asChild>
            <Link to="/stock-requests/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New Request
            </Link>
          </Button>
        }
      />

      {isError ? (
        <DataError message={`Failed to load stock requests: ${error.message}`} />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="text-sm text-muted-foreground">
              Showing {requests.length} requests from backend
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <Filter className="mr-1.5 h-4 w-4" />
                Status
              </Button>
              <Button variant="outline" size="sm" disabled>
                Priority
              </Button>
              <Button variant="outline" size="sm" disabled>
                Date
              </Button>
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
                {isLoading ? (
                  <TableLoadingRows columns={9} />
                ) : requests.length === 0 ? (
                  <TableMessageRow columns={9} message="No stock requests returned by backend." />
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="border-t border-border hover:bg-surface/50">
                      <td className="px-4 py-3 font-medium text-primary">{request.id}</td>
                      <td className="px-4 py-3">{request.product ?? request.sku ?? "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{request.qty ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {request.requiredDate ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {request.priority ? <StatusBadge status={request.priority} /> : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {request.status ? <StatusBadge status={request.status} /> : "-"}
                      </td>
                      <td className="px-4 py-3">{request.approver ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{request.created ?? "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" disabled>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
