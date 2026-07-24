import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-parts";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import {
  permissionsApi,
  rolesApi,
  type PermissionResponse,
  type RoleResponse,
} from "@/services/admin-api.service";

const rolesQueryOptions = {
  queryKey: ["admin", "roles"] as const,
  queryFn: async () => (await rolesApi.list({ size: 100 })).data.content,
  staleTime: 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
};

const permissionsQueryOptions = {
  queryKey: ["admin", "permissions"] as const,
  queryFn: async () => (await permissionsApi.list()).data,
  staleTime: 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
};

export const Route = createFileRoute("/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions - StockFlow B2B" }] }),
  component: RolesPage,
});

function groupPermissions(permissions: PermissionResponse[]) {
  return permissions.reduce<Record<string, PermissionResponse[]>>((groups, permission) => {
    const moduleName =
      permission.module || permission.code?.split("_").at(0)?.replaceAll("-", " ") || "General";

    groups[moduleName] = groups[moduleName] ?? [];
    groups[moduleName].push(permission);

    return groups;
  }, {});
}

function roleHasPermission(role: RoleResponse | undefined, permission: PermissionResponse) {
  if (!role) return false;

  return role.permissions.some(
    (value) => value === permission.code || value === permission.name || value === permission.id,
  );
}

function normalizeRoleName(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function isCurrentUserRole(role: RoleResponse | undefined, userRoles?: string[]) {
  if (!role) return false;

  const roleName = normalizeRoleName(role.name);
  return Boolean(userRoles?.some((userRole) => normalizeRoleName(userRole) === roleName));
}

function isRoleManagementPermission(permission: PermissionResponse) {
  return normalizeRoleName(permission.code || permission.name).startsWith("ROLE_");
}

function canTargetHoldRoleManagementPermission(role: RoleResponse | undefined) {
  return normalizeRoleName(role?.name ?? "") === "SUPER_ADMIN";
}

function RolesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canViewRoles = isSuperAdmin(user) && hasPermission(user, "ROLE_VIEW");
  const canUpdateRolePermissions =
    isSuperAdmin(user) &&
    (hasPermission(user, "ROLE_UPDATE") || hasPermission(user, "ROLE_ASSIGN"));
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const rolesQuery = useQuery({ ...rolesQueryOptions, enabled: canViewRoles });
  const permissionsQuery = useQuery({ ...permissionsQueryOptions, enabled: canViewRoles });
  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions]);
  const isLoading = rolesQuery.isLoading || permissionsQuery.isLoading;
  const isError = rolesQuery.isError || permissionsQuery.isError;
  const isEditingOwnRole = isCurrentUserRole(selectedRole, user?.roles);

  const updateRolePermission = useMutation({
    mutationFn: ({
      roleId,
      permissionId,
      checked,
    }: {
      roleId: string;
      permissionId: string;
      checked: boolean;
    }) =>
      checked
        ? rolesApi.assignPermissions(roleId, { permissionIds: [permissionId] })
        : rolesApi.removePermission(roleId, permissionId),
    onSuccess: (response) => {
      mergeUpdatedRole(queryClient, response.data);
    },
  });

  useEffect(() => {
    if (!selectedRoleId && roles[0]) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  function togglePermission(permission: PermissionResponse, checked: boolean) {
    if (!selectedRole || isEditingOwnRole || !canUpdateRolePermissions) return;
    if (
      checked &&
      isRoleManagementPermission(permission) &&
      !canTargetHoldRoleManagementPermission(selectedRole)
    ) {
      return;
    }

    updateRolePermission.mutate({
      roleId: selectedRole.id,
      permissionId: permission.id,
      checked,
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Live role and permission data from the backend Swagger API."
      />

      {!canViewRoles ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Viewing roles is available only to SUPER_ADMIN with ROLE_VIEW.
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load roles or permissions from the backend.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <div className="grid h-fit gap-2">
            {isLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-full" />
                ))
              : roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`rounded-lg border p-3 text-left text-sm font-medium transition ${
                      selectedRole?.id === role.id
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : "border-border bg-card hover:bg-surface/50"
                    }`}
                  >
                    <span className="block truncate">{role.name}</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {role.active ? "Active" : "Inactive"}
                      {role.systemRole ? " - System role" : ""}
                    </span>
                  </button>
                ))}
          </div>

          <div className="space-y-6 rounded-xl border border-border bg-card p-6">
            {isLoading ? (
              <RolesDetailSkeleton />
            ) : selectedRole ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{selectedRole.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedRole.description || "Permissions assigned to this role."}
                    </div>
                  </div>
                  {updateRolePermission.isPending ? (
                    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Updating role
                    </div>
                  ) : null}
                </div>

                {isEditingOwnRole ? (
                  <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
                    You cannot update permissions on your own active role.
                  </div>
                ) : !canUpdateRolePermissions ? (
                  <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
                    Updating role permissions requires SUPER_ADMIN with ROLE_UPDATE or ROLE_ASSIGN.
                  </div>
                ) : null}

                {updateRolePermission.isError ? (
                  <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {updateRolePermission.error.message}
                  </div>
                ) : null}

                {Object.entries(groupedPermissions).map(([group, groupPermissions]) => (
                  <div key={group}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {group}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {groupPermissions.map((permission) => {
                        const checked = roleHasPermission(selectedRole, permission);
                        const isProtectedRolePermission =
                          isRoleManagementPermission(permission) &&
                          !canTargetHoldRoleManagementPermission(selectedRole);
                        const disabled =
                          isEditingOwnRole ||
                          !canUpdateRolePermissions ||
                          (isProtectedRolePermission && !checked) ||
                          updateRolePermission.isPending;

                        return (
                          <label
                            key={permission.id}
                            className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(value) =>
                                togglePermission(permission, value === true)
                              }
                            />
                            <span className="min-w-0">
                              <span className="block truncate">{permission.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {permission.code}
                              </span>
                              {isProtectedRolePermission ? (
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  Super Admin only
                                </span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No roles returned by the backend.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function mergeUpdatedRole(
  queryClient: ReturnType<typeof useQueryClient>,
  updatedRole: RoleResponse,
) {
  queryClient.setQueryData<RoleResponse[]>(rolesQueryOptions.queryKey, (current = []) =>
    current.map((role) => (role.id === updatedRole.id ? updatedRole : role)),
  );
}

function RolesDetailSkeleton() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <div key={groupIndex} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((__, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
