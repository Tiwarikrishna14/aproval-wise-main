import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-parts";

export const Route = createFileRoute("/stock-verification")({
  head: () => ({ meta: [{ title: "Stock Verification — StockFlow B2B" }] }),
  component: StockVerify,
});

function StockVerify() {
  const items = [
    { name: "Thermal Paper Roll", sku: "TPR-80MM", req: 60, avail: 42, reserved: 20, approved: 40, shortage: 20, status: "Partially Available" },
    { name: "Barcode Scanner", sku: "BCS-2100", req: 10, avail: 18, reserved: 4, approved: 10, shortage: 0, status: "Available" },
    { name: "Packaging Tape", sku: "PKT-48MM", req: 40, avail: 0, reserved: 0, approved: 0, shortage: 40, status: "Not Available" },
    { name: "Printer Cartridge", sku: "PC-BLK-05", req: 10, avail: 8, reserved: 2, approved: 8, shortage: 2, status: "Alternative Suggested" },
  ];
  const totalReq = items.reduce((s, i) => s + i.req, 0);
  const totalAvail = items.reduce((s, i) => s + Math.min(i.req, i.avail), 0);
  const totalShort = items.reduce((s, i) => s + i.shortage, 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Stock Verification for Order #ORD-2026-1048" description="Confirm stock availability before this order proceeds to Finance Approval." />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card label="Total Requested" value={totalReq} />
        <Card label="Total Available" value={totalAvail} tone="success" />
        <Card label="Total Shortage" value={totalShort} tone="destructive" />
        <Card label="Est. Fulfillment" value="18 Jul 2026" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Product</th>
              <th className="px-4 py-3 text-right font-medium">Requested</th>
              <th className="px-4 py-3 text-right font-medium">Warehouse</th>
              <th className="px-4 py-3 text-right font-medium">Reserved</th>
              <th className="px-4 py-3 text-right font-medium">Approved Qty</th>
              <th className="px-4 py-3 text-right font-medium">Shortage</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.sku} className="border-t border-border">
                <td className="px-4 py-3"><div className="font-medium">{i.name}</div><div className="text-[11px] text-muted-foreground">{i.sku}</div></td>
                <td className="px-4 py-3 text-right tabular-nums">{i.req}</td>
                <td className="px-4 py-3 text-right tabular-nums">{i.avail}</td>
                <td className="px-4 py-3 text-right tabular-nums">{i.reserved}</td>
                <td className="px-4 py-3 text-right"><input className="input w-20 text-right" defaultValue={i.approved} /></td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${i.shortage > 0 ? "text-destructive" : "text-success"}`}>{i.shortage}</td>
                <td className="px-4 py-3"><StatusBadge status={i.status === "Available" ? "Healthy" : i.status === "Not Available" ? "Out of Stock" : "Low Stock"} /></td>
                <td className="px-4 py-3"><input className="input h-8" placeholder="Add note" /></td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">Suggest Alt.</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline">Send Back</Button>
        <Button variant="outline">Reject Item</Button>
        <Button variant="outline">Suggest Alternative</Button>
        <Button variant="outline">Partially Approve</Button>
        <Button>Confirm Stock</Button>
      </div>
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: number | string; tone?: "success" | "destructive" }) {
  const c = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${c}`}>{value}</div>
    </div>
  );
}
