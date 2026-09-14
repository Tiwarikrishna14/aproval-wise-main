import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { DataError, TableLoadingRows, TableMessageRow } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { hasAnyPermission } from "@/lib/permissions";
import { useOrders } from "@/hooks/use-orders";
import {
  orderItems,
  orderPageResponse,
  orderRecords,
  type OrderResponse,
} from "@/services/orders-api.service";

export const Route = createFileRoute("/approvals/")({
  head: () => ({ meta: [{ title: "Approval Queue - Akribiz B2B" }] }),
  component: ApprovalsPage,
});

const approvalStatuses = ["CREATED", "CHANGES_REQUESTED", "APPROVED", "REJECTED"];

function ApprovalsPage() {
  const { user } = useAuth();
  const canReview = hasAnyPermission(user, ["ORDER_REVIEW", "ORDER_APPROVE", "ORDER_REJECT"]);
  const [status, setStatus] = useState("CREATED");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const ordersQuery = useOrders({
    page,
    size,
    status: status || undefined,
    sort: ["createdAt,desc"],
  });
  const orders = orderRecords(ordersQuery.data);
  const pageResponse = orderPageResponse(ordersQuery.data);
  const totalElements = pageResponse?.totalElements ?? orders.length;
  const totalPages = pageResponse?.totalPages ?? (orders.length ? 1 : 0);

  if (!canReview) {
    return (
      <div className="mx-auto max-w-[1400px] rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        Approval queue requires ORDER_REVIEW, ORDER_APPROVE, or ORDER_REJECT.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Approval Queue"
        description="Orders returned   for review. Open an order to approve, reject, or request changes."
      />

      {ordersQuery.isError ? (
        <DataError message={`Failed to load approvals: ${ordersQuery.error.message}`} />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xs flex-1 space-y-2">
              <Label htmlFor="approval-status">Status</Label>
              <select
                id="approval-status"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(event) => {
                  setPage(0);
                  setStatus(event.target.value);
                }}
              >
                <option value="">All statuses</option>
                {approvalStatuses.map((item) => (
                  <option key={item} value={item}>
                    {formatStatus(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-right font-medium">Products</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Priority</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ordersQuery.isLoading ? (
                  <TableLoadingRows columns={7} />
                ) : orders.length === 0 ? (
                  <TableMessageRow columns={7} message="No approval orders returned  ." />
                ) : (
                  orders.map((order) => <ApprovalOrderRow key={order.id} order={order} />)
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>{totalElements ? `${totalElements} order(s)` : "No orders"}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="approval-page-size" className="text-xs">
                Rows
              </Label>
              <select
                id="approval-page-size"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={size}
                onChange={(event) => {
                  setPage(0);
                  setSize(Number(event.target.value));
                }}
              >
                {[10, 20, 50].map((item) => (
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
      )}
    </div>
  );
}

function ApprovalOrderRow({ order }: { order: OrderResponse }) {
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
        <div className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
      </td>
      <td className="px-4 py-3">
        <div>{order.businessCustomerName || "-"}</div>
        <div className="text-xs text-muted-foreground">{order.businessCustomerCode || "-"}</div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{orderItems(order).length}</td>
      <td className="px-4 py-3 text-right font-medium tabular-nums">
        {formatMoney(order.totalAmount)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{order.priority || "-"}</td>
      <td className="px-4 py-3">
        {order.status ? <StatusBadge status={formatStatus(order.status)} /> : "-"}
      </td>
      <td className="px-4 py-3 text-right">
        <Button size="sm" asChild>
          <Link to="/orders/$id" params={{ id: String(order.id) }}>
            Review
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
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
