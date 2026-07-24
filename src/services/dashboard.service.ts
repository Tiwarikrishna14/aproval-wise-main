import type {
  ActivityItem,
  ApprovalTask,
  DashboardMetric,
  InventoryItem,
  Order,
  OrderOverviewPoint,
  WorkloadItem,
} from "@/lib/domain-types";

function emptyList<T>() {
  return Promise.resolve([] as T[]);
}

export const dashboardService = {
  customerMetrics: () => emptyList<DashboardMetric>(),
  customerOrderOverview: () => emptyList<OrderOverviewPoint>(),
  customerRecentOrders: () => emptyList<Order>(),
  customerLowStock: () => emptyList<InventoryItem>(),
  adminMetrics: () => emptyList<DashboardMetric>(),
  adminApprovalWorkload: () => emptyList<WorkloadItem>(),
  adminRecentActivity: () => emptyList<ActivityItem>(),
  adminAttention: () => emptyList<ApprovalTask>(),
};
