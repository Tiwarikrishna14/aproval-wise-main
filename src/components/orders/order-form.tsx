import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import {
  businessCustomersApi,
  businessCustomerLocationsApi,
  productRecords,
  productsApi,
  usersApi,
  type ApproverUserResponse,
  type BusinessCustomerResponse,
  type ProductResponse,
} from "@/services/admin-api.service";
import {
  orderItems,
  type OrderApproverResponse,
  type OrderMutationRequest,
  type OrderResponse,
} from "@/services/orders-api.service";

type ProductRow = {
  productId: number;
  quantity: number;
  unitPrice: number;
  remark: string;
};

type OrderFormState = {
  notes: string;
  remarks: string;
  priority: string;
  location: string;
  referenceNumber: string;
};

type OrderFormProps = {
  mode: "create" | "edit";
  initialOrder?: OrderResponse | null;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string;
  onSubmit: (payload: OrderMutationRequest) => void;
  onCancel?: () => void;
};

const priorities = ["", "LOW", "MEDIUM", "HIGH", "URGENT"];

function initialProductRows(order?: OrderResponse | null): ProductRow[] {
  return orderItems(order)
    .map((item) => ({
      productId: Number(item.productId ?? 0),
      quantity: Number(item.quantity ?? item.requestedQty ?? 1),
      unitPrice: Number(item.unitPrice ?? item.unitRate ?? 0),
      remark: item.remark ?? "",
    }))
    .filter((item) => Number.isFinite(item.productId) && item.productId > 0);
}

function initialApproverIds(order?: OrderResponse | null) {
  return (order?.approvers ?? [])
    .map((approver) => approver.userId || approver.approverId || approver.id || "")
    .filter(Boolean);
}

function approverFromOrder(approver: OrderApproverResponse): ApproverUserResponse | null {
  const userId = approver.userId || approver.approverId || "";
  if (!userId) return null;

  return {
    userId,
    name: approver.approverName || approver.name || approver.email || userId,
    email: approver.email,
  };
}

function approverLabel(approver: ApproverUserResponse) {
  return approver.name || approver.email || approver.userId;
}

