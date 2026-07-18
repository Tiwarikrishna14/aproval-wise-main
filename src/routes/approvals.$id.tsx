import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, XCircle, Undo2, HelpCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/approvals/$id")({
  head: () => ({ meta: [{ title: "Approval Review — StockFlow B2B" }] }),
  component: ApprovalReview,
});

function ApprovalReview() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/approvals"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Queue</Link></Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Approval Task · {id}</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Order ORD-2026-1048</h2>
                <div className="mt-1 text-sm text-muted-foreground">Acme Retail Pvt. Ltd. · Submitted by Rahul Sharma · 10 Jul 2026</div>
              </div>
              <StatusBadge status="Under Review" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Info k="Total Amount" v="₹84,500" />
              <Info k="Items" v="4 products" />
              <Info k="Priority" v="High" />
              <Info k="Branch" v="Mumbai HQ" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3 text-sm font-semibold">Products</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Product</th>
                    <th className="px-5 py-3 text-right font-medium">Requested</th>
                    <th className="px-5 py-3 text-right font-medium">Approved Qty</th>
                    <th className="px-5 py-3 text-right font-medium">Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Thermal Paper Roll", 60, 85],
                    ["Barcode Scanner", 10, 3200],
                    ["Packaging Tape", 40, 42],
                    ["Printer Cartridge", 10, 1450],
                  ].map(([n, q, p]) => (
                    <tr key={n as string} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{n as string}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{q as number}</td>
                      <td className="px-5 py-3 text-right"><input className="input w-24 text-right" defaultValue={q as number} /></td>
                      <td className="px-5 py-3 text-right tabular-nums">₹{(p as number).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-sm font-semibold">Previous Order History</div>
            <ul className="mt-3 divide-y divide-border">
              {["ORD-2026-1047 · 09 Jul · ₹1,56,000 · Approved", "ORD-2026-1046 · 08 Jul · ₹21,800 · Delivered", "ORD-2026-1045 · 05 Jul · ₹62,400 · Delivered"].map((l) => (
                <li key={l} className="py-2 text-sm text-muted-foreground">{l}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-sm font-semibold">Comments</div>
            <div className="mt-3 space-y-3">
              <div className="rounded-md border border-border p-3 text-sm">
                <div className="text-xs text-muted-foreground">Priya Verma · Order Reviewer · 11:45 AM</div>
                <div className="mt-1">Cleared for stock verification. Please double-check Packaging Tape availability.</div>
              </div>
            </div>
          </div>
        </div>

        <aside className="sticky top-24 h-fit space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Current Step</div>
            <div className="mt-1 text-lg font-semibold">Stock Verification</div>
            <div className="mt-2 space-y-2 text-sm">
              <Row k="Assigned to" v="Amit Kumar" />
              <Row k="Deadline" v="12 Jul, 6:00 PM" />
              <Row k="Prev. Approver" v="Priya Verma" />
            </div>
          </div>

          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-warning-foreground shrink-0" />
              <div>You cannot approve an order created by you. This safeguard is enforced by the workflow.</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm font-semibold">Decision</div>
            <div className="mt-3 space-y-2">
              <DecisionButton icon={CheckCircle2} label="Approve" tone="success" />
              <DecisionButton icon={CheckCircle2} label="Partially Approve" tone="info" />
              <DecisionButton icon={XCircle} label="Reject" tone="destructive" />
              <DecisionButton icon={Undo2} label="Return for Correction" tone="warning" />
              <DecisionButton icon={HelpCircle} label="Request Information" tone="default" />
            </div>
            <div className="mt-4 space-y-2">
              <textarea className="input min-h-[90px]" placeholder="Approval comments…" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="flex-1">Save Draft</Button>
              <Button className="flex-1">Submit Decision</Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return <div className="rounded-md border border-border bg-surface/50 p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="mt-0.5 text-sm font-semibold">{v}</div></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
function DecisionButton({ icon: Icon, label, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; tone: "success" | "destructive" | "warning" | "info" | "default" }) {
  const toneMap: Record<string, string> = {
    success: "border-success/30 text-success hover:bg-success/10",
    destructive: "border-destructive/30 text-destructive hover:bg-destructive/10",
    warning: "border-warning/40 text-warning-foreground hover:bg-warning/10",
    info: "border-info/30 text-info hover:bg-info/10",
    default: "border-border text-foreground hover:bg-surface",
  };
  return (
    <button className={`flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium ${toneMap[tone]}`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
