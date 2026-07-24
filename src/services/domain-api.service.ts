import type {
  ApprovalTask,
  AuditLogItem,
  FaqItem,
  InventoryItem,
  NotificationItem,
  Order,
  Product,
  ReportItem,
  StockRequest,
  StockVerificationItem,
  Workflow,
} from "@/lib/domain-types";

function emptyList<T>() {
  return Promise.resolve([] as T[]);
}

function missingDetail<T>() {
  return Promise.resolve(undefined as T | undefined);
}

function unsupportedMutation(entity: string) {
  return Promise.reject(new Error(`${entity} API is not supported by the current backend.`));
}

export const ordersApi = {
  list: () => emptyList<Order>(),
  get: (_id: string) => missingDetail<Order>(),
  create: (_body: unknown) => unsupportedMutation("Orders"),
};

export const inventoryApi = {
  list: () => emptyList<InventoryItem>(),
  get: (_sku: string) => missingDetail<InventoryItem>(),
};

export const productsApi = {
  list: () => emptyList<Product>(),
};

export const stockRequestsApi = {
  list: () => emptyList<StockRequest>(),
  create: (_body: unknown) => unsupportedMutation("Stock requests"),
};

export const approvalsApi = {
  list: () => emptyList<ApprovalTask>(),
  get: (_id: string) => missingDetail<ApprovalTask>(),
  submitDecision: (_id: string, _body: unknown) => unsupportedMutation("Approval decisions"),
};

export const notificationsApi = {
  list: () => emptyList<NotificationItem>(),
};

export const auditLogsApi = {
  list: () => emptyList<AuditLogItem>(),
};

export const workflowsApi = {
  list: () => emptyList<Workflow>(),
};

export const stockVerificationApi = {
  list: () => emptyList<StockVerificationItem>(),
};

export const faqApi = {
  list: () => emptyList<FaqItem>(),
};

export const reportsApi = {
  list: () => emptyList<ReportItem>(),
};
