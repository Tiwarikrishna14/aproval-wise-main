import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Filter, Plus, Search, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, MetricCard } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { inventory } from "@/lib/sample-data";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Boxes, PackageX, Archive as ArchiveIcon, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/inventory/")({
  head: () => ({ meta: [{ title: "Inventory — StockFlow B2B" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="My Inventory"
        description="Real-time view of stock, consumption, and reorder needs."
        actions={<Button asChild><Link to="/stock-requests/new"><Plus className="mr-1.5 h-4 w-4" />Request Stock</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={Boxes} label="Total Products" value={148} />
        <MetricCard icon={Boxes} label="Available Units" value="8,540" tone="success" />
        <MetricCard icon={AlertTriangle} label="Low Stock Items" value={7} tone="warning" />
        <MetricCard icon={PackageX} label="Out of Stock" value={3} tone="destructive" />
        <MetricCard icon={ArchiveIcon} label="Archived Items" value={18} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Tabs defaultValue="Active Stock">
          <div className="border-b border-border px-3 pt-2">
            <TabsList className="h-10 bg-transparent gap-1 flex-wrap">
              {["Active Stock", "Low Stock", "Out of Stock", "Return Requested", "Archived"].map((t) => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-8 rounded-md text-[13px]">{t}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15" placeholder="Search products…" />
            </div>
            <Button variant="outline" size="sm"><Filter className="mr-1.5 h-4 w-4" />Category</Button>
            <Button variant="outline" size="sm">Branch</Button>
            <Button variant="outline" size="sm">Threshold</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Available</th>
                  <th className="px-4 py-3 text-right font-medium">Reserved</th>
                  <th className="px-4 py-3 text-right font-medium">Consumed</th>
                  <th className="px-4 py-3 text-right font-medium">Threshold</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Updated</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((p) => (
                  <tr key={p.sku} className="border-t border-border hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <Link to="/inventory/$sku" params={{ sku: p.sku }} className="font-medium text-primary hover:underline">{p.name}</Link>
                      <div className="text-[11px] text-muted-foreground">{p.sku}</div>
                    </td>
                    <td className="px-4 py-3">{p.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.available}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.reserved}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.consumed}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.threshold}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{p.updated}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDeclineOpen(true)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setArchiveOpen(true)}><Archive className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" asChild><Link to="/inventory/$sku" params={{ sku: p.sku }}>Open</Link></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs>
      </div>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogTitle>Archive Stock</DialogTitle>
          <DialogDescription>
            Archived stock will be hidden from active inventory but all history and transactions will remain available.
          </DialogDescription>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button onClick={() => setArchiveOpen(false)}>Archive Stock</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Decline Stock</DialogTitle>
          <DialogDescription>Submit a decline request for this SKU. It will be reviewed by an administrator.</DialogDescription>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Product</label><input className="input" defaultValue="Thermal Paper Roll" readOnly /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Available Qty</label><input className="input" defaultValue="42" readOnly /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Qty to Decline</label><input className="input" type="number" defaultValue={10} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Reason</label>
                <select className="input"><option>No longer required</option><option>Excess stock</option><option>Product replaced</option><option>Damaged</option><option>Incorrect item</option><option>Other</option></select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Comments</label><textarea className="input min-h-[80px]" /></div>
            <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
              Submitting this request will not immediately remove stock. It will be reviewed by an administrator.
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button onClick={() => setDeclineOpen(false)}>Submit Decline Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
