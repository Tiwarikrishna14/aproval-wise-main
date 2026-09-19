import { Building2, GitBranch, Handshake, IndianRupee, ShoppingCart, Users } from "lucide-react";

import { canViewDashboardLevel } from "@/components/dashboard/dashboard-scope";
import { MetricCard } from "@/components/page-parts";
import type { DashboardResponse } from "@/services/dashboard-api.service";

export function DashboardOverview({ dashboard }: { dashboard: DashboardResponse }) {
  const { overview } = dashboard;
  const metrics = [
    ...(canViewDashboardLevel(dashboard, "global")
      ? [{ label: "Organizations", value: overview.organizationCount ?? 0, icon: Building2 }]
      : []),
    ...(canViewDashboardLevel(dashboard, "branch")
      ? [{ label: "Active Branches", value: overview.activeBranchCount, icon: GitBranch }]
      : []),
    ...(canViewDashboardLevel(dashboard, "customer")
      ? [
          ...(canViewDashboardLevel(dashboard, "branch")
            ? [{ label: "Business Customers", value: overview.businessCustomerCount, icon: Users }]
            : []),
          {
            label: "Active Dealing Customers",
            value: overview.activeDealingCustomers,
            icon: Handshake,
          },
        ]
      : []),
    { label: "Total Orders", value: overview.totalOrders, icon: ShoppingCart },
    { label: "Total Order Value", value: formatMoney(overview.totalOrderValue), icon: IndianRupee },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
