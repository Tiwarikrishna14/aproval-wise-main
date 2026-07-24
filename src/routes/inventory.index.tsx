import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  Archive as ArchiveIcon,
  Boxes,
  Filter,
  PackageX,
  Plus,
  RotateCcw,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

import { DataError, TableLoadingRows, TableMessageRow } from "@/components/data-state";
import { MetricCard, PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventory } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/inventory/")({
  head: () => ({ meta: [{ title: "Inventory - StockFlow B2B" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const { data: inventory = [], isLoading, isError, error } = useInventory();
  const totalAvailable = inventory.reduce((sum, item) => sum + (item.available ?? 0), 0);
  const lowStock = inventory.filter((item) => item.status === "Low Stock").length;
  const outOfStock = inventory.filter((item) => item.status === "Out of Stock").length;
  const archived = inventory.filter((item) => item.status === "Archived").length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="My Inventory"
        description="Real-time view of stock, consumption, and reorder needs."
        actions={
          <Button asChild>
            <Link to="/stock-requests/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Request Stock
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={Boxes} label="Total Products" value={inventory.length} />
        <MetricCard
          icon={Boxes}
          label="Available Units"
          value={totalAvailable.toLocaleString("en-IN")}
          tone="success"
        />
        <MetricCard icon={AlertTriangle} label="Low Stock Items" value={lowStock} tone="warning" />
        <MetricCard icon={PackageX} label="Out of Stock" value={outOfStock} tone="destructive" />
        <MetricCard icon={ArchiveIcon} label="Archived Items" value={archived} />
      </div>

      {isError ? (
        <DataError message={`Failed to load inventory: ${error.message}`} />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Tabs defaultValue="Active Stock">
            <div className="border-b border-border px-3 pt-2">
              <TabsList className="h-10 bg-transparent gap-1 flex-wrap">
                {["Active Stock", "Low Stock", "Out of Stock", "Return Requested", "Archived"].map(
                  (tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-8 rounded-md text-[13px]"
                    >
                      {tab}
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
            </div>

            <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_auto_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                  placeholder="Search products..."
                />
              </div>
              <Button variant="outline" size="sm" disabled>
                <Filter className="mr-1.5 h-4 w-4" />
                Category
              </Button>
              <Button variant="outline" size="sm" disabled>
                Branch
              </Button>
              <Button variant="outline" size="sm" disabled>
                Threshold
              </Button>
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
                  {isLoading ? (
                    <TableLoadingRows columns={9} />
                  ) : inventory.length === 0 ? (
                    <TableMessageRow columns={9} message="No inventory returned by backend." />
                  ) : (
                    inventory.map((item) => (
                      <tr key={item.sku} className="border-t border-border hover:bg-surface/50">
                        <td className="px-4 py-3">
                          <Link
                            to="/inventory/$sku"
                            params={{ sku: item.sku }}
                            className="font-medium text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3">{item.category ?? "-"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {item.available ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {item.reserved ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {item.consumed ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {item.threshold ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          {item.status ? <StatusBadge status={item.status} /> : "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.updated ?? "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setDeclineOpen(true)}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setArchiveOpen(true)}>
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/inventory/$sku" params={{ sku: item.sku }}>
                                Open
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Tabs>
        </div>
      )}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogTitle>Archive Stock</DialogTitle>
          <DialogDescription>
            This action requires a backend mutation endpoint before it can be submitted.
          </DialogDescription>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Close
            </Button>
            <Button disabled>Archive Stock</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Decline Stock</DialogTitle>
          <DialogDescription>
            This action requires a backend mutation endpoint before it can be submitted.
          </DialogDescription>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Comments</label>
              <textarea className="input min-h-[80px]" disabled />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>
              Close
            </Button>
            <Button disabled>Submit Decline Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
