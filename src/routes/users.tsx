import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  organizationsApi,
  rolesApi,
  usersApi,
  type CreateUserRequest,
  type OrganizationResponse,
  type UpdateUserRequest,
  type UserResponse,
} from "@/services/admin-api.service";

const usersQueryOptions = {
  queryKey: ["admin", "users"] as const,
  queryFn: async () => (await usersApi.list({ size: 100 })).data.content,
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

type UserForm = {
  organizationId: string;
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

const emptyForm: UserForm = {
  organizationId: "",
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

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users - StockFlow B2B" }] }),
  component: UsersPage,
});

function statusForBadge(status: UserResponse["status"]) {
  return status === "ACTIVE" ? "Approved" : status === "PENDING" ? "Submitted" : "Rejected";
}

function organizationNameById(organizations: OrganizationResponse[]) {
  return new Map(organizations.map((organization) => [organization.id, organization.name]));
}

function UsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>(emptyEditForm);
  const hasViewAccess = hasPermission(user, "USER_VIEW");
  const hasCreateAccess = hasPermission(user, "USER_CREATE");
  const hasUpdateAccess = hasPermission(user, "USER_UPDATE");
  const hasOrganizationViewAccess = hasPermission(user, "ORGANIZATION_VIEW");
  const hasRoleViewAccess = isSuperAdmin(user) && hasPermission(user, "ROLE_VIEW");
  const usersQuery = useQuery({ ...usersQueryOptions, enabled: hasViewAccess });
  const organizationsQuery = useQuery({
    ...userOrganizationsQueryOptions,
    enabled: hasViewAccess && hasOrganizationViewAccess,
  });
  const rolesQuery = useQuery({
    ...userRolesQueryOptions,
    enabled: hasCreateAccess && hasRoleViewAccess,
  });
  const users = usersQuery.data ?? [];
  const organizations = organizationsQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const organizationsById = organizationNameById(organizations);
  const isLoading = usersQuery.isLoading || organizationsQuery.isLoading || rolesQuery.isLoading;
  const isError = usersQuery.isError || organizationsQuery.isError || rolesQuery.isError;
  const tableHeaders = hasRoleViewAccess
    ? ["User", "Email", "Organization", "Status", "Roles", "Created", ""]
    : ["User", "Email", "Organization", "Status", "Created", ""];
  const tableColumnCount = tableHeaders.length;

  const createUser = useMutation({
    mutationFn: (body: CreateUserRequest) => usersApi.create(body),
    onSuccess: async (response) => {
      mergeCreatedUser(queryClient, response.data);
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
      mergeUser(queryClient, response.data);
      setEditingUser(null);
      setEditForm(emptyEditForm);
      await queryClient.invalidateQueries({
        queryKey: usersQueryOptions.queryKey,
        refetchType: "none",
      });
    },
  });

  function updateField(field: keyof Omit<UserForm, "roleIds">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
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
      setForm(emptyForm);
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

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasCreateAccess) return;

    const payload: CreateUserRequest = {
      organizationId: form.organizationId || undefined,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      roleIds: form.roleIds.length > 0 ? form.roleIds : undefined,
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
            <Button onClick={() => setIsCreateOpen(true)}>
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
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
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
                    <td className="px-4 py-3 font-medium">
                      {[record.firstName, record.lastName].filter(Boolean).join(" ") ||
                        record.email}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{record.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {organizationsById.get(record.organizationId) || record.organizationId}
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
                    <td className="px-4 py-3 text-right">
                      {hasUpdateAccess ? (
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(record)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={tableColumnCount}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No users returned by the backend.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                <select
                  id="user-organization"
                  className="input"
                  value={form.organizationId}
                  onChange={(event) => updateField("organizationId", event.target.value)}
                >
                  <option value="">Use backend default</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name} ({organization.organizationType})
                    </option>
                  ))}
                </select>
              </Field>
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
                  {roles.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No roles returned by backend.
                    </div>
                  ) : (
                    roles.map((role) => (
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
                  !form.password
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
    </div>
  );
}

function mergeCreatedUser(
  queryClient: ReturnType<typeof useQueryClient>,
  createdUser: UserResponse,
) {
  queryClient.setQueryData<UserResponse[]>(usersQueryOptions.queryKey, (current = []) => {
    if (current.some((record) => record.id === createdUser.id)) return current;
    return [createdUser, ...current];
  });
}

function mergeUser(queryClient: ReturnType<typeof useQueryClient>, updatedUser: UserResponse) {
  queryClient.setQueryData<UserResponse[]>(usersQueryOptions.queryKey, (current = []) =>
    current.map((record) => (record.id === updatedUser.id ? updatedUser : record)),
  );
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
