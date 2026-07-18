import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/stock-requests/new")({
  head: () => ({ meta: [{ title: "Request Stock — StockFlow B2B" }] }),
  component: NewRequest,
});

function NewRequest() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/stock-requests"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link></Button>
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Request Stock</h2>
        <p className="text-sm text-muted-foreground">Submit a stock replenishment request for review and approval.</p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <div className="font-medium text-primary">Recommended order quantity: 50 units</div>
        <div className="mt-0.5 text-xs text-muted-foreground">Based on your last 60 days of consumption and current threshold.</div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Product</label>
            <select className="input"><option>Thermal Paper Roll (TPR-80MM)</option><option>Barcode Scanner (BCS-2100)</option><option>Printer Cartridge (PC-BLK-05)</option></select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Requested Quantity</label><input className="input" type="number" defaultValue={50} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Current Available Quantity</label><input className="input" defaultValue="42" readOnly /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Reorder Threshold</label><input className="input" defaultValue="100" readOnly /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Required Date</label><input type="date" className="input" defaultValue="2026-07-20" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Priority</label><select className="input"><option>High</option><option>Medium</option><option>Low</option></select></div>
          <div><label className="text-xs font-medium text-muted-foreground">Delivery Branch</label><select className="input"><option>Mumbai HQ</option><option>Delhi Warehouse</option><option>Bengaluru Store</option></select></div>
          <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Reason</label><select className="input"><option>Regular reorder</option><option>Below threshold</option><option>Special event</option><option>Client project</option></select></div>
          <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Comments</label><textarea className="input min-h-[100px]" /></div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Attachment</label>
            <button className="mt-1 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface/50 py-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary">
              <Upload className="h-4 w-4" /> Upload supporting document
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost">Save Draft</Button>
        <Button>Submit Request</Button>
      </div>
    </div>
  );
}
