import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Repeat, MessageSquare, XCircle, CheckCircle2, Loader2, Circle, Truck, Package, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { orders } from "@/lib/sample-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({ meta: [{ title: `Order ${params.id} — StockFlow B2B` }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const order = orders.find((o) => o.id === id) ?? orders[0];

  const timeline = [
    { title: "Order Submitted", by: "Rahul Sharma", time: "10 Jul 2026, 10:30 AM", state: "done" as const },
    { title: "Order Review", by: "Priya Verma", time: "10 Jul 2026, 11:45 AM", state: "done" as const },
    { title: "Stock Verification", by: "Amit Kumar", time: "In progress", state: "active" as const },
    { title: "Finance Approval", by: "Neha Singh", time: "Not started", state: "pending" as const },
    { title: "Final Approval", by: "Vikram Mehta", time: "Not started", state: "pending" as const },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/orders"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Orders</Link></Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">Order {order.id}</h2>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
              <Meta k="Created" v={order.createdDate} />
              <Meta k="Required" v={order.requiredDate} />
              <Meta k="Customer" v={order.customer} />
              <Meta k="Branch" v={order.branch} />
              <Meta k="Total" v={`₹${order.totalAmount.toLocaleString("en-IN")}`} />
              <Meta k="Priority" v={order.priority} />
              <Meta k="Submitted by" v={order.submittedBy} />
              <Meta k="Current Step" v={order.currentStep} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm"><XCircle className="mr-1.5 h-4 w-4" />Cancel Order</Button>
            <Button variant="outline" size="sm"><Download className="mr-1.5 h-4 w-4" />Download</Button>
            <Button variant="outline" size="sm"><Repeat className="mr-1.5 h-4 w-4" />Reorder</Button>
            <Button size="sm"><MessageSquare className="mr-1.5 h-4 w-4" />Contact Support</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card">
          <Tabs defaultValue="summary">
            <div className="border-b border-border px-3 pt-2">
              <TabsList className="h-10 bg-transparent p-0 gap-1">
                <TabsTrigger value="summary">Order Summary</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="approvals">Approval History</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary" className="p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <SummaryBlock title="Delivery Information" lines={["Warehouse 4B, Bhiwandi", "Mumbai — 421302", "Contact: Rahul Sharma", "+91 98200 12345"]} />
                <SummaryBlock title="Billing Information" lines={["Acme Retail Pvt. Ltd.", "GSTIN 27AABCT1234C1Z5", "Andheri East, Mumbai", "accounts@acmeretail.in"]} />
                <SummaryBlock title="Order Totals" lines={[`Subtotal: ₹${(order.totalAmount * 0.83).toLocaleString("en-IN", {maximumFractionDigits:0})}`, `Tax (18%): ₹${(order.totalAmount * 0.15).toLocaleString("en-IN", {maximumFractionDigits:0})}`, "Shipping: ₹850", `Grand Total: ₹${order.totalAmount.toLocaleString("en-IN")}`]} />
                <SummaryBlock title="Account Manager" lines={["Vikram Mehta", "vikram@stockflow.io", "+91 98111 22334", "Responds within 4h"]} />
              </div>
              <div className="mt-6 rounded-md border border-border bg-surface/60 p-4">
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Order Notes</div>
                <p className="mt-1 text-sm">Priority delivery required before quarter-end audit. Please batch with pending POS Terminal shipment where possible.</p>
              </div>
            </TabsContent>

            <TabsContent value="products" className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Product</th>
                      <th className="px-5 py-3 text-right font-medium">Requested</th>
                      <th className="px-5 py-3 text-right font-medium">Approved</th>
                      <th className="px-5 py-3 text-right font-medium">Fulfilled</th>
                      <th className="px-5 py-3 text-right font-medium">Unit Price</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Thermal Paper Roll", sku: "TPR-80MM", req: 60, appr: 60, ful: 40, price: 85, status: "Processing" },
                      { name: "Barcode Scanner", sku: "BCS-2100", req: 10, appr: 8, ful: 8, price: 3200, status: "Approved" },
                      { name: "Packaging Tape", sku: "PKT-48MM", req: 40, appr: 0, ful: 0, price: 42, status: "Rejected" },
                      { name: "Printer Cartridge", sku: "PC-BLK-05", req: 10, appr: 10, ful: 6, price: 1450, status: "In Transit" },
                    ].map((p) => (
                      <tr key={p.sku} className="border-t border-border">
                        <td className="px-5 py-3"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.sku}</div></td>
                        <td className="px-5 py-3 text-right tabular-nums">{p.req}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{p.appr}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{p.ful}</td>
                        <td className="px-5 py-3 text-right tabular-nums">₹{p.price.toLocaleString("en-IN")}</td>
                        <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="approvals" className="p-6">
              <ol className="space-y-4">
                {timeline.map((t, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <StepIcon state={t.state} />
                      {i < timeline.length - 1 && <div className="mt-1 h-14 w-px bg-border" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <div className="text-sm font-semibold">{t.title}</div>
                        {t.state === "done" && <span className="text-xs text-success">Completed</span>}
                        {t.state === "active" && <span className="text-xs text-primary">In progress</span>}
                        {t.state === "pending" && <span className="text-xs text-muted-foreground">Pending</span>}
                      </div>
                      <div className="mt-0.5 text-[13px] text-muted-foreground">
                        {t.state === "pending" ? `Assigned to ${t.by}` : `${t.state === "active" ? "Assigned to" : "Completed by"} ${t.by}`} · {t.time}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </TabsContent>

            <TabsContent value="tracking" className="p-6">
              <div className="grid gap-4 sm:grid-cols-5">
                {[
                  { label: "Processing", icon: Package, done: true },
                  { label: "Packed", icon: Package, done: true },
                  { label: "Dispatched", icon: Warehouse, done: true },
                  { label: "In Transit", icon: Truck, done: false, active: true },
                  { label: "Delivered", icon: CheckCircle2, done: false },
                ].map((s) => (
                  <div key={s.label} className={`rounded-md border p-3 text-center ${s.active ? "border-primary/40 bg-primary/5" : s.done ? "border-success/30 bg-success/5" : "border-border bg-surface/50"}`}>
                    <s.icon className={`mx-auto h-5 w-5 ${s.active ? "text-primary" : s.done ? "text-success" : "text-muted-foreground"}`} />
                    <div className="mt-1.5 text-xs font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-md border border-border bg-surface/50 p-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Meta k="Courier" v="BlueDart Express" />
                  <Meta k="Tracking ID" v="BD-2026-4483012" />
                  <Meta k="Expected Delivery" v="18 Jul 2026" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {["Purchase Order.pdf", "Quotation.pdf", "GST Invoice.pdf", "Delivery Challan.pdf"].map((f) => (
                  <div key={f} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded bg-secondary text-xs font-semibold">PDF</div><div className="text-sm font-medium">{f}</div></div>
                    <Button variant="outline" size="sm">Download</Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="p-6 space-y-4">
              {[
                { by: "Priya Verma", role: "Order Reviewer", text: "Reviewed and cleared for stock verification.", time: "11:45 AM" },
                { by: "Amit Kumar", role: "Stock Verifier", text: "Packaging Tape shortage detected — suggesting partial fulfillment.", time: "12:20 PM" },
              ].map((c, i) => (
                <div key={i} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between text-xs"><div className="font-medium">{c.by} <span className="text-muted-foreground">· {c.role}</span></div><div className="text-muted-foreground">{c.time}</div></div>
                  <p className="mt-2 text-sm">{c.text}</p>
                </div>
              ))}
              <textarea className="input min-h-[80px]" placeholder="Add a comment…" />
              <Button size="sm">Post Comment</Button>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Approval Progress</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-2xl font-semibold tabular-nums">2</div>
            <div className="text-sm text-muted-foreground">of 5 steps completed</div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary" style={{ width: "40%" }} />
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Current approver</div>
              <div className="mt-0.5 font-medium">Amit Kumar</div>
              <div className="text-xs text-muted-foreground">Stock Verifier</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Estimated completion</div>
              <div className="mt-0.5 font-medium">12 Jul 2026, 6:00 PM</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">SLA</div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="h-3.5 w-3.5" />Within SLA</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="mt-0.5 text-sm font-medium">{v}</div>
    </div>
  );
}

function SummaryBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-md border border-border bg-surface/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-2 space-y-0.5 text-sm">
        {lines.map((l, i) => <div key={i} className={i === 0 ? "font-medium" : "text-muted-foreground"}>{l}</div>)}
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: "done" | "active" | "pending" | "rejected" }) {
  if (state === "done") return <div className="grid h-8 w-8 place-items-center rounded-full bg-success/15 text-success"><CheckCircle2 className="h-4 w-4" /></div>;
  if (state === "active") return <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (state === "rejected") return <div className="grid h-8 w-8 place-items-center rounded-full bg-destructive/15 text-destructive"><XCircle className="h-4 w-4" /></div>;
  return <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground"><Circle className="h-4 w-4" /></div>;
}
