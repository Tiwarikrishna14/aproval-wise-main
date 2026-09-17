import { apiGet, apiPost, apiPut } from "./api-client";
import type { ApiEnvelope, PageResponse, PageableQuery } from "./admin-api.service";
import type { BusinessCustomerLocationResponse } from "./admin-api.service";

export type OrderStatus =
  | "DRAFT"
  | "CREATED"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "SUBMITTED"
  | "REJECTED"
  | "PENDING"
  | "CONFIRMED"
  | "DELIVERED"
  | "ABANDONED"
  | string;

export type OrderItemResponse = {
  id?: number | string;
  productId?: number;
  productName?: string;
  itemDescription?: string;
  navItemCode?: string;
  productCode?: string;
  category?: string;
  uom?: string;
  quantity?: number;
  requestedQty?: number;
  approvedQty?: number;
  fulfilledQty?: number;
  unitPrice?: number;
  unitRate?: number;
  lineTotal?: number;
  totalAmount?: number;
  remark?: string;
  status?: string;
};

export type OrderApproverResponse = {
  id?: string;
  userId?: string;
  approverId?: string;
  approverName?: string;
  name?: string;
  email?: string;
  status?: string;
  remark?: string;
  actedAt?: string;
};

export type OrderResponse = {
  id: string;
  orderNumber?: string;
  organizationId?: string;
  branchId?: string;
  businessCustomerId?: string;
  businessCustomerLocationId?: string;
  locationDetails?: Omit<
    BusinessCustomerLocationResponse,
    "status" | "createdAt" | "updatedAt"
  > | null;
  businessCustomerCode?: string;
  businessCustomerName?: string;
  createdBy?: string;
  notes?: string;
  remarks?: string;
  priority?: string;
  location?: string;
  referenceNumber?: string;
  status?: OrderStatus;
  expectedDeliveryDate?: string;
  totalAmount?: number;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  items?: OrderItemResponse[];
  products?: OrderItemResponse[];
  approvers?: OrderApproverResponse[];
};

export type OrderProductRequest = {
  productId: number;
  quantity: number;
  unitPrice: number;
  remark?: string;
};

export type OrderMutationRequest = {
  notes?: string;
  remarks?: string;
  priority?: string;
  location?: string;
  businessCustomerLocationId?: string;
  locationCode?: string;
  referenceNumber?: string;
  products: OrderProductRequest[];
  approverIds: string[];
};

export type OrderListQuery = PageableQuery & {
  status?: string;
  createdBy?: string;
  businessCustomerId?: string;
  orderNumber?: string;
};

export type ApprovalActionRequest = {
  action: "APPROVE" | "REQUEST_CHANGES" | "REJECT";
  remark?: string;
};

export type SupplierActionRequest = {
  action: "REJECT" | "PENDING" | "CONFIRM" | "DELIVER";
  expectedDeliveryDate?: string;
  remark?: string;
};

function orderSearchParams(query: OrderListQuery = {}) {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  query.sort?.forEach((sort) => params.append("sort", sort));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.createdBy) params.set("createdBy", query.createdBy);
  if (query.businessCustomerId) params.set("businessCustomerId", query.businessCustomerId);
  if (query.orderNumber) params.set("orderNumber", query.orderNumber);

  return params.toString();
}

export function orderRecords(value: PageResponse<OrderResponse> | OrderResponse[] | undefined) {
  return Array.isArray(value) ? value : (value?.content ?? []);
}

export function orderPageResponse(
  value: PageResponse<OrderResponse> | OrderResponse[] | undefined,
) {
  return Array.isArray(value) ? undefined : value;
}

export function orderItems(order?: OrderResponse | null) {
  return order?.products ?? order?.items ?? [];
}

export const orderStatuses = [
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

export const editableOrderStatuses = ["DRAFT", "CREATED", "CHANGES_REQUESTED"];

export const ordersApi = {
  list: (query?: OrderListQuery) =>
    apiGet<ApiEnvelope<PageResponse<OrderResponse> | OrderResponse[]>>(
      `/api/orders?${orderSearchParams(query)}`,
    ),
  get: (id: string) => apiGet<ApiEnvelope<OrderResponse>>(`/api/orders/${id}`),
  create: (body: OrderMutationRequest) =>
    apiPost<ApiEnvelope<OrderResponse>, OrderMutationRequest>("/api/orders", body),
  update: (id: string, body: OrderMutationRequest) =>
    apiPut<ApiEnvelope<OrderResponse>, OrderMutationRequest>(`/api/orders/${id}`, body),
  approve: (id: string, body: ApprovalActionRequest) =>
    apiPost<ApiEnvelope<OrderResponse>, ApprovalActionRequest>(`/api/orders/${id}/approval`, body),
  submit: (id: string) => apiPost<ApiEnvelope<OrderResponse>>(`/api/orders/${id}/submit`),
  supplierAction: (id: string, body: SupplierActionRequest) =>
    apiPost<ApiEnvelope<OrderResponse>, SupplierActionRequest>(
      `/api/orders/${id}/supplier-action`,
      body,
    ),
};
