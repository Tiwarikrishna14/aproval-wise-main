import { apiGet } from "./api-client";
import type { ApiEnvelope } from "./admin-api.service";

export type DashboardType =
  | "SUPER_ADMIN"
  | "ORGANIZATION_ADMIN"
  | "BRANCH_ADMIN"
  | "CUSTOMER_ADMIN"
  | "CUSTOMER_USER"
  | "EMPLOYEE";

export type DashboardOrderStatus =
  | "DRAFT"
  | "CREATED"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "SUBMITTED"
  | "REJECTED"
  | "PENDING"
  | "CONFIRMED"
  | "DELIVERED"
  | "ABANDONED";

export interface DashboardScope {
  organizationId: string | null;
  branchId: string | null;
  businessCustomerId: string | null;
}

export interface DashboardOverview {
  organizationCount?: number;
  activeBranchCount: number;
  businessCustomerCount: number;
  activeDealingCustomers: number;
  totalOrders: number;
  totalOrderValue: number;
}

export interface ApprovalLoad {
  awaitingApproval: number;
  partiallyApproved: number;
  pendingApproverActions: number;
}

export interface OrganizationDashboardItem {
  id: string;
  name: string;
  organization_code: string;
  active_branch_count: number;
  business_customer_count: number;
  order_count: number;
}

export interface BranchDashboardItem {
  id: string;
  name: string;
  branch_code: string;
  business_customer_count: number;
  order_count: number;
}

export interface TopCustomerItem {
  id: string;
  name: string;
  order_count: number;
  order_value: number;
}

export interface TopOrderLocationItem {
  name: string;
  order_count: number;
}

export interface TopOrderItem {
  id: string;
  order_number: string;
  business_customer_name: string;
  status: DashboardOrderStatus;
  created_at: string;
  total_amount: number;
}

export interface DashboardResponse {
  dashboardType: DashboardType;
  scope: DashboardScope;
  fromDate: string;
  toDate: string;
  overview: DashboardOverview;
  orderStatusCounts: Partial<Record<DashboardOrderStatus, number>>;
  approvalLoad: ApprovalLoad;
  organizationBreakdown: OrganizationDashboardItem[];
  branchBreakdown: BranchDashboardItem[];
  topCustomers: TopCustomerItem[];
  topOrderLocations: TopOrderLocationItem[];
  topOrders: TopOrderItem[];
}

export const dashboardApi = {
  get: async (days = 30) => {
    const response = await apiGet<ApiEnvelope<DashboardResponse>>(`/api/dashboard?days=${days}`);
    return { ...response, data: normalizeDashboard(response.data) };
  },
};

function normalizeDashboard(data: DashboardResponse): DashboardResponse {
  return {
    ...data,
    scope: data.scope ?? { organizationId: null, branchId: null, businessCustomerId: null },
    overview: {
      organizationCount: data.overview?.organizationCount,
      activeBranchCount: data.overview?.activeBranchCount ?? 0,
      businessCustomerCount: data.overview?.businessCustomerCount ?? 0,
      activeDealingCustomers: data.overview?.activeDealingCustomers ?? 0,
      totalOrders: data.overview?.totalOrders ?? 0,
      totalOrderValue: data.overview?.totalOrderValue ?? 0,
    },
    orderStatusCounts: data.orderStatusCounts ?? {},
    approvalLoad: {
      awaitingApproval: data.approvalLoad?.awaitingApproval ?? 0,
      partiallyApproved: data.approvalLoad?.partiallyApproved ?? 0,
      pendingApproverActions: data.approvalLoad?.pendingApproverActions ?? 0,
    },
    organizationBreakdown: data.organizationBreakdown ?? [],
    branchBreakdown: data.branchBreakdown ?? [],
    topCustomers: data.topCustomers ?? [],
    topOrderLocations: data.topOrderLocations ?? [],
    topOrders: data.topOrders ?? [],
  };
}
