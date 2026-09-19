import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Pencil, Send, Truck, Undo2, XCircle } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { DataError, EmptyState, TableMessageRow } from "@/components/data-state";
import { OrderForm } from "@/components/orders/order-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { hasAnyPermission, hasPermission, isCustomerAccountUser } from "@/lib/permissions";
import { useOrder, ordersQueryKeys } from "@/hooks/use-orders";
import { usersApi, type ApproverUserResponse } from "@/services/admin-api.service";
import {
  editableOrderStatuses,
  orderItems,
  ordersApi,
  type ApprovalActionRequest,
  type OrderApproverResponse,
  type OrderItemResponse,
  type OrderMutationRequest,
  type OrderResponse,
  type SupplierActionRequest,
} from "@/services/orders-api.service";
import type { AuthUser } from "@/services/auth.service";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({ meta: [{ title: `Order ${params.id} - Akribiz B2B` }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [approvalRemark, setApprovalRemark] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [supplierAction, setSupplierAction] = useState<SupplierActionRequest["action"]>("PENDING");
  const [supplierExpectedDate, setSupplierExpectedDate] = useState("");
  const [supplierRemark, setSupplierRemark] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const orderQuery = useOrder(id);
  const approverUsersQuery = useQuery({
    queryKey: ["orders", "detail", id, "approver-users", orderQuery.data?.businessCustomerId],
    queryFn: async () => (await usersApi.approvers(orderQuery.data?.businessCustomerId ?? "")).data,
    enabled: Boolean(orderQuery.data?.businessCustomerId),
    retry: false,
  });

  const updateOrder = useMutation({
    mutationFn: (body: OrderMutationRequest) => ordersApi.update(id, body),
    onSuccess: async () => {
      toast.success("Order updated successfully");
      setEditOpen(false);
      await refreshOrder(queryClient, id);
    },
    onError: (error) => toast.error(error.message),
  });

  const approvalMutation = useMutation({
    mutationFn: (body: ApprovalActionRequest) => ordersApi.approve(id, body),
    onSuccess: async () => {
      toast.success("Approval action submitted");
      setApprovalRemark("");
      await refreshOrder(queryClient, id);
    },
    onError: (error) => toast.error(error.message),
  });

  const submitOrder = useMutation({
    mutationFn: () => ordersApi.submit(id),
    onSuccess: async () => {
      toast.success("Order submitted successfully");
      await refreshOrder(queryClient, id);
    },
    onError: (error) => toast.error(error.message),
  });

  const supplierMutation = useMutation({
    mutationFn: (body: SupplierActionRequest) => ordersApi.supplierAction(id, body),
    onSuccess: async () => {
      toast.success("Supplier action submitted");
      setSupplierRemark("");
      setSupplierExpectedDate("");
      await refreshOrder(queryClient, id);
    },
    onError: (error) => toast.error(error.message),
  });

  if (orderQuery.isLoading) return <EmptyState message="Loading order from backend..." />;
  if (orderQuery.isError) {
    return <DataError message={`Failed to load order: ${orderQuery.error.message}`} />;
  }
  if (!orderQuery.data) return <EmptyState message="Order was not returned  ." />;

  const order = orderQuery.data;
  const status = order.status ?? "";
  const items = orderItems(order);
  const approvers = order.approvers ?? [];
  const approverUsersById = new Map(
    (approverUsersQuery.data ?? []).map((approver) => [approver.userId, approver]),
  );
  const canEdit =
    editableOrderStatuses.includes(status) &&
    (isCustomerAccountUser(user) || hasPermission(user, "ORDER_UPDATE"));
  const canSubmit =
    status === "APPROVED" && hasAnyPermission(user, ["ORDER_SUBMIT", "ORDER_APPROVE"]);
  const canReview =
    isCustomerAccountUser(user) &&
    hasAnyPermission(user, ["ORDER_APPROVE", "ORDER_REJECT", "ORDER_REVIEW"]) &&
    approvers.some((approver) => isCurrentApprover(approver, user?.id, user?.email)) &&
    !isApprovalClosedStatus(status);
  const showApprovalActions = canReview;
  const supplierActions = supplierActionsForStatus(status);
  const activeSupplierAction =
    supplierActions.find((action) => action === supplierAction) ?? supplierActions[0];
  const supplierActionNeedsDate = needsExpectedDeliveryDate(activeSupplierAction);
  const canSupplierAct = supplierActions.length > 0 && canManageSupplierAction(user);

  function runApproval(action: ApprovalActionRequest["action"]) {
    setApprovalError("");
    const remark = approvalRemark.trim();
    if ((action === "REQUEST_CHANGES" || action === "REJECT") && !remark) {
      setApprovalError("Remark is required for request changes and reject.");
      return;
    }
    approvalMutation.mutate({ action, remark });
  }

  function runSupplierAction() {
    setSupplierError("");
    if (!activeSupplierAction) {
      setSupplierError("No supplier action is available for this order status.");
      return;
    }
    if (supplierActionNeedsDate && !supplierExpectedDate) {
      setSupplierError("Expected delivery date is required for pending and confirm.");
      return;
    }
    supplierMutation.mutate({
      action: activeSupplierAction,
      expectedDeliveryDate: supplierActionNeedsDate ? supplierExpectedDate : undefined,
      remark: supplierRemark.trim(),
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/orders">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Order {order.orderNumber || order.id}
              </h2>
              {status ? <StatusBadge status={formatStatus(status)} /> : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <Meta k="Customer" v={order.businessCustomerName || order.businessCustomerCode} />
              <Meta k="Created" v={formatDate(order.createdAt)} />
              <Meta k="Reference" v={order.referenceNumber} />
              <Meta
                k="Location"
                v={
                  order.locationDetails
                    ? [
                        order.locationDetails.locationCode,
                        order.locationDetails.locationName,
                        order.locationDetails.city,
                      ]
                        .filter(Boolean)
                        .join(" - ")
                    : order.location
                }
              />
              <Meta k="Priority" v={order.priority} />
              <Meta k="Expected" v={formatDate(order.expectedDeliveryDate)} />
              <Meta k="Total" v={formatMoney(order.totalAmount)} />
              <Meta k="Version" v={order.version} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            ) : null}
            {canSubmit ? (
              <Button
                size="sm"
                onClick={() => submitOrder.mutate()}
                disabled={submitOrder.isPending}
              >
                <Send className="mr-1.5 h-4 w-4" />
                {submitOrder.isPending ? "Submitting..." : "Submit"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-border bg-card">
          <Tabs defaultValue="summary">
            <div className="border-b border-border px-3 pt-2">
              <TabsList className="h-10 bg-transparent p-0 gap-1">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="approvers">Approvers</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary" className="p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <SummaryBlock title="Notes" value={order.notes} />
                <SummaryBlock title="Remarks" value={order.remarks} />
              </div>
              <OrderLocationDetails order={order} />
            </TabsContent>

            <TabsContent value="products" className="p-0">
              <ProductsTable items={items} />
            </TabsContent>

            <TabsContent value="approvers" className="p-0">
              <ApproversTable approvers={approvers} approverUsersById={approverUsersById} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="h-fit space-y-4">
          {showApprovalActions ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">Approval Actions</div>
              <div className="mt-3 space-y-3">
                <textarea
                  className="input min-h-[88px]"
                  placeholder="Approval remark"
                  value={approvalRemark}
                  onChange={(event) => setApprovalRemark(event.target.value)}
                />
                {approvalError ? <InlineError message={approvalError} /> : null}
                <div className="grid gap-2">
                  <Button
                    type="button"
                    onClick={() => runApproval("APPROVE")}
                    disabled={approvalMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => runApproval("REQUEST_CHANGES")}
                    disabled={approvalMutation.isPending}
                  >
                    <Undo2 className="mr-1.5 h-4 w-4" />
                    Request Changes
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => runApproval("REJECT")}
                    disabled={approvalMutation.isPending}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {canSupplierAct ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">Supplier Actions</div>
              <div className="mt-3 space-y-3">
                <Field label="Action" id="supplier-action">
                  <select
                    id="supplier-action"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={activeSupplierAction}
                    onChange={(event) =>
                      setSupplierAction(event.target.value as SupplierActionRequest["action"])
                    }
                  >
                    {supplierActions.map((action) => (
                      <option key={action} value={action}>
                        {formatStatus(action)}
                      </option>
                    ))}
                  </select>
                </Field>
                {supplierActionNeedsDate ? (
                  <Field label="Expected Delivery Date" id="supplier-date">
                    <Input
                      id="supplier-date"
                      type="date"
                      value={supplierExpectedDate}
                      onChange={(event) => setSupplierExpectedDate(event.target.value)}
                    />
                  </Field>
                ) : null}
                <Field label="Remark" id="supplier-remark">
                  <textarea
                    id="supplier-remark"
                    className="input min-h-[80px]"
                    value={supplierRemark}
                    onChange={(event) => setSupplierRemark(event.target.value)}
                  />
                </Field>
                {supplierError ? <InlineError message={supplierError} /> : null}
                <Button
                  type="button"
                  className="w-full"
                  onClick={runSupplierAction}
                  disabled={supplierMutation.isPending || !activeSupplierAction}
                >
                  <Truck className="mr-1.5 h-4 w-4" />
                  {supplierMutation.isPending ? "Submitting..." : "Submit Supplier Action"}
                </Button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>
              Editable only while status is Draft, Created, or Changes Requested.
            </DialogDescription>
          </DialogHeader>
          <OrderForm
            mode="edit"
            initialOrder={order}
            submitLabel="Update Order"
            isSubmitting={updateOrder.isPending}
            error={updateOrder.isError ? updateOrder.error.message : ""}
            onSubmit={(payload) => updateOrder.mutate(payload)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function refreshOrder(queryClient: QueryClient, id: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: ordersQueryKeys.detail(id) }),
  ]);
}

function ProductsTable({ items }: { items: OrderItemResponse[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-5 py-3 text-left font-medium">Product</th>
            <th className="px-5 py-3 text-right font-medium">Qty</th>
            <th className="px-5 py-3 text-right font-medium">Unit Price</th>
            <th className="px-5 py-3 text-left font-medium">Remark</th>
            <th className="px-5 py-3 text-right font-medium">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <TableMessageRow columns={5} message="No order products returned  ." />
          ) : (
            items.map((item, index) => {
              const quantity = item.quantity ?? item.requestedQty ?? 0;
              const unitPrice = item.unitPrice ?? item.unitRate ?? 0;
              const total = item.lineTotal ?? item.totalAmount ?? quantity * unitPrice;

              return (
                <tr
                  key={item.id ?? `${item.productId}-${index}`}
                  className="border-t border-border"
                >
                  <td className="px-5 py-3">
                    <div className="font-medium">
                      {item.productName || item.itemDescription || `Product ${item.productId}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.navItemCode || item.productCode || item.category || "-"}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{quantity || "-"}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatMoney(unitPrice)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{item.remark || "-"}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">
                    {formatMoney(total)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function ApproversTable({
  approvers,
  approverUsersById,
}: {
  approvers: OrderApproverResponse[];
  approverUsersById: Map<string, ApproverUserResponse>;
}) {
  const approversByLevel = approvers.reduce<Record<number, OrderApproverResponse[]>>(
    (result, approver) => {
      const level = approver.approvalLevel ?? 1;
      result[level] = [...(result[level] ?? []), approver];
      return result;
    },
    {},
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-5 py-3 text-left font-medium">Approver</th>
            <th className="px-5 py-3 text-left font-medium">Status</th>
            <th className="px-5 py-3 text-left font-medium">Remark</th>
            <th className="px-5 py-3 text-left font-medium">Acted At</th>
          </tr>
        </thead>
        <tbody>
          {approvers.length === 0 ? (
            <TableMessageRow columns={4} message="No approvers returned." />
          ) : (
            Object.entries(approversByLevel)
              .sort(([left], [right]) => Number(left) - Number(right))
              .map(([level, levelApprovers]) => (
                <Fragment key={level}>
                  <tr className="border-t border-border bg-surface/70">
                    <td colSpan={4} className="px-5 py-2 text-xs font-semibold uppercase">
                      Level {level} · {levelApprovers.filter(isApprovedApprover).length}/
                      {levelApprovers.length} approved
                    </td>
                  </tr>
                  {levelApprovers.map((approver, index) => {
                    const approverId = approver.userId || approver.approverId || approver.id || "";
                    const resolvedApprover = approverUsersById.get(approverId);
                    const approverName =
                      approver.approverName ||
                      approver.name ||
                      resolvedApprover?.name ||
                      approver.email;
                    const approverEmail = approver.email || resolvedApprover?.email;
                    const status = approver.approvalStatus || approver.status;

                    return (
                      <tr
                        key={approver.id ?? approver.userId ?? index}
                        className="border-t border-border"
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium">{approverName || "Unknown approver"}</div>
                          {approverEmail && approverEmail !== approverName ? (
                            <div className="text-xs text-muted-foreground">{approverEmail}</div>
                          ) : null}
                        </td>
                        <td className="px-5 py-3">
                          {status ? <StatusBadge status={formatStatus(status)} /> : "-"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {approver.remark || "-"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {formatDateTime(approver.actedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function isApprovedApprover(approver: OrderApproverResponse) {
  return (approver.approvalStatus || approver.status) === "APPROVED";
}

function supplierActionsForStatus(status: string): SupplierActionRequest["action"][] {
  if (status === "SUBMITTED") return ["REJECT", "PENDING", "CONFIRM"];
  if (status === "CONFIRMED") return ["DELIVER"];
  return [];
}

function isApprovalClosedStatus(status: string) {
  return [
    "APPROVED",
    "SUBMITTED",
    "REJECTED",
    "PENDING",
    "CONFIRMED",
    "DELIVERED",
    "ABANDONED",
  ].includes(status);
}

function needsExpectedDeliveryDate(action?: SupplierActionRequest["action"]) {
  return action === "PENDING" || action === "CONFIRM";
}

function canManageSupplierAction(user: AuthUser | null | undefined) {
  const roles = (user?.roles ?? []).map((role) => role.toUpperCase());
  return (
    roles.includes("ORG_ADMIN") ||
    roles.includes("ORGANIZATION_ADMIN") ||
    roles.includes("BRANCH_ADMIN")
  );
}

function isCurrentApprover(approver: OrderApproverResponse, userId?: string, email?: string) {
  if (!userId && !email) return false;
  const ids = [approver.userId, approver.approverId, approver.id].filter(Boolean);
  return ids.includes(userId ?? "") || Boolean(email && approver.email === email);
}

function Meta({ k, v }: { k: string; v?: string | number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="mt-0.5 text-sm font-medium">{v || "-"}</div>
    </div>
  );
}

function SummaryBlock({ title, value }: { title: string; value?: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{value || "-"}</p>
    </div>
  );
}

function OrderLocationDetails({ order }: { order: OrderResponse }) {
  const location = order.locationDetails;
  if (!location) return <SummaryBlock title="Delivery Location" value={order.location} />;

  return (
    <div className="mt-5 rounded-md border border-border bg-surface/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        Delivery Location
      </div>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Meta k="Code" v={location.locationCode} />
        <Meta k="Name" v={location.locationName} />
        <Meta k="City / State" v={[location.city, location.state].filter(Boolean).join(", ")} />
        <Meta k="Pincode" v={location.pincode} />
        <Meta k="Permanent Address" v={location.permanentAddress || location.address} />
        <Meta k="Corresponding Address" v={location.correspondingAddress} />
        <Meta k="Same as Permanent" v={location.sameAsPermanentAddress ? "Yes" : "No"} />
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
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

function formatDateTime(value?: string) {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
