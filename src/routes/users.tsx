import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import {
  branchRecords,
  branchesApi,
  businessCustomersApi,
  organizationsApi,
  rolesApi,
  usersApi,
  type CreateUserRequest,
  type OrganizationResponse,
  type BranchResponse,
  type BusinessCustomerResponse,
  type PageResponse,
  type RoleResponse,
  type UpdateUserRequest,
  type UserResponse,
} from "@/services/admin-api.service";

const usersQueryOptions = {
  queryKey: ["admin", "users"] as const,
  staleTime: 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
};

const userOrganizationsQueryOptions = {
  queryKey: ["admin", "users", "organizations"] as const,
  queryFn: async () => (await organizationsApi.list({ size: 100 })).data.content,
  staleTime: 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
};

const userRolesQueryOptions = {
  queryKey: ["admin", "users", "roles"] as const,
  queryFn: async () => (await rolesApi.list({ size: 100 })).data.content,
  staleTime: 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
};

const userBranchesQueryOptions = {
  queryKey: ["admin", "users", "branches"] as const,
  queryFn: async () => branchRecords((await branchesApi.list({ size: 100 })).data),
  staleTime: 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
};

type UserForm = {
  organizationId: string;
  userType: "EMPLOYEE" | "CUSTOMER";
  branchId: string;
  businessCustomerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  roleIds: string[];
};

type EditUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type RevokeRoleTarget = {
  userId: string;
  roleId: string;
  roleName: string;
};

const emptyForm: UserForm = {
  organizationId: "",
  userType: "EMPLOYEE",
  branchId: "",
  businessCustomerId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  roleIds: [],
};

const emptyEditForm: EditUserForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

const userPageSizes = [10, 20, 50, 100];
const userStatusFilters = ["ACTIVE", "PENDING", "LOCKED", "INACTIVE"];

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users - Akribiz B2B" }] }),
  component: UsersPage,
});

function statusForBadge(status: UserResponse["status"]) {
  return status === "ACTIVE" ? "Approved" : status === "PENDING" ? "Submitted" : "Rejected";
}

function organizationNameById(organizations: OrganizationResponse[]) {
  return new Map(organizations.map((organization) => [organization.id, organization.name]));
}

function branchNameById(branches: BranchResponse[]) {
  return new Map(branches.map((branch) => [branch.id, branch.name]));
}

function businessCustomerNameById(customers: BusinessCustomerResponse[]) {
  return new Map(customers.map((customer) => [customer.id, customer.name]));
}

type UsersQueryData = PageResponse<UserResponse> | UserResponse[];

function userRecords(value: UsersQueryData | undefined) {
  return Array.isArray(value) ? value : (value?.content ?? []);
}

function userPageResponse(value: UsersQueryData | undefined) {
  return Array.isArray(value) ? undefined : value;
}

function roleKey(roleName: string) {
  return roleName.trim().toUpperCase();
}

function roleByName(roles: RoleResponse[]) {
  return new Map(roles.map((role) => [roleKey(role.name), role]));
}

function fullUserName(record: UserResponse) {
  return [record.firstName, record.lastName].filter(Boolean).join(" ") || record.email;
}

