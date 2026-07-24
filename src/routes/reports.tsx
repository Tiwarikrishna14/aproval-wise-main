import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Clock,
  Download,
  PackageX,
  TrendingDown,
  XCircle,
} from "lucide-react";

import { DataError, EmptyState } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { useReports } from "@/hooks/use-domain-data";
import type { ReportItem } from "@/lib/domain-types";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports - StockFlow B2B" }] }),
  component: ReportsPage,
});

const reportIcons = {
  orders: BarChart3,
  time: Clock,
  stock: PackageX,
  inventory: Boxes,
  movement: TrendingDown,
  rejected: XCircle,
  sla: AlertTriangle,
} satisfies Record<NonNullable<ReportItem["iconKey"]>, typeof BarChart3>;

function ReportsPage() {
  const { data: reports = [], isLoading, isError, error } = useReports();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Reports"
        description="Operational reports returned by the backend."
        actions={
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-1.5 h-4 w-4" />
            Export All
          </Button>
        }
      />

      {isError ? (
        <DataError message={`Failed to load reports: ${error.message}`} />
      ) : isLoading ? (
        <EmptyState message="Loading reports from backend..." />
      ) : reports.length === 0 ? (
        <EmptyState message="No reports returned by backend." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report, index) => {
            const Icon = report.iconKey ? reportIcons[report.iconKey] : BarChart3;

            return (
              <div
                key={report.id ?? report.name ?? index}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{report.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {report.description ?? "No description returned by backend."}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled>
                    CSV
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    Excel
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    PDF
                  </Button>
                  <Button size="sm" className="ml-auto" disabled>
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
