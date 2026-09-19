import { ClipboardCheck, Clock3, UsersRound, type LucideIcon } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

import { Section } from "@/components/page-parts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { DashboardOrderStatus, DashboardResponse } from "@/services/dashboard-api.service";

const statuses: DashboardOrderStatus[] = [
  "DRAFT",
  "CREATED",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SUBMITTED",
  "REJECTED",
  "PENDING",
  "CONFIRMED",
  "DELIVERED",
  "ABANDONED",
];

const labels: Record<DashboardOrderStatus, string> = {
  DRAFT: "Draft",
  CREATED: "Awaiting Approval",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  SUBMITTED: "Submitted",
  REJECTED: "Rejected",
  PENDING: "Supplier Pending",
  CONFIRMED: "Confirmed",
  DELIVERED: "Delivered",
  ABANDONED: "Abandoned",
};

const colors: Record<DashboardOrderStatus, string> = {
  DRAFT: "#94a3b8",
  CREATED: "#f59e0b",
  CHANGES_REQUESTED: "#f97316",
  APPROVED: "#22c55e",
  SUBMITTED: "#3b82f6",
  REJECTED: "#ef4444",
  PENDING: "#eab308",
  CONFIRMED: "#06b6d4",
  DELIVERED: "#10b981",
  ABANDONED: "#64748b",
};

export function DashboardStatus({ dashboard }: { dashboard: DashboardResponse }) {
  const statusData = statuses.map((status) => ({
    status,
    name: labels[status],
    value: dashboard.orderStatusCounts[status] ?? 0,
  }));
  const chartData = statusData.filter((item) => item.value > 0);
  const totalOrders = statusData.reduce((total, item) => total + item.value, 0);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Section title="Order Status" description="Orders in the selected reporting period">
        <div className="grid items-center gap-3 p-4 md:grid-cols-[190px_1fr]">
          <div className="relative mx-auto w-full max-w-[190px]">
            {chartData.length ? (
              <ChartContainer config={{}} className="aspect-square w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {chartData.map((item) => (
                      <Cell key={item.status} fill={colors[item.status]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="aspect-square rounded-full border-[22px] border-muted" />
            )}
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <strong className="text-3xl tabular-nums">
                {totalOrders.toLocaleString("en-IN")}
              </strong>
              <span className="text-xs text-muted-foreground">Total orders</span>
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {statusData.map((item) => (
              <div key={item.status} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colors[item.status] }}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.name}</span>
                <span className="font-medium tabular-nums">
                  {item.value.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Approval Load" description="Current approval workload">
        <div className="grid gap-2 p-4">
          <ApprovalMetric
            icon={Clock3}
            label="Awaiting Approval"
            value={dashboard.approvalLoad.awaitingApproval}
            iconClassName="bg-warning/15 text-warning-foreground"
          />
          <ApprovalMetric
            icon={ClipboardCheck}
            label="Partially Approved"
            value={dashboard.approvalLoad.partiallyApproved}
            iconClassName="bg-info/10 text-info"
          />
          <ApprovalMetric
            icon={UsersRound}
            label="Pending Approver Actions"
            value={dashboard.approvalLoad.pendingApproverActions}
            iconClassName="bg-primary/10 text-primary"
          />
        </div>
      </Section>
    </div>
  );
}

function ApprovalMetric({
  icon: Icon,
  label,
  value,
  iconClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  iconClassName: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${iconClassName}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{label}</span>
      <strong className="text-lg tabular-nums">{value.toLocaleString("en-IN")}</strong>
    </div>
  );
}
