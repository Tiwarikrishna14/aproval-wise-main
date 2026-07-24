import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Filter, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { TableLoadingRows, TableMessageRow } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrders } from "@/hooks/use-orders";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Orders - StockFlow B2B" },
      { name: "description", content: "Manage all orders, drafts, approvals and deliveries." },
    ],
  }),
  component: OrdersPage,
});

const TABS = [
  "All Orders",
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "In Transit",
  "Delivered",
  "Rejected",
  "Cancelled",
];

function OrdersPage() {
  const { data: orders = [], isLoading, isError, error } = useOrders();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Orders"
        description="Create, track and manage every order across your organization."
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
            <Button asChild>
              <Link to="/orders/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Create Order
              </Link>
            </Button>
          </>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <Tabs defaultValue="All Orders">
          <div className="border-b border-border px-3 pt-2">
            <TabsList className="h-10 bg-transparent p-0 gap-1 flex-wrap">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none h-8 rounded-md text-[13px] font-medium text-muted-foreground"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                placeholder="Search by order number, product, branch..."
              />
            </div>
            <Button variant="outline" size="sm" disabled>
              <Filter className="mr-1.5 h-4 w-4" />
              Status
            </Button>
            <Button variant="outline" size="sm" disabled>
              Date range
            </Button>
            <Button variant="outline" size="sm" disabled>
              Amount
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-10 pl-4">
                    <input type="checkbox" className="rounded border-border" disabled />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Products</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Required</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Current Step</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableLoadingRows columns={10} />
                ) : isError ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-destructive">
                      Failed to load orders: {error.message}
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <TableMessageRow columns={10} message="No orders returned by backend." />
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-t border-border hover:bg-surface/50">
                      <td className="pl-4">
                        <input type="checkbox" className="rounded border-border" disabled />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to="/orders/$id"
                          params={{ id: order.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {order.id}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">
                          {order.branch ?? "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.createdDate ?? "-"}
                      </td>
                      <td className="px-4 py-3 max-w-[240px] truncate">{order.products ?? "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{order.totalQty ?? "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatMoney(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.requiredDate ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {order.status ? <StatusBadge status={order.status} /> : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.currentStep ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/orders/$id" params={{ id: order.id }}>
                            Open
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <div>
              Showing {orders.length ? `1-${orders.length}` : "0"} of {orders.length} orders
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled>
                1
              </Button>
              <Button size="sm" variant="outline" disabled>
                Next
              </Button>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "-";
  return `INR ${value.toLocaleString("en-IN")}`;
}
