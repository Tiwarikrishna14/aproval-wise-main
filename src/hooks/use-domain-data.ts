import { useQuery } from "@tanstack/react-query";

import {
  approvalsApi,
  auditLogsApi,
  faqApi,
  inventoryApi,
  notificationsApi,
  productsApi,
  reportsApi,
  stockRequestsApi,
  stockVerificationApi,
  workflowsApi,
} from "@/services/domain-api.service";

const queryDefaults = {
  staleTime: 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export function useInventory() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["inventory"],
    queryFn: inventoryApi.list,
  });
}

export function useInventoryItem(sku: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ["inventory", sku],
    queryFn: () => inventoryApi.get(sku),
    enabled: Boolean(sku),
  });
}

export function useProducts() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["products"],
    queryFn: productsApi.list,
  });
}

export function useStockRequests() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["stock-requests"],
    queryFn: stockRequestsApi.list,
  });
}

export function useApprovals() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["approvals"],
    queryFn: approvalsApi.list,
  });
}

export function useApproval(id: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ["approvals", id],
    queryFn: () => approvalsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useNotifications() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });
}

export function useAuditLogs() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["audit-logs"],
    queryFn: auditLogsApi.list,
  });
}

export function useWorkflows() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["workflows"],
    queryFn: workflowsApi.list,
  });
}

export function useStockVerification() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["stock-verification"],
    queryFn: stockVerificationApi.list,
  });
}

export function useFaqs() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["faqs"],
    queryFn: faqApi.list,
  });
}

export function useReports() {
  return useQuery({
    ...queryDefaults,
    queryKey: ["reports"],
    queryFn: reportsApi.list,
  });
}
