import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-parts";
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
import { hasPermission } from "@/lib/permissions";
import {
  permissionsApi,
  rolesApi,
  type CreateRoleRequest,
  type PermissionResponse,
  type RoleResponse,
  type UpdateRoleRequest,
} from "@/services/admin-api.service";

const rolesQueryOptions = {
  queryKey: ["admin", "roles"] as const,
  queryFn: async () => (await rolesApi.list({ size: 100 })).data.content,
  staleTime: 60_000,
  retry: false,
  refetchOnWindowFocus: false,
};
const permissionsQueryOptions = {
  queryKey: ["admin", "assignable-permissions"] as const,
  queryFn: async () => (await permissionsApi.assignable()).data,
  staleTime: 60_000,
  retry: false,
  refetchOnWindowFocus: false,
};
type RoleForm = { name: string; description: string; level: string; active: boolean };
const emptyForm: RoleForm = { name: "", description: "", level: "", active: true };

export const Route = createFileRoute("/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions - Akribiz B2B" }] }),
  component: RolesPage,
});

function groupPermissions(permissions: PermissionResponse[]) {
  return permissions.reduce<Record<string, PermissionResponse[]>>((groups, permission) => {
    const moduleName = permission.module || "General";
    (groups[moduleName] ??= []).push(permission);
    return groups;
  }, {});
}
function roleHasPermission(role: RoleResponse | undefined, permission: PermissionResponse) {
  return Boolean(
    role?.permissions.some(
      (value) => value === permission.code || value === permission.name || value === permission.id,
    ),
  );
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

function RolesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canView = hasPermission(user, "ROLE_VIEW");
  const canCreate = hasPermission(user, "ROLE_CREATE");
  const canUpdate = hasPermission(user, "ROLE_UPDATE") || hasPermission(user, "ROLE_ASSIGN");
  const canAccess = canView || canCreate || canUpdate;
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [savedPermissionIds, setSavedPermissionIds] = useState<string[]>([]);
  const rolesQuery = useQuery({ ...rolesQueryOptions, enabled: canAccess });
  const permissionsQuery = useQuery({ ...permissionsQueryOptions, enabled: canUpdate });
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const groupedPermissions = useMemo(
    () => groupPermissions(permissionsQuery.data ?? []),
    [permissionsQuery.data],
  );

  useEffect(() => {
    if (!selectedRoleId && roles[0]) setSelectedRoleId(roles[0].id);
  }, [roles, selectedRoleId]);

  useEffect(() => {
    const assignedIds = (permissionsQuery.data ?? [])
      .filter((permission) => roleHasPermission(selectedRole, permission))
      .map((permission) => permission.id);
    setSelectedPermissionIds(assignedIds);
    setSavedPermissionIds(assignedIds);
  }, [permissionsQuery.data, selectedRole]);

  const saveRole = useMutation({
    mutationFn: async () => {
      const level = form.level === "" ? undefined : Number(form.level);
      if (editingRole) {
        const body: UpdateRoleRequest = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          active: form.active,
          level,
        };
        return rolesApi.update(editingRole.id, body);
      }
      const body: CreateRoleRequest = {
        organizationId: user?.organizationId || null,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        systemRole: false,
        level,
      };
      return rolesApi.create(body);
    },
    onSuccess: async (response) => {
      setFormOpen(false);
      setEditingRole(null);
      setForm(emptyForm);
      setSelectedRoleId(response.data.id);
      toast.success(editingRole ? "Role updated successfully" : "Role created successfully");
      await queryClient.invalidateQueries({ queryKey: rolesQueryOptions.queryKey });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const updatePermission = useMutation({
    mutationFn: () =>
      rolesApi.assignPermissions(selectedRole!.id, { permissionIds: selectedPermissionIds }),
    onSuccess: (response) => {
      queryClient.setQueryData<RoleResponse[]>(rolesQueryOptions.queryKey, (current = []) =>
        current.map((role) => (role.id === response.data.id ? response.data : role)),
      );
      setSavedPermissionIds(selectedPermissionIds);
      toast.success("Role permissions updated");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  function openCreate() {
    setEditingRole(null);
    setForm(emptyForm);
    setFormOpen(true);
  }
  function openEdit(role: RoleResponse) {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description ?? "",
      level: role.level == null ? "" : String(role.level),
      active: role.active,
    });
    setFormOpen(true);
  }
  function closeForm(open: boolean) {
    if (open || saveRole.isPending) return;
    setFormOpen(false);
    setEditingRole(null);
    setForm(emptyForm);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!editingRole && !canCreate) || (editingRole && !canUpdate)) return;
    saveRole.mutate();
  }
  function togglePermission(permission: PermissionResponse, checked: boolean) {
    if (!selectedRole || !canUpdate || updatePermission.isPending) return;
    setSelectedPermissionIds((current) =>
      checked
        ? current.includes(permission.id)
          ? current
          : [...current, permission.id]
        : current.filter((id) => id !== permission.id),
    );
  }

  const permissionsChanged =
    [...selectedPermissionIds].sort().join(",") !== [...savedPermissionIds].sort().join(",");

  if (!canAccess)
    return (
      <div className="mx-auto max-w-[1400px] rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        Role access requires ROLE_VIEW or ROLE_CREATE.
      </div>
    );
  const loading = rolesQuery.isLoading || (canUpdate && permissionsQuery.isLoading);
  const loadError = rolesQuery.error || permissionsQuery.error;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Manage roles and permissions available to your account."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Role
            </Button>
          ) : null
        }
      />
      {loadError ? (
        <InlineError message={errorMessage(loadError)} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <div className="grid h-fit gap-2">
            {rolesQuery.isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))
            ) : roles.length ? (
              roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`rounded-lg border p-3 text-left text-sm font-medium transition ${selectedRole?.id === role.id ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-card hover:bg-surface/50"}`}
                >
                  <span className="block truncate">{role.name}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    {role.active ? "Active" : "Inactive"}
                    {role.systemRole ? " - System role" : ""}
                    {role.level == null ? "" : ` - Level ${role.level}`}
                  </span>
                </button>
              ))
            ) : (
              <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
                No roles returned.
              </div>
            )}
          </div>
          <div className="space-y-6 rounded-xl border bg-card p-6">
            {loading ? (
              <RolesDetailSkeleton />
            ) : selectedRole ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{selectedRole.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedRole.description || "Permissions assigned to this role."}
                      {selectedRole.level == null ? "" : ` Level ${selectedRole.level}.`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canUpdate ? (
                      <Button
                        size="sm"
                        disabled={
                          updatePermission.isPending || !selectedRole || !permissionsChanged
                        }
                        onClick={() => updatePermission.mutate()}
                      >
                        {updatePermission.isPending ? "Saving..." : "Save Permissions"}
                      </Button>
                    ) : null}
                    {canUpdate ? (
                      <Button size="sm" variant="outline" onClick={() => openEdit(selectedRole)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                  </div>
                </div>
                {!canUpdate ? (
                  <div className="rounded-md border bg-surface px-3 py-2 text-sm text-muted-foreground">
                    Updating permissions requires ROLE_UPDATE or ROLE_ASSIGN.
                  </div>
                ) : null}
                {updatePermission.error ? (
                  <InlineError message={errorMessage(updatePermission.error)} />
                ) : null}
                {Object.keys(groupedPermissions).length ? (
                  Object.entries(groupedPermissions).map(([group, items]) => (
                    <div key={group}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        {group}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-center gap-2 rounded-md border p-2.5 text-sm"
                          >
                            <Checkbox
                              checked={selectedPermissionIds.includes(permission.id)}
                              disabled={!canUpdate || updatePermission.isPending}
                              onCheckedChange={(value) =>
                                togglePermission(permission, value === true)
                              }
                            />
                            <span className="min-w-0">
                              <span className="block truncate">{permission.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {permission.code}
                                {permission.delegationLevel == null
                                  ? ""
                                  : ` - Delegation ${permission.delegationLevel}`}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No assignable permissions returned for this account.
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Select a role.</div>
            )}
          </div>
        </div>
      )}
      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>
              Backend validates the role level and assignment scope.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Role Name" id="role-name">
              <Input
                id="role-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Description" id="role-description">
              <Input
                id="role-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            <Field label="Level" id="role-level">
              <Input
                id="role-level"
                type="number"
                min="0"
                value={form.level}
                onChange={(event) => setForm({ ...form, level: event.target.value })}
                placeholder="Optional"
              />
            </Field>
            {editingRole ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.active}
                  onCheckedChange={(value) => setForm({ ...form, active: value === true })}
                />
                Active
              </label>
            ) : null}
            {saveRole.error ? <InlineError message={errorMessage(saveRole.error)} /> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saveRole.isPending}
                onClick={() => closeForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveRole.isPending || !form.name.trim()}>
                {saveRole.isPending ? "Saving..." : "Save Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  );
}
function RolesDetailSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className={index ? "h-24 w-full" : "h-8 w-56"} />
      ))}
    </>
  );
}
