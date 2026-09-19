import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPostForm,
  apiPut,
  apiPutForm,
} from "./api-client";

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

export type BulkUploadStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type BulkUploadJob = {
  jobId: string;
  status: BulkUploadStatus;
  totalProducts: number;
  processedProducts: number;
  failedProducts: number;
  progressPercent: number;
  estimatedSecondsRemaining: number | null;
  message: string;
};

export type DeleteValidationResponse = {
  hasWarnings: boolean;
  message: string;
  warnings: string[];
  counts: Partial<
    Record<"users" | "branches" | "businessCustomers" | "products" | "notDeliveredOrders", number>
  >;
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
  organizationName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  businessCustomerId?: string | null;
  businessCustomerName?: string | null;
  businessCustomerLocationId?: string | null;
  businessCustomerLocationName?: string | null;
  userType: "EMPLOYEE" | "CUSTOMER";
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
  userType: "EMPLOYEE" | "CUSTOMER";
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

export type UserListQuery = PageableQuery & {
  branchId?: string;
  businessCustomerId?: string;
  businessCustomerLocationId?: string;
  status?: string;
  roles?: string | string[];
};

export type ApproverUserResponse = {
  userId: string;
  name: string;
  email?: string;
  roles?: string[];
};

export type RoleResponse = {
  id: string;
  organizationId?: string;
  name: string;
  description?: string;
  systemRole: boolean;
  level?: number;
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
  delegationLevel?: number;
};

export type CreateRoleRequest = {
  organizationId?: string | null;
  name: string;
  description?: string;
  systemRole: false;
  level?: number;
};

export type UpdateRoleRequest = {
  name: string;
  description?: string;
  active: boolean;
  level?: number;
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
  list: (query?: UserListQuery) => {
    const params = new URLSearchParams(buildSearchParams(query));
    if (query?.branchId) params.set("branchId", query.branchId);
    if (query?.businessCustomerId) params.set("businessCustomerId", query.businessCustomerId);
    if (query?.businessCustomerLocationId) {
      params.set("businessCustomerLocationId", query.businessCustomerLocationId);
    }
    if (query?.status) params.set("status", query.status);
    if (query?.roles) {
      const roles = Array.isArray(query.roles)
        ? query.roles.filter(Boolean).join(",")
        : query.roles;
      if (roles) params.set("roles", roles);
    }

    return apiGet<ApiEnvelope<PageResponse<UserResponse>>>(`/api/users?${params.toString()}`);
  },
  approvers: (businessCustomerId: string) =>
    apiGet<ApiEnvelope<ApproverUserResponse[]>>(
      `/api/users/approvers?businessCustomerId=${encodeURIComponent(businessCustomerId)}`,
    ),
  get: (id: string) => apiGet<ApiEnvelope<UserResponse>>(`/api/users/${id}`),
  create: (body: CreateUserRequest) => apiPost<ApiEnvelope<UserResponse>>("/api/users", body),
  update: (id: string, body: UpdateUserRequest) =>
    apiPut<ApiEnvelope<UserResponse>>(`/api/users/${id}`, body),
  assignRolesToUser: (userId: string, roleIds: string[]) =>
    apiPost<ApiEnvelope<UserResponse>>(`/api/users/${userId}/roles`, { roleIds }),
  revokeUserRole: (userId: string, roleId: string) =>
    apiDelete<ApiEnvelope<UserResponse>>(`/api/users/${userId}/roles/${roleId}`),
  deleteUser: (userId: string) => apiDelete<ApiEnvelope<UserResponse>>(`/api/users/${userId}`),
};

export const rolesApi = {
  list: (query?: PageableQuery) =>
    apiGet<ApiEnvelope<PageResponse<RoleResponse>>>(`/api/roles?${buildSearchParams(query)}`),
  assignable: () => apiGet<ApiEnvelope<RoleResponse[]>>("/api/roles/assignable"),
  create: (body: CreateRoleRequest) => apiPost<ApiEnvelope<RoleResponse>>("/api/roles", body),
  update: (id: string, body: UpdateRoleRequest) =>
    apiPut<ApiEnvelope<RoleResponse>>(`/api/roles/${id}`, body),
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
  updateStatus: (id: string, status: OrganizationResponse["status"]) =>
    apiPatch<ApiEnvelope<OrganizationResponse>>(`/api/organizations/${id}/status`, { status }),
  deleteValidation: (id: string) =>
    apiGet<ApiEnvelope<DeleteValidationResponse>>(`/api/organizations/${id}/delete-validation`),
  deactivate: (id: string, force = true) =>
    apiDelete<ApiEnvelope<OrganizationResponse>>(
      `/api/organizations/${id}${force ? "?force=true" : ""}`,
    ),
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

export function branchRecords(value: PageResponse<BranchResponse> | BranchResponse[] | undefined) {
  return Array.isArray(value) ? value : (value?.content ?? []);
}

export function productRecords(
  value: PageResponse<ProductResponse> | ProductResponse[] | undefined,
) {
  return Array.isArray(value) ? value : (value?.content ?? []);
}

export type CreateBranchRequest = {
  branchCode: string;
  name: string;
  city?: string;
  address?: string;
};

export type UpdateBranchRequest = Omit<CreateBranchRequest, "branchCode"> & {
  status: BranchResponse["status"];
};

export type ReactivateBranchRequest = Pick<UpdateBranchRequest, "status">;

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
    apiPost<ApiEnvelope<BranchResponse>>(
      `/api/branches?organizationId=${encodeURIComponent(organizationId)}`,
      body,
    ),
  update: (
    organizationId: string,
    body: UpdateBranchRequest | ReactivateBranchRequest,
    identifier: { branchId?: string; branchCode?: string },
  ) => {
    const params = new URLSearchParams();
    if (identifier.branchId) params.set("branchId", identifier.branchId);
    if (identifier.branchCode) params.set("branchCode", identifier.branchCode);
    const query = params.toString();
    return apiPut<ApiEnvelope<void>>(
      `/api/branches/${encodeURIComponent(organizationId)}${query ? `?${query}` : ""}`,
      body,
    );
  },
  deleteValidation: (id: string) =>
    apiGet<ApiEnvelope<DeleteValidationResponse>>(`/api/branches/${id}/delete-validation`),
  deactivate: (id: string, force = true) =>
    apiDelete<ApiEnvelope<BranchResponse>>(`/api/branches/${id}${force ? "?force=true" : ""}`),
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

export type TransferBusinessCustomerRequest = {
  targetBranchId: string;
};

export type ApprovalMode = "SEQUENTIAL" | "PARALLEL";
export type ApprovalCompletionRule = "ANY" | "ALL";

export interface ApprovalLevelPolicy {
  levelNumber: number;
  minimumApprovers: number;
  completionRule: ApprovalCompletionRule;
  eligibleRoles: string[] | null;
}

export interface OrderApprovalPolicy {
  approvalMode: ApprovalMode;
  selfApprovalAllowed: boolean;
  levels: ApprovalLevelPolicy[];
}

export type BusinessCustomerLocationResponse = {
  id: string;
  businessCustomerId: string;
  organizationId?: string | null;
  branchId?: string | null;
  locationCode: string;
  locationName: string;
  city: string;
  state?: string;
  address?: string;
  permanentAddress?: string;
  correspondingAddress?: string;
  sameAsPermanentAddress: boolean;
  pincode?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBusinessCustomerLocationRequest = {
  locationCode: string;
  locationName: string;
  city: string;
  state?: string;
  address?: string;
  permanentAddress?: string;
  correspondingAddress?: string;
  sameAsPermanentAddress: boolean;
  pincode?: string;
};

export type UpdateBusinessCustomerLocationRequest = Omit<
  CreateBusinessCustomerLocationRequest,
  "locationCode"
> & {
  status: BusinessCustomerLocationResponse["status"];
};

export type BusinessCustomerLocationListQuery = PageableQuery & {
  businessCustomerId?: string;
  customerCode?: string;
  organizationId?: string;
  status?: BusinessCustomerLocationResponse["status"];
};

export type BusinessCustomerListQuery = PageableQuery & {
  organizationId?: string;
  branchId?: string;
  city?: string;
  status?: BusinessCustomerResponse["status"];
};
export interface ProductResponse {
  id: number;
  category: string;
  customerSellCode: string;
  navItemCode: string;
  itemDescription: string;
  uom: string;
  unitRate: number;
  imagePath?: string | null;
  status: string;
}

export type ProductForm = {
  category: string;
  customerSellCode: string;
  navItemCode: string;
  itemDescription: string;
  uom: string;
  unitRate: number;
};

export type UpdateProductRequest = ProductForm & {
  status: string;
  removeImage?: boolean;
};

export const businessCustomersApi = {
  list: (filters: BusinessCustomerListQuery = {}) => {
    const params = new URLSearchParams();
    if (filters.page != null) params.set("page", String(filters.page));
    if (filters.size != null) params.set("size", String(filters.size));
    filters.sort?.forEach((sort) => params.append("sort", sort));
    if (filters.search) params.set("search", filters.search);
    if (filters.branchId) params.set("branchId", filters.branchId);
    if (filters.organizationId) params.set("organizationId", filters.organizationId);
    if (filters.city) params.set("city", filters.city);
    if (filters.status) params.set("status", filters.status);
    const query = params.toString();
    return apiGet<ApiEnvelope<BusinessCustomerResponse[] | PageResponse<BusinessCustomerResponse>>>(
      `/api/business-customers${query ? `?${query}` : ""}`,
    );
  },
  get: (id: string) =>
    apiGet<ApiEnvelope<BusinessCustomerResponse>>(`/api/business-customers/${id}`),
  create: (branchId: string, body: CreateBusinessCustomerRequest) =>
    apiPost<ApiEnvelope<BusinessCustomerResponse>>(
      `/api/business-customers?branchId=${encodeURIComponent(branchId)}`,
      body,
    ),
  update: (id: string, body: UpdateBusinessCustomerRequest) =>
    apiPut<ApiEnvelope<BusinessCustomerResponse>>(`/api/business-customers/${id}`, body),
  transferBranch: (id: string, body: TransferBusinessCustomerRequest) =>
    apiPatch<ApiEnvelope<BusinessCustomerResponse>>(`/api/business-customers/${id}/branch`, body),
  getApprovalPolicy: (id: string) =>
    apiGet<ApiEnvelope<OrderApprovalPolicy>>(`/api/business-customers/${id}/approval-policy`),
  updateApprovalPolicy: (id: string, body: OrderApprovalPolicy) =>
    apiPut<ApiEnvelope<OrderApprovalPolicy>>(`/api/business-customers/${id}/approval-policy`, body),
  deleteValidation: (id: string) =>
    apiGet<ApiEnvelope<DeleteValidationResponse>>(
      `/api/business-customers/${id}/delete-validation`,
    ),
  deactivate: (id: string, force = true) =>
    apiDelete<ApiEnvelope<BusinessCustomerResponse>>(
      `/api/business-customers/${id}${force ? "?force=true" : ""}`,
    ),
};

function businessCustomerLocationParams(filters: BusinessCustomerLocationListQuery) {
  const params = new URLSearchParams();
  if (filters.businessCustomerId) params.set("businessCustomerId", filters.businessCustomerId);
  if (filters.customerCode) params.set("customerCode", filters.customerCode);
  if (filters.organizationId) params.set("organizationId", filters.organizationId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 20));
  filters.sort?.forEach((sort) => params.append("sort", sort));
  return params.toString();
}

export const businessCustomerLocationsApi = {
  list: (filters: BusinessCustomerLocationListQuery) =>
    apiGet<
      ApiEnvelope<
        PageResponse<BusinessCustomerLocationResponse> | BusinessCustomerLocationResponse[]
      >
    >(`/api/business-customer-locations?${businessCustomerLocationParams(filters)}`),
  listByCustomerCode: (filters: BusinessCustomerLocationListQuery & { customerCode: string }) =>
    apiGet<
      ApiEnvelope<
        PageResponse<BusinessCustomerLocationResponse> | BusinessCustomerLocationResponse[]
      >
    >(
      `/api/business-customer-locations/by-customer-code?${businessCustomerLocationParams(filters)}`,
    ),
  get: (id: string) =>
    apiGet<ApiEnvelope<BusinessCustomerLocationResponse>>(`/api/business-customer-locations/${id}`),
  create: (businessCustomerId: string, body: CreateBusinessCustomerLocationRequest) =>
    apiPost<ApiEnvelope<BusinessCustomerLocationResponse>>(
      `/api/business-customer-locations?businessCustomerId=${encodeURIComponent(businessCustomerId)}`,
      body,
    ),
  update: (id: string, body: UpdateBusinessCustomerLocationRequest) =>
    apiPut<ApiEnvelope<BusinessCustomerLocationResponse>>(
      `/api/business-customer-locations/${id}`,
      body,
    ),
};

export const permissionsApi = {
  list: () => apiGet<ApiEnvelope<PermissionResponse[]>>("/api/permissions"),
  assignable: () => apiGet<ApiEnvelope<PermissionResponse[]>>("/api/permissions/assignable"),
};

export const productsApi = {
  list: (
    query?: {
      customerSellCode?: string;
    } & PageableQuery,
  ) => {
    const params = new URLSearchParams(buildSearchParams(query));

    if (query?.customerSellCode) {
      params.set("customerCode", query.customerSellCode);
    }

    return apiPost<ApiEnvelope<PageResponse<ProductResponse> | ProductResponse[]>>(
      `/api/list-products?${params.toString()}`,
      {},
    );
  },

  create: (body: ProductForm) => apiPost<ApiEnvelope<ProductResponse>>("/api/products", body),
  createWithImage: (body: FormData) =>
    apiPostForm<ApiEnvelope<ProductResponse>>("/api/products", body),
  update: (id: number, body: UpdateProductRequest) =>
    apiPut<ApiEnvelope<ProductResponse>>(`/api/products/${id}`, body),
  updateWithImage: (id: number, body: FormData) =>
    apiPutForm<ApiEnvelope<ProductResponse>>(`/api/products/${id}`, body),
  bulkDelete: (ids: number[]) =>
    apiPost<ApiEnvelope<unknown>, { ids: number[] }>("/api/products/bulk-delete", { ids }),
  bulkUpload: (customerSellCode: string, body: FormData) =>
    apiPostForm<ApiEnvelope<BulkUploadJob>>(
      `/api/${encodeURIComponent(customerSellCode)}/bulk-upload`,
      body,
    ),
  bulkUploadStatus: (jobId: string) =>
    apiGet<ApiEnvelope<BulkUploadJob>>(`/api/bulk-upload/${encodeURIComponent(jobId)}`),
};
