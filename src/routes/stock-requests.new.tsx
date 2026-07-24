import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { DataError } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/hooks/use-domain-data";
import { stockRequestsApi } from "@/services/domain-api.service";

export const Route = createFileRoute("/stock-requests/new")({
  head: () => ({ meta: [{ title: "Request Stock - StockFlow B2B" }] }),
  component: NewRequest,
});

const PRIORITIES = ["Low", "Medium", "High"];

function NewRequest() {
  const inventoryQuery = useInventory();
  const [form, setForm] = useState({
    sku: "",
    quantity: "",
    requiredDate: "",
    priority: "Medium",
    deliveryBranch: "",
    reason: "",
    comments: "",
  });
  const selectedItem = useMemo(
    () => inventoryQuery.data?.find((item) => item.sku === form.sku),
    [form.sku, inventoryQuery.data],
  );
  const createRequest = useMutation({
    mutationFn: stockRequestsApi.create,
    onSuccess: () =>
      setForm({
        sku: "",
        quantity: "",
        requiredDate: "",
        priority: "Medium",
        deliveryBranch: "",
        reason: "",
        comments: "",
      }),
  });

  function submitRequest() {
    createRequest.mutate({
      productSku: form.sku,
      quantity: Number(form.quantity),
      requiredDate: form.requiredDate,
      priority: form.priority,
      deliveryBranch: form.deliveryBranch,
      reason: form.reason,
      comments: form.comments,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/stock-requests">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Request Stock</h2>
        <p className="text-sm text-muted-foreground">
          Submit a stock replenishment request for review and approval.
        </p>
      </div>

      {inventoryQuery.isError && (
        <DataError message={`Failed to load inventory products: ${inventoryQuery.error.message}`} />
      )}
      {createRequest.isError && <DataError message={createRequest.error.message} />}
      {createRequest.isSuccess && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
          Stock request submitted to backend.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Product</label>
            <select
              className="input"
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
            >
              <option value="">
                {inventoryQuery.isLoading
                  ? "Loading inventory..."
                  : "Select backend inventory item"}
              </option>
              {(inventoryQuery.data ?? []).map((item) => (
                <option key={item.sku} value={item.sku}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Requested Quantity</label>
            <input
              className="input"
              type="number"
              value={form.quantity}
              onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Current Available Quantity
            </label>
            <input className="input" value={selectedItem?.available ?? ""} readOnly />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reorder Threshold</label>
            <input className="input" value={selectedItem?.threshold ?? ""} readOnly />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Required Date</label>
            <input
              type="date"
              className="input"
              value={form.requiredDate}
              onChange={(event) => setForm({ ...form, requiredDate: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Delivery Branch</label>
            <input
              className="input"
              value={form.deliveryBranch}
              onChange={(event) => setForm({ ...form, deliveryBranch: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Reason</label>
            <input
              className="input"
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Comments</label>
            <textarea
              className="input min-h-[100px]"
              value={form.comments}
              onChange={(event) => setForm({ ...form, comments: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Attachment</label>
            <button
              type="button"
              disabled
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface/50 py-6 text-sm text-muted-foreground"
            >
              <Upload className="h-4 w-4" />
              Upload supporting document
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled>
          Save Draft
        </Button>
        <Button
          onClick={submitRequest}
          disabled={createRequest.isPending || !form.sku || !form.quantity}
        >
          Submit Request
        </Button>
      </div>
    </div>
  );
}
