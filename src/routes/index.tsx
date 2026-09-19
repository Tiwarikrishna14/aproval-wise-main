import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardBreakdowns } from "@/components/dashboard/dashboard-breakdowns";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardRankings } from "@/components/dashboard/dashboard-rankings";
import { DashboardStatus } from "@/components/dashboard/dashboard-status";
import { DataError } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/use-dashboard";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Akribiz B2B" },
      { name: "description", content: "Orders, customers, and approval performance." },
    ],
  }),
  component: DashboardPage,
});

const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "1 year", value: 365 },
] as const;

function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [greeting, setGreeting] = useState("Welcome");
  const dashboardQuery = useDashboard(days);
  const dashboard = dashboardQuery.data;

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.name?.trim() || "User"}`}
        description={
          dashboard
            ? `${formatDate(dashboard.fromDate)} – ${formatDate(dashboard.toDate)}`
            : "Business performance overview"
        }
        actions={
          <>
            <label className="sr-only" htmlFor="dashboard-period">
              Reporting period
            </label>
            <select
              id="dashboard-period"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dashboardQuery.refetch()}
              disabled={dashboardQuery.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${dashboardQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </>
        }
      />

      {dashboardQuery.isPending ? <DashboardLoading /> : null}
      {dashboardQuery.isError ? (
        <DataError message={dashboardQuery.error.message || "Unable to load dashboard."} />
      ) : null}
      {dashboard ? (
        <>
          <DashboardOverview dashboard={dashboard} />
          <DashboardStatus dashboard={dashboard} />
          <DashboardBreakdowns dashboard={dashboard} />
          <DashboardRankings dashboard={dashboard} />
        </>
      ) : null}
    </div>
  );
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
