import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, PackageX, Boxes, TrendingDown, XCircle, AlertTriangle, Download } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — StockFlow B2B" }] }),
  component: ReportsPage,
});

const REPORTS = [
  { icon: BarChart3, name: "Order Summary", desc: "All orders by status, customer, branch and period." },
  { icon: Clock, name: "Approval Turnaround Time", desc: "Average time per approval step and approver." },
  { icon: PackageX, name: "Low Stock Report", desc: "SKUs below threshold across all customers." },
  { icon: Boxes, name: "Customer Inventory Report", desc: "Available, reserved and consumed stock per customer." },
  { icon: TrendingDown, name: "Stock Movement Report", desc: "Received vs consumed over the last 90 days." },
  { icon: XCircle, name: "Rejected Orders", desc: "Orders rejected by reason and approver." },
  { icon: AlertTriangle, name: "SLA Breach Report", desc: "Tasks that missed or are at risk of missing SLA." },
];

function ReportsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Reports" description="Operational reports for orders, approvals and inventory." actions={<Button variant="outline" size="sm"><Download className="mr-1.5 h-4 w-4" />Export All</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.name} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><r.icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{r.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{r.desc}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline">CSV</Button>
              <Button size="sm" variant="outline">Excel</Button>
              <Button size="sm" variant="outline">PDF</Button>
              <Button size="sm" className="ml-auto">View</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
