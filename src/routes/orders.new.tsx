import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Upload, CheckCircle2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { products } from "@/lib/sample-data";

export const Route = createFileRoute("/orders/new")({
  head: () => ({ meta: [{ title: "Create Order — StockFlow B2B" }] }),
  component: CreateOrder,
});

const STEPS = ["Order Information", "Add Products", "Review Order"];

function CreateOrder() {
  const [step, setStep] = useState(0);
  const [added, setAdded] = useState(products.slice(0, 2).map((p) => ({ ...p, qty: 20 })));
  const [submitted, setSubmitted] = useState(false);

  const subtotal = added.reduce((s, p) => s + p.price * p.qty, 0);
  const tax = Math.round(subtotal * 0.18);
  const shipping = 850;
  const total = subtotal + tax + shipping;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/orders"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Orders</Link></Button>
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Create Order</h2>
        <p className="text-sm text-muted-foreground">Fill in delivery details, add products, then submit for approval.</p>
      </div>

      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <div className="min-w-0">
              <div className={`text-[13px] font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</div>
            </div>
            {i < STEPS.length - 1 && <div className="mx-2 h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-border bg-card p-6">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Customer Organization" value="Acme Retail Pvt. Ltd." />
            <Field label="Branch">
              <select className="input"><option>Mumbai HQ</option><option>Delhi Warehouse</option><option>Bengaluru Store</option></select>
            </Field>
            <Field label="Delivery Location">
              <input className="input" defaultValue="Warehouse 4B, Bhiwandi, Mumbai" />
            </Field>
            <Field label="Required Date">
              <input type="date" className="input" defaultValue="2026-07-25" />
            </Field>
            <Field label="Priority">
              <select className="input"><option>Medium</option><option>High</option><option>Low</option></select>
            </Field>
            <Field label="Purchase Reference Number">
              <input className="input" placeholder="PO-2026-0451" />
            </Field>
            <Field label="Order Notes" className="sm:col-span-2">
              <textarea className="input min-h-[90px]" placeholder="Any special instructions for this order…" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <input className="input" placeholder="Search products by name or SKU…" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Plus className="mr-1.5 h-4 w-4" />Add Product</Button>
                <Button variant="outline" size="sm">Import from Previous</Button>
                <Button variant="outline" size="sm"><Upload className="mr-1.5 h-4 w-4" />Upload CSV</Button>
              </div>
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
                    <th className="px-4 py-3 text-right font-medium">Tax</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {added.map((p, i) => (
                    <tr key={p.sku} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.sku}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.stock}</td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" className="input w-20 text-right" value={p.qty}
                          onChange={(e) => { const v = Number(e.target.value); setAdded(added.map((x, j) => j === i ? { ...x, qty: v } : x)); }} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">₹{p.price}</td>
                      <td className="px-4 py-3 text-right tabular-nums">18%</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">₹{(p.qty * p.price * 1.18).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => setAdded(added.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
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
                  <div className="font-medium">Mumbai HQ · Warehouse 4B</div>
                  <div className="text-muted-foreground">Bhiwandi, Mumbai · Required 25 Jul 2026</div>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Products</h3>
                <div className="rounded-md border border-border">
                  {added.map((p) => (
                    <div key={p.sku} className="flex items-center justify-between gap-4 border-b border-border p-3 text-sm last:border-b-0">
                      <div><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.sku} · Qty {p.qty}</div></div>
                      <div className="tabular-nums font-medium">₹{(p.qty * p.price).toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <aside className="h-fit rounded-lg border border-border bg-surface/50 p-4 text-sm">
              <h3 className="mb-3 text-sm font-semibold">Order Summary</h3>
              <Row label="Subtotal" value={`₹${subtotal.toLocaleString("en-IN")}`} />
              <Row label="Tax (18% GST)" value={`₹${tax.toLocaleString("en-IN")}`} />
              <Row label="Shipping" value={`₹${shipping}`} />
              <div className="my-3 h-px bg-border" />
              <Row label="Grand Total" value={`₹${total.toLocaleString("en-IN")}`} bold />
              <div className="mt-4 text-xs text-muted-foreground">Next: Order Review → Stock Verification → Finance Approval → Final Approval</div>
            </aside>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost">Save as Draft</Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)}>Next<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
          ) : (
            <Button onClick={() => setSubmitted(true)}>Submit for Approval</Button>
          )}
        </div>
      </div>

      <Dialog open={submitted} onOpenChange={setSubmitted}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center py-2">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="mt-4">Order submitted successfully</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">Your order has been sent to the first approver for review.</p>
            <div className="mt-4 w-full space-y-1 rounded-md border border-border bg-surface/60 p-3 text-left text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Order number</span><span className="font-medium">ORD-2026-1051</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">First approval step</span><span>Order Review</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expected response</span><span>Within 8h</span></div>
            </div>
            <div className="mt-5 flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSubmitted(false)}><X className="mr-1.5 h-4 w-4" />Close</Button>
              <Button asChild className="flex-1"><Link to="/orders/$id" params={{ id: "ORD-2026-1048" }}>View Order</Link></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, children, className = "" }: { label: string; value?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children ?? <input className="input" defaultValue={value} readOnly={!!value} />}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 ${bold ? "text-base font-semibold" : "text-sm"}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