function isImportantRole(roleName: string) {
  return ["SUPER_ADMIN", "ORG_ADMIN", "ORGANIZATION_ADMIN", "BRANCH_ADMIN"].includes(
    roleKey(roleName),
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function UsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>(emptyEditForm);
  const [managingRolesUser, setManagingRolesUser] = useState<UserResponse | null>(null);
  const [selectedRoleIdsToAssign, setSelectedRoleIdsToAssign] = useState<string[]>([]);
  const [rolesDialogError, setRolesDialogError] = useState("");
  const [revokeRoleTarget, setRevokeRoleTarget] = useState<RevokeRoleTarget | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [businessCustomerFilter, setBusinessCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [userPage, setUserPage] = useState(0);
  const [userPageSize, setUserPageSize] = useState(20);
  const hasViewAccess = hasPermission(user, "USER_VIEW");
  const hasCreateAccess = hasPermission(user, "USER_CREATE");
  const hasUpdateAccess = hasPermission(user, "USER_UPDATE");
  const hasOrganizationViewAccess = hasPermission(user, "ORGANIZATION_VIEW");
  const hasRoleViewAccess = hasPermission(user, "ROLE_VIEW");
  const hasRoleManageAccess = hasUpdateAccess && hasRoleViewAccess;
  const hasDeleteAccess = hasUpdateAccess;
  const isSa = isSuperAdmin(user);
  const assignedOrganizationId = isSa ? "" : (user?.organizationId ?? "");
  const assignedBranchId = isSa ? "" : (user?.branchId ?? "");
  const selectedCreateOrganizationId = form.organizationId || assignedOrganizationId;
  const isBranchScopedCreator = Boolean(assignedBranchId);
  const scopedUsersBranchId = assignedBranchId || branchFilter || undefined;
  const usersQueryKey = [
    ...usersQueryOptions.queryKey,
    {
      branchId: scopedUsersBranchId ?? "",
      businessCustomerId: businessCustomerFilter,
      status: statusFilter,
      roles: roleFilter,
      search: submittedSearch,
      page: userPage,
      size: userPageSize,
    },
  ] as const;
  const usersQuery = useQuery({
    ...usersQueryOptions,
    queryKey: usersQueryKey,
    queryFn: async () =>
      (
        await usersApi.list({
          page: userPage,
          size: userPageSize,
          branchId: scopedUsersBranchId,
          businessCustomerId: businessCustomerFilter || undefined,
          status: statusFilter || undefined,
          roles: roleFilter || undefined,
          search: submittedSearch || undefined,
          sort: ["createdAt,desc"],
        })
      ).data,
    enabled: hasViewAccess,
  });
  const organizationsQuery = useQuery({
    ...userOrganizationsQueryOptions,
    enabled: hasViewAccess && hasOrganizationViewAccess,
  });
  const assignedOrganizationQuery = useQuery({
    queryKey: ["admin", "users", "assigned-organization", assignedOrganizationId],
    queryFn: async () => (await organizationsApi.get(assignedOrganizationId)).data,
    enabled:
      !isSa &&
      Boolean(assignedOrganizationId) &&
      !user?.organizationName &&
      (hasViewAccess || hasCreateAccess),
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const assignedBranchQuery = useQuery({
    queryKey: ["admin", "users", "assigned-branch", assignedBranchId],
    queryFn: async () => (await branchesApi.get(assignedBranchId)).data,
    enabled: Boolean(assignedBranchId) && !user?.branchName && (hasViewAccess || hasCreateAccess),
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const branchesQuery = useQuery({
    ...userBranchesQueryOptions,
    queryKey: [...userBranchesQueryOptions.queryKey, selectedCreateOrganizationId],
    queryFn: async () =>
      branchRecords(
        (
          await branchesApi.list({
            size: 100,
            organizationId: selectedCreateOrganizationId || undefined,
          })
        ).data,
      ),
    enabled:
      (hasViewAccess || hasCreateAccess) &&
      !isBranchScopedCreator &&
      (Boolean(selectedCreateOrganizationId) || isSa),
  });
  const businessCustomersQuery = useQuery({
    queryKey: [
      "admin",
      "users",
      "business-customers",
      selectedCreateOrganizationId,
      assignedBranchId,
    ],
    queryFn: async () =>
      (
        await businessCustomersApi.list({
          organizationId: selectedCreateOrganizationId || undefined,
          branchId: assignedBranchId || undefined,
        })
      ).data,
    enabled: hasCreateAccess && form.userType === "CUSTOMER",
    staleTime: 60 * 1000,
    retry: false,
  });
  const filterBusinessCustomersQuery = useQuery({
    queryKey: [
      "admin",
      "users",
      "filter-business-customers",
      selectedCreateOrganizationId,
      scopedUsersBranchId,
    ],
    queryFn: async () =>
      (
        await businessCustomersApi.list({
          organizationId: selectedCreateOrganizationId || undefined,
          branchId: scopedUsersBranchId,
        })
      ).data,
    enabled: hasViewAccess,
    staleTime: 60 * 1000,
    retry: false,
  });
  const rolesQuery = useQuery({
    ...userRolesQueryOptions,
    enabled: hasRoleViewAccess && (hasViewAccess || hasCreateAccess || hasRoleManageAccess),
  });
  const users = userRecords(usersQuery.data);
  const usersPageResponse = userPageResponse(usersQuery.data);
  const totalUsers = usersPageResponse?.totalElements ?? users.length;
  const totalUserPages = usersPageResponse?.totalPages ?? (users.length ? 1 : 0);
  const userPageStart = totalUsers === 0 ? 0 : userPage * userPageSize + 1;
  const userPageEnd =
    totalUsers === 0 ? 0 : Math.min(userPage * userPageSize + users.length, totalUsers);
  const organizations = organizationsQuery.data ?? [];
  const branches = branchRecords(branchesQuery.data);
  const businessCustomers = Array.isArray(businessCustomersQuery.data)
    ? businessCustomersQuery.data
    : (businessCustomersQuery.data?.content ?? []);
  const filterBusinessCustomers = Array.isArray(filterBusinessCustomersQuery.data)
    ? filterBusinessCustomersQuery.data
    : (filterBusinessCustomersQuery.data?.content ?? []);
  const roles = rolesQuery.data ?? [];
  const rolesByName = roleByName(roles);
  const managedAssignedRoleNames = new Set(
    (managingRolesUser?.roles ?? []).map((roleName) => roleKey(roleName)),
  );
  const manageableAssignedRoles = (managingRolesUser?.roles ?? []).map((roleName) => ({
    name: roleName,
    record: rolesByName.get(roleKey(roleName)),
  }));
  const assignableRoles = roles.filter((role) => !managedAssignedRoleNames.has(roleKey(role.name)));
  const availableRoles = roles.filter((role) => {
    const isCustomerRole = role.name === "CUSTOMER" || role.name === "CUSTOMER_ADMIN";
    return form.userType === "CUSTOMER" ? isCustomerRole : !isCustomerRole;
  });
  const organizationsById = organizationNameById(organizations);
  const branchesById = branchNameById(branches);
  const businessCustomersById = businessCustomerNameById([
    ...filterBusinessCustomers,
    ...businessCustomers,
  ]);
  const branchLabel = (branchId?: string | null, fallbackName?: string | null) => {
    if (!branchId) return "-";

    return (
      fallbackName ||
      branchesById.get(branchId) ||
      (branchId === assignedBranchId
        ? user?.branchName || assignedBranchQuery.data?.name || "Assigned branch"
        : undefined) ||
      "Unknown branch"
    );
  };
  const organizationLabel = (organizationId?: string | null, fallbackName?: string | null) => {
    if (!organizationId) return "-";

    return (
      fallbackName ||
      organizationsById.get(organizationId) ||
      (organizationId === assignedOrganizationId
        ? user?.organizationName || assignedOrganizationQuery.data?.name
        : undefined) ||
      "Unknown organization"
    );
  };
  const businessCustomerLabel = (record: UserResponse) => {
    if (!record.businessCustomerId) return "-";

    return (
      record.businessCustomerName ||
      businessCustomersById.get(record.businessCustomerId) ||
      "Unknown customer"
    );
  };
  const selectedCreateOrganizationLabel = organizationLabel(selectedCreateOrganizationId);
  const isEmployeeBranchRequired = form.userType === "EMPLOYEE";
  const isLoading =
    usersQuery.isLoading ||
    organizationsQuery.isLoading ||
    (!isBranchScopedCreator && branchesQuery.isLoading) ||
    rolesQuery.isLoading;
  const isError = usersQuery.isError || organizationsQuery.isError || rolesQuery.isError;
  const tableHeaders = hasRoleViewAccess
    ? ["User", "Email", "Organization", "Status", "Roles", "Created", ""]
    : ["User", "Email", "Organization", "Status", "Created", ""];
  const tableColumnCount = tableHeaders.length;

  const createUser = useMutation({
    mutationFn: (body: CreateUserRequest) => usersApi.create(body),
    onSuccess: async (response) => {
      mergeCreatedUser(queryClient, usersQueryKey, response.data);
      setForm(emptyForm);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({
        queryKey: usersQueryOptions.queryKey,
        refetchType: "none",
      });
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserRequest }) =>
      usersApi.update(id, body),
    onSuccess: async (response) => {
      mergeUser(queryClient, usersQueryKey, response.data);
      setEditingUser(null);
      setEditForm(emptyEditForm);
      await queryClient.invalidateQueries({
        queryKey: usersQueryOptions.queryKey,
        refetchType: "none",
      });
    },
  });

  const assignRolesToUser = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      usersApi.assignRolesToUser(userId, roleIds),
    onSuccess: async (response) => {
      mergeUser(queryClient, usersQueryKey, response.data);
      setManagingRolesUser(response.data);
      setSelectedRoleIdsToAssign([]);
      setRolesDialogError("");
      toast.success("Roles assigned successfully");
      await queryClient.invalidateQueries({ queryKey: usersQueryOptions.queryKey });
    },
    onError: (error) => {
      const message = errorMessage(error, "Failed to assign roles.");
      setRolesDialogError(message);
      toast.error(message);
    },
  });

  const revokeUserRole = useMutation({
    mutationFn: ({ userId, roleId }: RevokeRoleTarget) => usersApi.revokeUserRole(userId, roleId),
    onSuccess: async (response) => {
      mergeUser(queryClient, usersQueryKey, response.data);
      setManagingRolesUser(response.data);
      setRevokeRoleTarget(null);
      setRolesDialogError("");
      toast.success("Role revoked successfully");
      await queryClient.invalidateQueries({ queryKey: usersQueryOptions.queryKey });
    },
    onError: (error) => {
      const message = errorMessage(error, "Failed to revoke role.");
      setRolesDialogError(message);
      toast.error(message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => usersApi.deleteUser(userId),
    onSuccess: async () => {
      if (deleteTargetUser) removeUser(queryClient, usersQueryKey, deleteTargetUser.id);
      setDeleteTargetUser(null);
      toast.success("User deleted successfully");
      await queryClient.invalidateQueries({ queryKey: usersQueryOptions.queryKey });
    },
    onError: (error) => {
      const message = errorMessage(error, "Failed to delete user.");
      toast.error(message);
    },
  });

  const roleDialogBusy = assignRolesToUser.isPending || revokeUserRole.isPending;

  useEffect(() => {
    if (totalUserPages > 0 && userPage > totalUserPages - 1) {
      setUserPage(totalUserPages - 1);
    }
  }, [totalUserPages, userPage]);

  function applyUserFilters() {
    setUserPage(0);
    setSubmittedSearch(searchInput.trim());
  }

  function resetUserFilters() {
    setSearchInput("");
    setSubmittedSearch("");
    setBranchFilter("");
    setBusinessCustomerFilter("");
    setStatusFilter("");
    setRoleFilter("");
    setUserPage(0);
  }

  function updateBranchFilter(value: string) {
    setBranchFilter(value);
    setBusinessCustomerFilter("");
    setUserPage(0);
  }

  function updateBusinessCustomerFilter(value: string) {
    setBusinessCustomerFilter(value);
    setUserPage(0);
  }

  function updateStatusFilter(value: string) {
    setStatusFilter(value);
    setUserPage(0);
  }

  function updateRoleFilter(value: string) {
    setRoleFilter(value);
    setUserPage(0);
  }

  function updateUserPageSize(value: string) {
    setUserPage(0);
    setUserPageSize(Number(value));
  }

  function updateField(field: keyof Omit<UserForm, "roleIds">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function createFormDefaults(): UserForm {
    return {
      ...emptyForm,
      organizationId: assignedOrganizationId,
      branchId: assignedBranchId,
    };
  }

  function updateEditField(field: keyof EditUserForm, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function toggleRole(roleId: string) {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }));
  }

  function closeCreateDialog(open: boolean) {
    setIsCreateOpen(open);

    if (!open && !createUser.isPending) {
      createUser.reset();
      setForm(createFormDefaults());
    }
  }

  function openEditDialog(record: UserResponse) {
    if (!hasUpdateAccess) return;

    updateUser.reset();
    setEditingUser(record);
    setEditForm({
      firstName: record.firstName ?? "",
      lastName: record.lastName ?? "",
      email: record.email ?? "",
      phone: record.phone ?? "",
    });
  }

  function closeEditDialog(open: boolean) {
    if (open || updateUser.isPending) return;

    updateUser.reset();
    setEditingUser(null);
    setEditForm(emptyEditForm);
  }

  function openManageRolesDialog(record: UserResponse) {
    if (!hasRoleManageAccess) return;

    assignRolesToUser.reset();
    revokeUserRole.reset();
    setManagingRolesUser(record);
    setSelectedRoleIdsToAssign([]);
    setRolesDialogError("");
    setRevokeRoleTarget(null);
  }

  function closeManageRolesDialog(open: boolean) {
    if (open || roleDialogBusy) return;

    assignRolesToUser.reset();
    revokeUserRole.reset();
    setManagingRolesUser(null);
    setSelectedRoleIdsToAssign([]);
    setRolesDialogError("");
    setRevokeRoleTarget(null);
  }

  function toggleRoleToAssign(roleId: string) {
    setSelectedRoleIdsToAssign((current) =>
      current.includes(roleId)
        ? current.filter((selectedRoleId) => selectedRoleId !== roleId)
        : [...current, roleId],
    );
  }

  function submitRoleAssignment() {
    if (!managingRolesUser || selectedRoleIdsToAssign.length === 0 || assignRolesToUser.isPending) {
      return;
    }

    setRolesDialogError("");
    assignRolesToUser.mutate({
      userId: managingRolesUser.id,
      roleIds: selectedRoleIdsToAssign,
    });
  }

  function requestRevokeRole(roleName: string, roleId?: string) {
    if (!managingRolesUser || !roleId || revokeUserRole.isPending) return;

    const target = {
      userId: managingRolesUser.id,
      roleId,
      roleName,
    };

    if (isImportantRole(roleName)) {
      setRevokeRoleTarget(target);
      return;
    }

    setRolesDialogError("");
    revokeUserRole.mutate(target);
  }

  function confirmRevokeRole() {
    if (!revokeRoleTarget || revokeUserRole.isPending) return;

    setRolesDialogError("");
    revokeUserRole.mutate(revokeRoleTarget);
  }

  function openDeleteDialog(record: UserResponse) {
    if (!hasDeleteAccess || record.id === user?.id) return;

    deleteUser.reset();
    setDeleteTargetUser(record);
  }

  function closeDeleteDialog(open: boolean) {
    if (open || deleteUser.isPending) return;

    deleteUser.reset();
    setDeleteTargetUser(null);
  }

  function confirmDeleteUser() {
    if (!deleteTargetUser || deleteUser.isPending) return;

    deleteUser.mutate(deleteTargetUser.id);
  }

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasCreateAccess) return;

    const payload: CreateUserRequest = {
      organizationId: selectedCreateOrganizationId || undefined,
      branchId:
        form.userType === "CUSTOMER"
          ? businessCustomers.find((customer) => customer.id === form.businessCustomerId)?.branchId
          : form.branchId || undefined,
      businessCustomerId:
        form.userType === "CUSTOMER" ? form.businessCustomerId || undefined : undefined,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      roleIds: form.roleIds.length > 0 ? form.roleIds : undefined,
      userType: form.userType,
    };

    createUser.mutate(payload);
  }

  function submitEditedUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasUpdateAccess || !editingUser) return;

    updateUser.mutate({
      id: editingUser.id,
      body: {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Users"
        description="Users loaded from the backend users API."
        actions={
          hasCreateAccess ? (
            <Button
              onClick={() => {
                setForm(createFormDefaults());
                setIsCreateOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New User
            </Button>
          ) : null
        }
      />

      {!hasViewAccess ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Viewing users requires USER_VIEW.
        </div>
      ) : !hasCreateAccess ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Your current backend role does not include USER_CREATE.
        </div>
      ) : null}

      {hasViewAccess && isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load users, organizations, or roles from the backend.
        </div>
      ) : hasViewAccess ? (
        <div className="rounded-xl border border-border bg-card">
          <div className="grid gap-3 border-b border-border p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_220px_150px_170px_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search users"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyUserFilters();
                }}
              />
            </div>

            {isBranchScopedCreator ? (
              <Input value={branchLabel(assignedBranchId)} readOnly aria-label="Branch filter" />
            ) : (
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={branchFilter}
                onChange={(event) => updateBranchFilter(event.target.value)}
                disabled={branchesQuery.isLoading}
                aria-label="Branch filter"
              >
                <option value="">
                  {branchesQuery.isLoading ? "Loading branches..." : "All branches"}
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.branchCode ? ` (${branch.branchCode})` : ""}
                  </option>
                ))}
              </select>
            )}

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={businessCustomerFilter}
              onChange={(event) => updateBusinessCustomerFilter(event.target.value)}
              disabled={filterBusinessCustomersQuery.isLoading}
              aria-label="Business customer filter"
            >
              <option value="">
                {filterBusinessCustomersQuery.isLoading ? "Loading customers..." : "All customers"}
              </option>
              {filterBusinessCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.customerCode ? ` (${customer.customerCode})` : ""}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.target.value)}
              aria-label="Status filter"
            >
              <option value="">Default status</option>
              {userStatusFilters.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {hasRoleViewAccess ? (
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={roleFilter}
                onChange={(event) => updateRoleFilter(event.target.value)}
                disabled={rolesQuery.isLoading}
                aria-label="Role filter"
              >
                <option value="">{rolesQuery.isLoading ? "Loading roles..." : "All roles"}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            ) : null}

            <Button type="button" variant="outline" onClick={applyUserFilters}>
              <Search className="mr-1.5 h-4 w-4" />
              Apply
            </Button>
            <Button type="button" variant="ghost" onClick={resetUserFilters}>
              <X className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {tableHeaders.map((header) => (
                    <th key={header} className="px-4 py-3 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <LoadingRows columns={tableColumnCount} />
                ) : users.length > 0 ? (
                  users.map((record) => (
                    <tr key={record.id} className="border-t border-border hover:bg-surface/50">
                      <td className="px-4 py-3 font-medium">{fullUserName(record)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{record.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span>
                          {organizationLabel(record.organizationId, record.organizationName)}
                        </span>
                        {record.branchId ? (
                          <span className="block text-xs text-muted-foreground">
                            {branchLabel(record.branchId, record.branchName)}
                          </span>
                        ) : null}
                        {record.businessCustomerId ? (
                          <span className="block text-xs text-muted-foreground">
                            Customer: {businessCustomerLabel(record)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={statusForBadge(record.status)} />
                      </td>
                      {hasRoleViewAccess ? (
                        <td className="max-w-[280px] px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-1">
                            {(record.roles ?? []).join(", ") || "-"}
                          </span>
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {hasUpdateAccess ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(record)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          ) : null}
                          {hasRoleManageAccess ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openManageRolesDialog(record)}
                            >
                              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                              Manage Roles
                            </Button>
                          ) : null}
                          {hasDeleteAccess && record.id !== user?.id ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(record)}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Delete User
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={tableColumnCount}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No users returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              {totalUsers
                ? `Showing ${userPageStart}-${userPageEnd} of ${totalUsers}`
                : "No users to show"}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="users-page-size" className="text-xs">
                Rows
              </Label>
              <select
                id="users-page-size"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={userPageSize}
                onChange={(event) => updateUserPageSize(event.target.value)}
              >
                {userPageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <div className="mx-2 text-xs">
                Page {totalUserPages ? userPage + 1 : 0} of {totalUserPages || 0}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={userPage === 0 || usersQuery.isLoading}
                onClick={() => setUserPage((page) => Math.max(0, page - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  usersQuery.isLoading || totalUserPages === 0 || userPage >= totalUserPages - 1
                }
                onClick={() => setUserPage((page) => page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={isCreateOpen} onOpenChange={closeCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a backend user and optionally assign roles during creation.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={submitUser}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organization" htmlFor="user-organization">
                {isSa ? (
                  <select
                    id="user-organization"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.organizationId}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        organizationId: event.target.value,
                        branchId: "",
                        businessCustomerId: "",
                        roleIds: [],
                      }));
                    }}
                  >
                    <option value="">Use backend default</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name} ({organization.organizationType})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="user-organization"
                    value={
                      selectedCreateOrganizationLabel === "-"
                        ? "Assigned organization"
                        : selectedCreateOrganizationLabel
                    }
                    readOnly
                  />
                )}
              </Field>
              <Field label="User Type" htmlFor="user-type">
                <select
                  id="user-type"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.userType}
                  onChange={(event) => {
                    const userType = event.target.value as UserForm["userType"];
                    setForm((current) => ({
                      ...current,
                      userType,
                      branchId: userType === "EMPLOYEE" ? assignedBranchId || current.branchId : "",
                      businessCustomerId: "",
                      roleIds: [],
                    }));
                  }}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </Field>
              {form.userType === "EMPLOYEE" ? (
                <Field label="Branch" htmlFor="user-branch">
                  {isBranchScopedCreator ? (
                    <Input
                      id="user-branch"
                      value={branchLabel(assignedBranchId)}
                      readOnly
                      required={isEmployeeBranchRequired}
                    />
                  ) : (
                    <select
                      id="user-branch"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.branchId}
                      onChange={(event) => updateField("branchId", event.target.value)}
                      disabled={!selectedCreateOrganizationId || branchesQuery.isLoading}
                      required={isEmployeeBranchRequired}
                    >
                      <option value="">
                        {isEmployeeBranchRequired ? "Select branch" : "Organization-wide"}
                      </option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                          {branch.branchCode ? ` (${branch.branchCode})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground">Required for employee users.</p>
                  {branchesQuery.isError && !isBranchScopedCreator ? (
                    <p className="text-xs text-destructive">
                      Could not load branches for this organization.
                    </p>
                  ) : null}
                </Field>
              ) : null}
              {form.userType === "CUSTOMER" ? (
                <Field label="Business Customer" htmlFor="user-business-customer">
                  <select
                    id="user-business-customer"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.businessCustomerId}
                    onChange={(event) => updateField("businessCustomerId", event.target.value)}
                    disabled={businessCustomersQuery.isLoading}
                    required
                  >
                    <option value="">Select customer</option>
                    {businessCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.customerCode})
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Email" htmlFor="user-email">
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="user@company.com"
                  required
                />
              </Field>
              <Field label="First Name" htmlFor="user-first-name">
                <Input
                  id="user-first-name"
                  value={form.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  required
                />
              </Field>
              <Field label="Last Name" htmlFor="user-last-name">
                <Input
                  id="user-last-name"
                  value={form.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  required
                />
              </Field>
              <Field label="Phone" htmlFor="user-phone">
                <Input
                  id="user-phone"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </Field>
              <Field label="Temporary Password" htmlFor="user-password">
                <Input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
            </div>

            {hasRoleViewAccess ? (
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
                  {availableRoles.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No roles returned.</div>
                  ) : (
                    availableRoles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm"
                      >
                        <Checkbox
                          checked={form.roleIds.includes(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{role.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {role.active ? "Active" : "Inactive"}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {createUser.isError ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createUser.error.message}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeCreateDialog(false)}
                disabled={createUser.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createUser.isPending ||
                  !form.firstName.trim() ||
                  !form.lastName.trim() ||
                  !form.email.trim() ||
                  !form.password ||
                  (isEmployeeBranchRequired && !form.branchId) ||
                  (form.userType === "CUSTOMER" && !form.businessCustomerId)
                }
              >
                {createUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingUser)} onOpenChange={closeEditDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Update User</DialogTitle>
            <DialogDescription>
              Update name, email, and phone using the backend users API.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={submitEditedUser}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name" htmlFor="edit-user-first-name">
                <Input
                  id="edit-user-first-name"
                  value={editForm.firstName}
                  onChange={(event) => updateEditField("firstName", event.target.value)}
                  required
                />
              </Field>
              <Field label="Last Name" htmlFor="edit-user-last-name">
                <Input
                  id="edit-user-last-name"
                  value={editForm.lastName}
                  onChange={(event) => updateEditField("lastName", event.target.value)}
                  required
                />
              </Field>
              <Field label="Email" htmlFor="edit-user-email">
                <Input
                  id="edit-user-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) => updateEditField("email", event.target.value)}
                />
              </Field>
              <Field label="Phone" htmlFor="edit-user-phone">
                <Input
                  id="edit-user-phone"
                  value={editForm.phone}
                  onChange={(event) => updateEditField("phone", event.target.value)}
                />
              </Field>
            </div>

            {updateUser.isError ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {updateUser.error.message}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeEditDialog(false)}
                disabled={updateUser.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  updateUser.isPending || !editForm.firstName.trim() || !editForm.lastName.trim()
                }
              >
                {updateUser.isPending ? "Saving..." : "Save user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(managingRolesUser)} onOpenChange={closeManageRolesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              {managingRolesUser
                ? `Assign or revoke roles for ${fullUserName(managingRolesUser)}.`
                : "Assign or revoke user roles."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Assigned Roles</Label>
              <div className="flex min-h-16 flex-wrap gap-2 rounded-md border border-border p-3">
                {manageableAssignedRoles.length > 0 ? (
                  manageableAssignedRoles.map(({ name, record }) => {
                    const roleId = record?.id;

                    return (
                      <span
                        key={`${name}-${roleId ?? "missing"}`}
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium"
                      >
                        <span>{name}</span>
                        {roleId ? (
                          <button
                            type="button"
                            className="rounded-sm text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                            aria-label={`Revoke ${name}`}
                            disabled={roleDialogBusy}
                            onClick={() => requestRevokeRole(name, roleId)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground">No roles assigned.</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Available Roles</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedRoleIdsToAssign.length} selected
                </span>
              </div>
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
                {rolesQuery.isLoading ? (
                  <LoadingRoleOptions />
                ) : assignableRoles.length > 0 ? (
                  assignableRoles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm"
                    >
                      <Checkbox
                        checked={selectedRoleIdsToAssign.includes(role.id)}
                        disabled={roleDialogBusy}
                        onCheckedChange={() => toggleRoleToAssign(role.id)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{role.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {role.active ? "Active" : "Inactive"}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No additional roles available.
                  </div>
                )}
              </div>
            </div>

            {rolesDialogError ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {rolesDialogError}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeManageRolesDialog(false)}
              disabled={roleDialogBusy}
            >
              Close
            </Button>
            <Button
              type="button"
              disabled={
                assignRolesToUser.isPending ||
                selectedRoleIdsToAssign.length === 0 ||
                !managingRolesUser
              }
              onClick={submitRoleAssignment}
            >
              {assignRolesToUser.isPending ? "Assigning..." : "Assign Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(revokeRoleTarget)}
        onOpenChange={(open) => {
          if (open || revokeUserRole.isPending) return;
          setRevokeRoleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke important role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {revokeRoleTarget?.roleName} from the selected user. Their access can
              change immediately after this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeUserRole.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={revokeUserRole.isPending}
              onClick={confirmRevokeRole}
            >
              {revokeUserRole.isPending ? "Revoking..." : "Revoke Role"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTargetUser)} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This will deactivate ${
                deleteTargetUser ? fullUserName(deleteTargetUser) : "this user"
              }, revoke refresh tokens, and remove the user from the normal active user list. The backend keeps the record for audit/history.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteUser.isError ? (
            <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage(deleteUser.error, "Failed to delete user.")}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteUser.isPending || !deleteTargetUser}
              onClick={confirmDeleteUser}
            >
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function mergeCreatedUser(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: QueryKey,
  createdUser: UserResponse,
) {
  queryClient.setQueryData<UsersQueryData | undefined>(queryKey, (current) => {
    if (!current) return [createdUser];

    if (Array.isArray(current)) {
      if (current.some((record) => record.id === createdUser.id)) return current;
      return [createdUser, ...current];
    }

    if (current.content.some((record) => record.id === createdUser.id)) return current;

    return {
      ...current,
      content: [createdUser, ...current.content].slice(0, current.size),
      totalElements: current.totalElements + 1,
    };
  });
}

function mergeUser(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: QueryKey,
  updatedUser: UserResponse,
) {
  queryClient.setQueryData<UsersQueryData | undefined>(queryKey, (current) => {
    if (!current) return current;

    if (Array.isArray(current)) {
      return current.map((record) => (record.id === updatedUser.id ? updatedUser : record));
    }

    return {
      ...current,
      content: current.content.map((record) =>
        record.id === updatedUser.id ? updatedUser : record,
      ),
    };
  });
}

function removeUser(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: QueryKey,
  userId: string,
) {
  queryClient.setQueryData<UsersQueryData | undefined>(queryKey, (current) => {
    if (!current) return current;

    if (Array.isArray(current)) return current.filter((record) => record.id !== userId);

    const nextContent = current.content.filter((record) => record.id !== userId);
    return {
      ...current,
      content: nextContent,
      totalElements:
        nextContent.length === current.content.length
          ? current.totalElements
          : Math.max(0, current.totalElements - 1),
    };
  });
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function LoadingRows({ columns }: { columns: number }) {
  return Array.from({ length: 6 }).map((_, rowIndex) => (
    <tr key={rowIndex} className="border-t border-border">
      {Array.from({ length: columns }).map((__, columnIndex) => (
        <td key={columnIndex} className="px-4 py-3">
          <Skeleton className="h-5 w-full" />
        </td>
      ))}
    </tr>
  ));
}

function LoadingRoleOptions() {
  return Array.from({ length: 4 }).map((_, index) => (
    <div key={index} className="rounded-md border border-border p-2.5">
      <Skeleton className="h-5 w-full" />
    </div>
  ));
}
