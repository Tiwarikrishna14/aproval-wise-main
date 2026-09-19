import type { DashboardResponse } from "@/services/dashboard-api.service";

export type DashboardScopeLevel = "customer" | "branch" | "organization" | "global";

const scopeRank: Record<DashboardScopeLevel, number> = {
  customer: 1,
  branch: 2,
  organization: 3,
  global: 4,
};

export function getDashboardScopeLevel(dashboard: DashboardResponse): DashboardScopeLevel {
  switch (dashboard.dashboardType) {
    case "SUPER_ADMIN":
      return "global";
    case "ORGANIZATION_ADMIN":
      return "organization";
    case "BRANCH_ADMIN":
      return "branch";
    case "CUSTOMER_ADMIN":
    case "CUSTOMER_USER":
      return "customer";
    default:
      if (dashboard.scope.businessCustomerId) return "customer";
      if (dashboard.scope.branchId) return "branch";
      if (dashboard.scope.organizationId) return "organization";
      return "customer";
  }
}

export function canViewDashboardLevel(
  dashboard: DashboardResponse,
  requiredLevel: DashboardScopeLevel,
) {
  return scopeRank[getDashboardScopeLevel(dashboard)] >= scopeRank[requiredLevel];
}
