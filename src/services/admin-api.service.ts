import { apiDelete, apiGet, apiPost, apiPut } from "./api-client";

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string>;
  timestamp?: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type OrganizationResponse = {
  id: string;
  organizationCode: string;
  name: string;
  organizationType: "PARENT" | "SYSTEM" | "CUSTOMER" | "SUPPLIER" | "BRANCH";
  parentOrganizationId?: string;
  email?: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt?: string;
  updatedAt?: string;
};

export type CreateOrganizationRequest = {
  organizationCode: string;
  name: string;
  organizationType: OrganizationResponse["organizationType"];
  parentOrganizationId?: string;
  email?: string;
  phone?: string;
};

export type UpdateOrganizationRequest = {
  name: string;
  organizationType: OrganizationResponse["organizationType"];
  parentOrganizationId?: string;
  email?: string;
  phone?: string;
};

export type UserResponse = {
  id: string;
  organizationId: string;
  branchId?: string;
  businessCustomerId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | "LOCKED" | "PENDING";
  emailVerified?: boolean;
  roles: string[];
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateUserRequest = {
  organizationId?: string;
  branchId?: string;
  businessCustomerId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  roleIds?: string[];
};

export type UpdateUserRequest = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

export type RoleResponse = {
  id: string;
  organizationId?: string;
  name: string;
  description?: string;
  systemRole: boolean;
  active: boolean;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type AssignPermissionsRequest = {
  permissionIds: string[];
};

export type PermissionResponse = {
  id: string;
  code: string;
  name: string;
  description?: string;
  module?: string;
};

export type PageableQuery = {
  page?: number;
  size?: number;
  sort?: string[];
  search?: string;
};

function buildSearchParams(query: PageableQuery = {}) {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));

  query.sort?.forEach((sort) => params.append("sort", sort));
  if (query.search) params.set("search", query.search);

  return params.toString();
}

export const usersApi = {
  list: (query?: PageableQuery) =>
    apiGet<ApiEnvelope<PageResponse<UserResponse>>>(`/api/users?${buildSearchParams(query)}`),
  get: (id: string) => apiGet<ApiEnvelope<UserResponse>>(`/api/users/${id}`),
  create: (body: CreateUserRequest) => apiPost<ApiEnvelope<UserResponse>>("/api/users", body),
  update: (id: string, body: UpdateUserRequest) =>
    apiPut<ApiEnvelope<UserResponse>>(`/api/users/${id}`, body),
};

export const rolesApi = {
  list: (query?: PageableQuery) =>
    apiGet<ApiEnvelope<PageResponse<RoleResponse>>>(`/api/roles?${buildSearchParams(query)}`),
  assignPermissions: (id: string, body: AssignPermissionsRequest) =>
    apiPost<ApiEnvelope<RoleResponse>>(`/api/roles/${id}/permissions`, body),
  removePermission: (id: string, permissionId: string) =>
    apiDelete<ApiEnvelope<RoleResponse>>(`/api/roles/${id}/permissions/${permissionId}`),
};

export const organizationsApi = {
  list: (query?: PageableQuery) =>
    apiGet<ApiEnvelope<PageResponse<OrganizationResponse>>>(
      `/api/organizations?${buildSearchParams(query)}`,
    ),
  get: (id: string) => apiGet<ApiEnvelope<OrganizationResponse>>(`/api/organizations/${id}`),
  create: (body: CreateOrganizationRequest) =>
    apiPost<ApiEnvelope<OrganizationResponse>>("/api/organizations", body),
  update: (id: string, body: UpdateOrganizationRequest) =>
    apiPut<ApiEnvelope<OrganizationResponse>>(`/api/organizations/${id}`, body),
};

export type BranchResponse = {
  id: string;
  organizationId: string;
  branchCode: string;
  name: string;
  city?: string;
  address?: string;
  status: "ACTIVE" | "INACTIVE";
  customerCount?: number;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export function branchRecords(
  value: PageResponse<BranchResponse> | BranchResponse[] | undefined,
) {
  return Array.isArray(value) ? value : value?.content ?? [];
}

export type CreateBranchRequest = {
  branchCode: string;
  name: string;
  city?: string;
};

export type UpdateBranchRequest = CreateBranchRequest & {
  status?: BranchResponse["status"];
};

export const branchesApi = {
  list: (query?: PageableQuery & { organizationId?: string }) => {
    const params = new URLSearchParams(buildSearchParams(query));
    if (query?.organizationId) params.set("organizationId", query.organizationId);
    return apiGet<ApiEnvelope<PageResponse<BranchResponse> | BranchResponse[]>>(
      `/api/branches?${params.toString()}`,
    );
  },
  get: (id: string) => apiGet<ApiEnvelope<BranchResponse>>(`/api/branches/${id}`),
  create: (organizationId: string, body: CreateBranchRequest) =>
    apiPost<ApiEnvelope<BranchResponse>>(`/api/branches?organizationId=${encodeURIComponent(organizationId)}`, body),
  update: (id: string, body: UpdateBranchRequest) =>
    apiPut<ApiEnvelope<BranchResponse>>(`/api/branches/${id}`, body),
};

export type BusinessCustomerResponse = {
  id: string;
  organizationId?: string;
  branchId: string;
  customerCode: string;
  name: string;
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
  email?: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBusinessCustomerRequest = {
  customerCode: string;
  name: string;
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
  email?: string;
  phone?: string;
};

export type UpdateBusinessCustomerRequest = Omit<CreateBusinessCustomerRequest, "customerCode"> & {
  status?: BusinessCustomerResponse["status"];
};

export const businessCustomersApi = {
  list: (filters: { branchId?: string; organizationId?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.branchId) params.set("branchId", filters.branchId);
    if (filters.organizationId) params.set("organizationId", filters.organizationId);
    const query = params.toString();
    return apiGet<ApiEnvelope<BusinessCustomerResponse[] | PageResponse<BusinessCustomerResponse>>>(
      `/api/business-customers${query ? `?${query}` : ""}`,
    );
  },
  get: (id: string) => apiGet<ApiEnvelope<BusinessCustomerResponse>>(`/api/business-customers/${id}`),
  create: (branchId: string, body: CreateBusinessCustomerRequest) =>
    apiPost<ApiEnvelope<BusinessCustomerResponse>>(
      `/api/business-customers?branchId=${encodeURIComponent(branchId)}`,
      body,
    ),
  update: (id: string, body: UpdateBusinessCustomerRequest) =>
    apiPut<ApiEnvelope<BusinessCustomerResponse>>(`/api/business-customers/${id}`, body),
};

export const permissionsApi = {
  list: () => apiGet<ApiEnvelope<PermissionResponse[]>>("/api/permissions"),
};
