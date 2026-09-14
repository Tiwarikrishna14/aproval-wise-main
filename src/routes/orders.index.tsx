import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { TableLoadingRows, TableMessageRow } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, isCustomerAccountUser } from "@/lib/permissions";
import { useOrders } from "@/hooks/use-orders";
import {
  orderItems,
  orderPageResponse,
  orderRecords,
  orderStatuses,
  type OrderResponse,
} from "@/services/orders-api.service";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Orders - Akribiz B2B" },
      { name: "description", content: "Manage all orders, drafts, approvals and deliveries." },
    ],
  }),
  component: OrdersPage,
});

const pageSizes = [10, 20, 50, 100];

function OrdersPage() {
  const { user } = useAuth();
  const customerUser = isCustomerAccountUser(user);
  const canView = customerUser || hasPermission(user, "ORDER_VIEW");
  const canCreate = customerUser || hasPermission(user, "ORDER_CREATE");
  const [status, setStatus] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const ordersQuery = useOrders({
    page,
    size,
    status: status || undefined,
    orderNumber: submittedOrderNumber || undefined,
    businessCustomerId: customerUser ? user?.businessCustomerId : undefined,
    sort: ["createdAt,desc"],
  });

  const orders = orderRecords(ordersQuery.data);
  const pageResponse = orderPageResponse(ordersQuery.data);
  const totalElements = pageResponse?.totalElements ?? orders.length;
  const totalPages = pageResponse?.totalPages ?? (orders.length ? 1 : 0);
  const pageStart = totalElements === 0 ? 0 : page * size + 1;
  const pageEnd = totalElements === 0 ? 0 : Math.min(page * size + orders.length, totalElements);

  function applySearch() {
    setPage(0);
    setSubmittedOrderNumber(orderNumber.trim());
  }

  function handleStatusChange(value: string) {
    setPage(0);
    setStatus(value);
  }

  function handleSizeChange(value: string) {
    setPage(0);
    setSize(Number(value));
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-[1400px] rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        Order access requires ORDER_VIEW.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title={customerUser ? "My Orders" : "Orders"}
        description="Create, track, approve, submit, and manage orders."
        actions={
          canCreate ? (
            <Button asChild>
              <Link to="/orders/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Create Order
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
              placeholder="Search order number"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(event) => handleStatusChange(event.target.value)}
          >
            <option value="">All statuses</option>
            {orderStatuses.map((item) => (
              <option key={item} value={item}>
                {formatStatus(item)}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={applySearch}>
            Apply
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Products</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Priority</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {ordersQuery.isLoading ? (
                <TableLoadingRows columns={8} />
              ) : ordersQuery.isError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-destructive">
                    Failed to load orders: {ordersQuery.error.message}
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <TableMessageRow columns={8} message="No orders returned  ." />
              ) : (
                orders.map((order) => <OrderRow key={order.id} order={order} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            {totalElements ? `Showing ${pageStart}-${pageEnd} of ${totalElements}` : "No orders"}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="orders-page-size" className="text-xs">
              Rows
            </Label>
            <select
              id="orders-page-size"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={size}
              onChange={(event) => handleSizeChange(event.target.value)}
            >
              {pageSizes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="mx-2 text-xs">
              Page {totalPages ? page + 1 : 0} of {totalPages || 0}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 0 || ordersQuery.isLoading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={ordersQuery.isLoading || totalPages === 0 || page >= totalPages - 1}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: OrderResponse }) {
  const items = orderItems(order);

  return (
    <tr className="border-t border-border hover:bg-surface/50">
      <td className="px-4 py-3">
        <Link
          to="/orders/$id"
          params={{ id: String(order.id) }}
          className="font-medium text-primary hover:underline"
        >
          {order.orderNumber || order.id}
        </Link>
        <div className="text-[11px] text-muted-foreground">
          {order.referenceNumber ? `Ref ${order.referenceNumber}` : order.location || "-"}
        </div>
      </td>
      <td className="px-4 py-3">
        <div>{order.businessCustomerName || "-"}</div>
        <div className="text-xs text-muted-foreground">{order.businessCustomerCode || "-"}</div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{items.length}</td>
      <td className="px-4 py-3 text-right tabular-nums font-medium">
        {formatMoney(order.totalAmount)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{order.priority || "-"}</td>
      <td className="px-4 py-3">
        {order.status ? <StatusBadge status={formatStatus(order.status)} /> : "-"}
      </td>
      <td className="px-4 py-3 text-right">
        <Button size="sm" variant="ghost" asChild>
          <Link to="/orders/$id" params={{ id: String(order.id) }}>
            Open
          </Link>
        </Button>
      </td>
    </tr>
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "-";
  return `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "-";
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}