function productLabel(product: ProductResponse) {
  return [
    product.itemDescription || product.navItemCode || `Product ${product.id}`,
    product.navItemCode ? `(${product.navItemCode})` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "INR 0";
  return `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function OrderForm({
  mode,
  initialOrder,
  submitLabel,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: OrderFormProps) {
  const { user } = useAuth();
  const authCustomerSellCode =
    user?.customerSellCode || user?.customerCode || user?.businessCustomerCode || "";
  const assignedBusinessCustomerId = user?.businessCustomerId;
  const canViewCustomerLocations =
    hasPermission(user, "CUSTOMER_VIEW") ||
    Boolean(assignedBusinessCustomerId || authCustomerSellCode);
  const [customerSellCode, setCustomerSellCode] = useState(
    initialOrder?.businessCustomerCode || authCustomerSellCode,
  );
  const [form, setForm] = useState<OrderFormState>({
    notes: initialOrder?.notes ?? "",
    remarks: initialOrder?.remarks ?? "",
    priority: initialOrder?.priority ?? "MEDIUM",
    location: initialOrder?.location ?? "",
    referenceNumber: initialOrder?.referenceNumber ?? "",
  });
  const [productRows, setProductRows] = useState<ProductRow[]>(() =>
    initialProductRows(initialOrder),
  );
  const [selectedProductId, setSelectedProductId] = useState("");
  const [approverIds, setApproverIds] = useState<string[]>(() => initialApproverIds(initialOrder));
  const [selectedApproverId, setSelectedApproverId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(
    initialOrder?.businessCustomerLocationId || initialOrder?.locationDetails?.id || "",
  );
  const [formError, setFormError] = useState("");
  const [confirmRemoveAllOpen, setConfirmRemoveAllOpen] = useState(false);
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);

  const customersQuery = useQuery({
    queryKey: ["orders", "form", "business-customers", user?.organizationId, user?.branchId],
    queryFn: async () =>
      (
        await businessCustomersApi.list({
          organizationId: user?.organizationId,
          branchId: user?.branchId,
        })
      ).data,
    enabled:
      !assignedBusinessCustomerId && !authCustomerSellCode && hasPermission(user, "ORDER_CREATE"),
    retry: false,
    staleTime: 60 * 1000,
  });

  const assignedCustomerQuery = useQuery({
    queryKey: ["orders", "form", "assigned-business-customer", assignedBusinessCustomerId],
    queryFn: async () => (await businessCustomersApi.get(assignedBusinessCustomerId ?? "")).data,
    enabled:
      Boolean(assignedBusinessCustomerId) &&
      !authCustomerSellCode &&
      !initialOrder?.businessCustomerCode,
    retry: false,
    staleTime: 60 * 1000,
  });

  const customers: BusinessCustomerResponse[] = useMemo(
    () =>
      Array.isArray(customersQuery.data)
        ? customersQuery.data
        : (customersQuery.data?.content ?? []),
    [customersQuery.data],
  );

  const customerSellCodes = useMemo(
    () =>
      customers
        .map((customer) => ({
          id: customer.id,
          code: customer.customerCode,
          name: customer.name,
        }))
        .filter((item) => item.code),
    [customers],
  );
  const selectedCustomer = useMemo(
    () => customerSellCodes.find((customer) => customer.code === customerSellCode),
    [customerSellCode, customerSellCodes],
  );
  const approverBusinessCustomerId =
    assignedBusinessCustomerId ||
    selectedCustomer?.id ||
    assignedCustomerQuery.data?.id ||
    (customerSellCode === initialOrder?.businessCustomerCode
      ? initialOrder?.businessCustomerId
      : undefined);
  const initialApprovers = useMemo(
    () =>
      (initialOrder?.approvers ?? [])
        .map(approverFromOrder)
        .filter((approver): approver is ApproverUserResponse => Boolean(approver)),
    [initialOrder],
  );

  useEffect(() => {
    if (customerSellCode) return;

    const assignedSellCode = assignedCustomerQuery.data?.customerCode;
    if (assignedSellCode) {
      setCustomerSellCode(assignedSellCode);
      return;
    }

    if (customerSellCodes.length === 1) setCustomerSellCode(customerSellCodes[0].code);
  }, [assignedCustomerQuery.data?.customerCode, customerSellCode, customerSellCodes]);

  useEffect(() => {
    if (
      initialOrder?.businessCustomerCode &&
      customerSellCode === initialOrder.businessCustomerCode
    ) {
      return;
    }
    setSelectedLocationId("");
  }, [customerSellCode, initialOrder?.businessCustomerCode]);

  const productsQuery = useQuery({
    queryKey: ["orders", "form", "products", customerSellCode],
    queryFn: async () =>
      (
        await productsApi.list({
          size: 100,
          customerSellCode: customerSellCode || undefined,
        })
      ).data,
    enabled: Boolean(customerSellCode),
    retry: false,
    staleTime: 60 * 1000,
  });

  const approversQuery = useQuery({
    queryKey: ["orders", "form", "eligible-approvers", approverBusinessCustomerId],
    queryFn: async () => (await usersApi.approvers(approverBusinessCustomerId ?? "")).data,
    enabled: Boolean(approverBusinessCustomerId),
    retry: false,
    staleTime: 60 * 1000,
  });

  const locationsQuery = useQuery({
    queryKey: ["orders", "form", "locations", approverBusinessCustomerId, customerSellCode],
    queryFn: async () => {
      if (approverBusinessCustomerId) {
        return (
          await businessCustomerLocationsApi.list({
            businessCustomerId: approverBusinessCustomerId,
            status: "ACTIVE",
            size: 100,
          })
        ).data;
      }
      return (
        await businessCustomerLocationsApi.listByCustomerCode({
          customerCode: customerSellCode,
          status: "ACTIVE",
          size: 100,
        })
      ).data;
    },
    enabled: canViewCustomerLocations && Boolean(approverBusinessCustomerId || customerSellCode),
    retry: false,
    staleTime: 60 * 1000,
  });

  const products = productRecords(productsQuery.data);
  const savedLocations = Array.isArray(locationsQuery.data)
    ? locationsQuery.data
    : (locationsQuery.data?.content ?? []);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const eligibleApprovers = [...initialApprovers, ...(approversQuery.data ?? [])].filter(
    (approver, index, approvers) =>
      approver.userId &&
      approvers.findIndex((candidate) => candidate.userId === approver.userId) === index,
  );
  const approversById = new Map(eligibleApprovers.map((approver) => [approver.userId, approver]));
  const availableProducts = products.filter(
    (product) => !productRows.some((row) => row.productId === product.id),
  );
  const allProductsSelected = products.length > 0 && availableProducts.length === 0;
  const availableApprovers = eligibleApprovers.filter(
    (approver) => !approverIds.includes(approver.userId),
  );
  const totalAmount = productRows.reduce(
    (sum, row) => sum + Number(row.quantity || 0) * Number(row.unitPrice || 0),
    0,
  );

  function updateField(field: keyof OrderFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addProduct() {
    const product = productsById.get(Number(selectedProductId));
    if (!product) return;

    setProductRows((current) => [
      ...current,
      {
        productId: product.id,
        quantity: 1,
        unitPrice: Number(product.unitRate ?? 0),
        remark: "",
      },
    ]);
    setSelectedProductId("");
  }

  function removeProduct(index: number) {
    if (mode === "edit" && productRows.length === 1) {
      setPendingRemoveIndex(index);
      setConfirmRemoveAllOpen(true);
      return;
    }

    setProductRows((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function confirmRemoveProduct() {
    if (pendingRemoveIndex == null) return;
    setProductRows((current) => current.filter((_, itemIndex) => itemIndex !== pendingRemoveIndex));
    setPendingRemoveIndex(null);
    setConfirmRemoveAllOpen(false);
  }

  function updateProductRow(index: number, next: Partial<ProductRow>) {
    setProductRows((current) =>
      current.map((row, itemIndex) => (itemIndex === index ? { ...row, ...next } : row)),
    );
  }

  function addApprover() {
    if (!selectedApproverId || approverIds.includes(selectedApproverId)) return;
    setApproverIds((current) => [...current, selectedApproverId]);
    setSelectedApproverId("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const invalidProduct = productRows.find(
      (row) =>
        !Number.isFinite(row.productId) ||
        row.productId <= 0 ||
        !Number.isFinite(row.quantity) ||
        row.quantity <= 0 ||
        !Number.isFinite(row.unitPrice) ||
        row.unitPrice < 0,
    );

    if (invalidProduct) {
      setFormError("Product rows must have a product, quantity greater than 0, and valid price.");
      return;
    }

    onSubmit({
      notes: form.notes.trim(),
      remarks: form.remarks.trim(),
      priority: form.priority.trim(),
      location: selectedLocationId ? undefined : form.location.trim(),
      businessCustomerLocationId: selectedLocationId || undefined,
      referenceNumber: form.referenceNumber.trim(),
      products: productRows.map((row) => ({
        productId: row.productId,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        remark: row.remark.trim(),
      })),
      approverIds,
    });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        {savedLocations.length || locationsQuery.isLoading ? (
          <Field label="Location Code" id="order-location">
            <select
              id="order-location"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedLocationId}
              onChange={(event) => setSelectedLocationId(event.target.value)}
              disabled={locationsQuery.isLoading}
            >
              <option value="">
                {locationsQuery.isLoading ? "Loading locations..." : "Select saved location"}
              </option>
              {savedLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {[location.locationCode, location.locationName, location.city]
                    .filter(Boolean)
                    .join(" - ")}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Location" id="order-location">
            <Input
              id="order-location"
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="Delivery location"
            />
          </Field>
        )}
        <Field label="Reference Number" id="order-reference">
          <Input
            id="order-reference"
            value={form.referenceNumber}
            onChange={(event) => updateField("referenceNumber", event.target.value)}
            placeholder="Optional reference"
          />
        </Field>
        <Field label="Priority" id="order-priority">
          <select
            id="order-priority"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.priority}
            onChange={(event) => updateField("priority", event.target.value)}
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority || "Select priority"}
              </option>
            ))}
          </select>
        </Field>
        {!assignedBusinessCustomerId && !authCustomerSellCode ? (
          <Field label="Product Customer Sell Code" id="order-customer-code">
            <select
              id="order-customer-code"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={customerSellCode}
              onChange={(event) => setCustomerSellCode(event.target.value)}
              disabled={customersQuery.isLoading}
            >
              <option value="">
                {customersQuery.isLoading ? "Loading customers..." : "Select customer code"}
              </option>
              {customerSellCodes.map((customer) => (
                <option key={customer.id} value={customer.code}>
                  {customer.code}
                  {customer.name ? ` - ${customer.name}` : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Notes" id="order-notes" className="sm:col-span-2">
          <textarea
            id="order-notes"
            className="input min-h-[80px]"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </Field>
        <Field label="Remarks" id="order-remarks" className="sm:col-span-2">
          <textarea
            id="order-remarks"
            className="input min-h-[80px]"
            value={form.remarks}
            onChange={(event) => updateField("remarks", event.target.value)}
          />
        </Field>
      </div>

      <section className="rounded-lg border border-border">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="order-product">Products</Label>
            <select
              id="order-product"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              disabled={productsQuery.isLoading || !products.length || allProductsSelected}
            >
              <option value="">
                {assignedCustomerQuery.isLoading
                  ? "Loading..."
                  : !customerSellCode
                    ? "Customer code required"
                    : productsQuery.isLoading
                      ? "Loading products..."
                      : allProductsSelected
                        ? "All products selected"
                        : products.length
                          ? "Select product"
                          : "No products available"}
              </option>
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {productLabel(product)}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addProduct}
            disabled={!selectedProductId || allProductsSelected}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                <th className="px-4 py-3 text-left font-medium">Remark</th>
                <th className="px-4 py-3 text-right font-medium">Line Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {productRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No Product Selected
                  </td>
                </tr>
              ) : (
                productRows.map((row, index) => {
                  const product = productsById.get(row.productId);
                  const total = Number(row.quantity || 0) * Number(row.unitPrice || 0);

                  return (
                    <tr key={`${row.productId}-${index}`} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {product ? product.itemDescription : `Product ${row.productId}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {product?.navItemCode ?? row.productId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          min={1}
                          className="ml-auto w-24 text-right"
                          value={row.quantity}
                          onChange={(event) =>
                            updateProductRow(index, { quantity: Number(event.target.value) })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="ml-auto w-28 text-right"
                          value={row.unitPrice}
                          onChange={(event) =>
                            updateProductRow(index, { unitPrice: Number(event.target.value) })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.remark}
                          onChange={(event) =>
                            updateProductRow(index, { remark: event.target.value })
                          }
                          placeholder="Line remark"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatMoney(total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeProduct(index)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground">Total:</span>
          <span className="ml-2 font-semibold tabular-nums">{formatMoney(totalAmount)}</span>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="order-approver">Approvers</Label>
            <select
              id="order-approver"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedApproverId}
              onChange={(event) => setSelectedApproverId(event.target.value)}
              disabled={approversQuery.isLoading || !availableApprovers.length}
            >
              <option value="">
                {!approverBusinessCustomerId
                  ? "Select customer first"
                  : approversQuery.isLoading
                    ? "Loading approvers..."
                    : availableApprovers.length
                      ? "Select eligible approver"
                      : "No eligible approvers returned"}
              </option>
              {availableApprovers.map((approver) => (
                <option key={approver.userId} value={approver.userId}>
                  {approverLabel(approver)}
                  {approver.email ? ` (${approver.email})` : ""}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addApprover}
            disabled={!selectedApproverId}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Approver
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {approverIds.length ? (
            approverIds.map((id) => {
              const approver = approversById.get(id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs"
                >
                  {approver ? approverLabel(approver) : id}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setApproverIds((current) => current.filter((approverId) => approverId !== id))
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">
              Saving without approvers will keep the order as draft.
            </p>
          )}
        </div>
      </section>

      {formError || error ? (
        <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError || error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>

      <AlertDialog open={confirmRemoveAllOpen} onOpenChange={setConfirmRemoveAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all products?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing the last product can move the order to abandoned based on backend rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRemoveIndex(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveProduct}>Remove Product</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function Field({
  label,
  id,
  children,
  className,
}: {
  label: string;
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      {children}
    </div>
  );
}
