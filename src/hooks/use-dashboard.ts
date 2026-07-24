import { useQuery } from "@tanstack/react-query";

import { dashboardService } from "@/services/dashboard.service";

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  customer: (section: string) => [...dashboardQueryKeys.all, "customer", section] as const,
  admin: (section: string) => [...dashboardQueryKeys.all, "admin", section] as const,
};

const dashboardQueryOptions = {
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export function useCustomerDashboard() {
  const metrics = useQuery({
    ...dashboardQueryOptions,
    queryKey: dashboardQueryKeys.customer("metrics"),
    queryFn: dashboardService.customerMetrics,
  });
  const orderOverview = useQuery({
    ...dashboardQueryOptions,
    queryKey: dashboardQueryKeys.customer("order-overview"),
    queryFn: dashboardService.customerOrderOverview,
  });
  const recentOrders = useQuery({
    ...dashboardQueryOptions,
    queryKey: dashboardQueryKeys.customer("recent-orders"),
    queryFn: dashboardService.customerRecentOrders,
  });
  const lowStock = useQuery({
    ...dashboardQueryOptions,
    queryKey: dashboardQueryKeys.customer("low-stock"),
    queryFn: dashboardService.customerLowStock,
  });

  return { metrics, orderOverview, recentOrders, lowStock };
}

export function useAdminDashboard() {
  const metrics = useQuery({
    ...dashboardQueryOptions,
    queryKey: dashboardQueryKeys.admin("metrics"),
    queryFn: dashboardService.adminMetrics,
  });
  const approvalWorkload = useQuery({
    ...dashboardQueryOptions,
    queryKey: dashboardQueryKeys.admin("approval-workload"),
    queryFn: dashboardService.adminApprovalWorkload,
  });
  const recentActivity = useQuery({
    ...dashboardQueryOptions,
    queryKey: dashboardQueryKeys.admin("recent-activity"),
    queryFn: dashboardService.adminRecentActivity,
  });
  const attention = useQuery({
    ...dashboardQueryOptions,
    queryKey: dashboardQueryKeys.admin("attention"),
    queryFn: dashboardService.adminAttention,
  });

  return { metrics, approvalWorkload, recentActivity, attention };
}
