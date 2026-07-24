import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { DataError } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useProducts } from "@/hooks/use-domain-data";
import type { Product } from "@/lib/domain-types";
import { ordersApi } from "@/services/domain-api.service";

export const Route = createFileRoute("/orders/new")({
  head: () => ({ meta: [{ title: "Create Order - StockFlow B2B" }] }),
  component: CreateOrder,
});

const STEPS = ["Order Information", "Add Products", "Review Order"];
const PRIORITIES = ["Low", "Medium", "High"];

type AddedProduct = Product & { qty: number };

function CreateOrder() {
  const [step, setStep] = useState(0);
  const [added, setAdded] = useState<AddedProduct[]>([]);
  const [selectedSku, setSelectedSku] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerOrganization: "",
    branch: "",
    deliveryLocation: "",
    requiredDate: "",
    priority: "Medium",
    purchaseReferenceNumber: "",
    notes: "",
  });
  const productsQuery = useProducts();
  const createOrder = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (payload) => {
      const record = payload as { data?: { id?: string }; id?: string };
      setSubmittedId(record.data?.id ?? record.id ?? "created");
    },
  });

  const subtotal = added.reduce((sum, product) => sum + (product.price ?? 0) * product.qty, 0);
  const total = subtotal;

  function addProduct() {
    const product = productsQuery.data?.find((item) => item.sku === selectedSku);
    if (!product || added.some((item) => item.sku === product.sku)) return;

    setAdded([...added, { ...product, qty: 1 }]);
    setSelectedSku("");
  }

  function submitOrder() {
    createOrder.mutate({
      ...form,
      items: added.map((product) => ({
        sku: product.sku,
        quantity: product.qty,
      })),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/orders">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Orders
          </Link>
        </Button>
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Create Order</h2>
        <p className="text-sm text-muted-foreground">
          Fill in delivery details, add products, then submit for approval.
        </p>
      </div>

      <ol className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                index <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {index < step ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </div>
            <div className="min-w-0">
              <div
                className={`text-[13px] font-medium ${index === step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </div>
            </div>
            {index < STEPS.length - 1 && <div className="mx-2 h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      {createOrder.isError && <DataError message={createOrder.error.message} />}

      <div className="rounded-xl border border-border bg-card p-6">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Customer Organization">
              <input
                className="input"
                value={form.customerOrganization}
                onChange={(event) => setForm({ ...form, customerOrganization: event.target.value })}
              />
            </Field>
            <Field label="Branch">
              <input
                className="input"
                value={form.branch}
                onChange={(event) => setForm({ ...form, branch: event.target.value })}
              />
            </Field>
            <Field label="Delivery Location">
              <input
                className="input"
                value={form.deliveryLocation}
                onChange={(event) => setForm({ ...form, deliveryLocation: event.target.value })}
              />
            </Field>
            <Field label="Required Date">
              <input
                type="date"
                className="input"
                value={form.requiredDate}
                onChange={(event) => setForm({ ...form, requiredDate: event.target.value })}
              />
            </Field>
            <Field label="Priority">
              <select
                className="input"
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </Field>
            <Field label="Purchase Reference Number">
              <input
                className="input"
                value={form.purchaseReferenceNumber}
                onChange={(event) =>
                  setForm({ ...form, purchaseReferenceNumber: event.target.value })
                }
              />
            </Field>
            <Field label="Order Notes" className="sm:col-span-2">
              <textarea
                className="input min-h-[90px]"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                className="input flex-1 min-w-[240px]"
                value={selectedSku}
                onChange={(event) => setSelectedSku(event.target.value)}
              >
                <option value="">
                  {productsQuery.isLoading ? "Loading products..." : "Select backend product"}
                </option>
                {(productsQuery.data ?? []).map((product) => (
                  <option key={product.sku} value={product.sku}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={addProduct} disabled={!selectedSku}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Product
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">SKU</th>
                    <th className="px-4 py-3 text-right font-medium">Available</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {added.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Add products returned by the backend.
                      </td>
                    </tr>
                  ) : (
                    added.map((product, index) => (
                      <tr key={product.sku} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{product.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{product.sku}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {product.stock ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min={1}
                            className="input w-20 text-right"
                            value={product.qty}
                            onChange={(event) => {
                              const qty = Number(event.target.value);
                              setAdded(
                                added.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, qty } : item,
                                ),
                              );
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(product.price)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {formatMoney((product.price ?? 0) * product.qty)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setAdded(added.filter((_, itemIndex) => itemIndex !== index))
                            }
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
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

        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Delivery</h3>
                <div className="rounded-md border border-border bg-surface/50 p-4 text-sm">
                  <div className="font-medium">{form.customerOrganization || "-"}</div>
                  <div className="text-muted-foreground">
                    {[form.branch, form.deliveryLocation, form.requiredDate]
                      .filter(Boolean)
                      .join(" - ") || "-"}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Products</h3>
                <div className="rounded-md border border-border">
                  {added.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No products added.</div>
                  ) : (
                    added.map((product) => (
                      <div
                        key={product.sku}
                        className="flex items-center justify-between gap-4 border-b border-border p-3 text-sm last:border-b-0"
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.sku} - Qty {product.qty}
                          </div>
                        </div>
                        <div className="tabular-nums font-medium">
                          {formatMoney((product.price ?? 0) * product.qty)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <aside className="h-fit rounded-lg border border-border bg-surface/50 p-4 text-sm">
              <h3 className="mb-3 text-sm font-semibold">Order Summary</h3>
              <Row label="Subtotal" value={formatMoney(subtotal)} />
              <div className="my-3 h-px bg-border" />
              <Row label="Grand Total" value={formatMoney(total)} bold />
            </aside>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)}>
              Next
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submitOrder} disabled={createOrder.isPending || added.length === 0}>
              Submit for Approval
            </Button>
          )}
        </div>
      </div>

      <Dialog open={Boolean(submittedId)} onOpenChange={() => setSubmittedId(null)}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center py-2">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="mt-4">Order submitted successfully</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Backend accepted the order request.
            </p>
            <div className="mt-5 flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSubmittedId(null)}>
                <X className="mr-1.5 h-4 w-4" />
                Close
              </Button>
              {submittedId && submittedId !== "created" ? (
                <Button asChild className="flex-1">
                  <Link to="/orders/$id" params={{ id: submittedId }}>
                    View Order
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between py-1 ${bold ? "text-base font-semibold" : "text-sm"}`}
    >
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "-";
  return `INR ${value.toLocaleString("en-IN")}`;
}
