import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Pencil, Plus, Power } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { DeactivateDialog } from "@/components/deactivate-dialog";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
  type CreateOrganizationRequest,
  type OrganizationResponse,
  type UpdateOrganizationRequest,
} from "@/services/admin-api.service";

const queryKey = ["admin", "organizations"] as const;
const pageSizes = [10, 20, 50, 100];
type OrganizationForm = {
  organizationCode: string;
  name: string;
  organizationType: OrganizationResponse["organizationType"];
  email: string;
  phone: string;
  status: OrganizationResponse["status"];
};
const emptyForm: OrganizationForm = {
  organizationCode: "",
  name: "",
  organizationType: "CUSTOMER",
  email: "",
  phone: "",
  status: "ACTIVE",
};

export const Route = createFileRoute("/organizations")({
  head: () => ({ meta: [{ title: "Organizations - Akribiz B2B" }] }),
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canView = hasPermission(user, "ORGANIZATION_VIEW");
  const canCreate = hasPermission(user, "ORGANIZATION_CREATE");
  const canUpdate = hasPermission(user, "ORGANIZATION_UPDATE");
  const canDeactivate = canUpdate && isSuperAdmin(user);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<OrganizationForm>(emptyForm);
  const [editing, setEditing] = useState<OrganizationResponse | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<OrganizationResponse | null>(null);

  const organizationsQuery = useQuery({
    queryKey: [...queryKey, page, size],
    queryFn: async () =>
      (await organizationsApi.list({ page, size, sort: ["createdAt,desc"] })).data,
    enabled: canView || canCreate,
    retry: false,
  });
  const records = organizationsQuery.data?.content ?? [];
  const totalPages = organizationsQuery.data?.totalPages ?? 0;

  useEffect(() => {
    if (totalPages > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  const createMutation = useMutation({
    mutationFn: (body: CreateOrganizationRequest) => organizationsApi.create(body),
    onSuccess: async () => {
      setCreateOpen(false);
      setForm(emptyForm);
      toast.success("Organization created successfully");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
      status,
      currentStatus,
    }: {
      id: string;
      body: UpdateOrganizationRequest;
      status: OrganizationResponse["status"];
      currentStatus: OrganizationResponse["status"];
    }) => {
      const response = await organizationsApi.update(id, body);
      if (status !== currentStatus) await organizationsApi.updateStatus(id, status);
      return response;
    },
    onSuccess: async () => {
      setEditing(null);
      setForm(emptyForm);
      toast.success("Organization updated successfully");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(error.message),
  });
  const validationQuery = useQuery({
    queryKey: ["organization-delete-validation", deactivateTarget?.id],
    queryFn: async () => (await organizationsApi.deleteValidation(deactivateTarget!.id)).data,
    enabled: Boolean(deactivateTarget),
    retry: false,
  });
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => organizationsApi.deactivate(id, true),
    onSuccess: async () => {
      setDeactivateTarget(null);
      toast.success("Organization deactivated successfully");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      name: form.name.trim(),
      organizationType: form.organizationType,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
    };
    if (editing)
      updateMutation.mutate({
        id: editing.id,
        body,
        status: form.status,
        currentStatus: editing.status,
      });
    else createMutation.mutate({ ...body, organizationCode: form.organizationCode.trim() });
  }
  function openEdit(item: OrganizationResponse) {
    setEditing(item);
    setForm({
      organizationCode: item.organizationCode,
      name: item.name,
      organizationType: item.organizationType,
      email: item.email ?? "",
      phone: item.phone ?? "",
      status: item.status,
    });
  }
  function closeForm(open: boolean) {
    if (open || createMutation.isPending || updateMutation.isPending) return;
    setCreateOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  if (!canView && !canCreate)
    return (
      <div className="mx-auto max-w-[1400px] rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        Organization access requires ORGANIZATION_VIEW.
      </div>
    );
  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Organizations"
        description="Create and manage organizations."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setForm(emptyForm);
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Organization
            </Button>
          ) : null
        }
      />
      {organizationsQuery.isError ? (
        <InlineError message={organizationsQuery.error.message} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-surface text-xs uppercase tracking-normal text-muted-foreground">
                <tr>
                  {[
                    "Organization",
                    "Code",
                    "Type",
                    "Email",
                    "Phone",
                    "Status",
                    "Created",
                    ...(canUpdate ? ["Actions"] : []),
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {organizationsQuery.isLoading ? (
                  <LoadingRows columns={canUpdate ? 8 : 7} />
                ) : records.length ? (
                  records.map((item) => (
                    <tr key={item.id} className="border-t border-border hover:bg-surface/50">
                      <td className="px-3 py-3 font-medium">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          {item.name}
                        </span>
                      </td>
                      <td className="px-3 py-3">{item.organizationCode}</td>
                      <td className="px-3 py-3">{item.organizationType}</td>
                      <td className="px-3 py-3">{item.email || "-"}</td>
                      <td className="px-3 py-3">{item.phone || "-"}</td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          status={
                            item.status === "ACTIVE"
                              ? "Approved"
                              : item.status === "SUSPENDED"
                                ? "Rejected"
                                : "Cancelled"
                          }
                        />
                      </td>
                      <td className="px-3 py-3">{formatDate(item.createdAt)}</td>
                      {canUpdate ? (
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            {canDeactivate && item.status !== "INACTIVE" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => setDeactivateTarget(item)}
                              >
                                <Power className="mr-1 h-3.5 w-3.5" />
                                Deactivate
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={canUpdate ? 8 : 7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            size={size}
            totalPages={totalPages}
            total={organizationsQuery.data?.totalElements ?? 0}
            loading={organizationsQuery.isLoading}
            setPage={setPage}
            setSize={setSize}
          />
        </div>
      )}
      <Dialog open={createOpen || Boolean(editing)} onOpenChange={closeForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Organization" : "Create Organization"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update organization details." : "Add a new organization."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {!editing ? (
                <Field label="Organization Code" id="organization-code">
                  <Input
                    id="organization-code"
                    value={form.organizationCode}
                    onChange={(e) => setForm({ ...form, organizationCode: e.target.value })}
                    required
                  />
                </Field>
              ) : null}
              <Field label="Organization Name" id="organization-name">
                <Input
                  id="organization-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Organization Type" id="organization-type">
                <select
                  id="organization-type"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.organizationType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      organizationType: e.target.value as OrganizationResponse["organizationType"],
                    })
                  }
                >
                  {["CUSTOMER", "SUPPLIER", "PARENT", "SYSTEM", "BRANCH"].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </Field>
              <Field label="Email" id="organization-email">
                <Input
                  id="organization-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Phone" id="organization-phone">
                <Input
                  id="organization-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              {editing ? (
                <Field label="Status" id="organization-status">
                  <select
                    id="organization-status"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as OrganizationResponse["status"],
                      })
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </Field>
              ) : null}
            </div>
            {createMutation.error || updateMutation.error ? (
              <InlineError message={(createMutation.error || updateMutation.error)!.message} />
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeForm(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  pending || !form.name.trim() || (!editing && !form.organizationCode.trim())
                }
              >
                {pending ? "Saving..." : "Save Organization"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DeactivateDialog
        open={Boolean(deactivateTarget)}
        entityName={deactivateTarget?.name || "organization"}
        validation={validationQuery.data}
        validating={validationQuery.isLoading}
        deactivating={deactivateMutation.isPending}
        error={validationQuery.error?.message || deactivateMutation.error?.message}
        onOpenChange={(open) => {
          if (!open && !deactivateMutation.isPending) setDeactivateTarget(null);
        }}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
      />
    </div>
  );
}

function Pagination({
  page,
  size,
  totalPages,
  total,
  loading,
  setPage,
  setSize,
}: {
  page: number;
  size: number;
  totalPages: number;
  total: number;
  loading: boolean;
  setPage: (value: number | ((current: number) => number)) => void;
  setSize: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>{total ? `${total} organization(s)` : "No organizations"}</span>
      <div className="flex items-center gap-2">
        <Label htmlFor="organization-page-size">Rows</Label>
        <select
          id="organization-page-size"
          className="h-8 rounded-md border bg-background px-2"
          value={size}
          onChange={(e) => {
            setPage(0);
            setSize(Number(e.target.value));
          }}
        >
          {pageSizes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <span>
          Page {totalPages ? page + 1 : 0} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={loading || page === 0}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading || !totalPages || page >= totalPages - 1}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </Button>
      </div>
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
function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value),
      )
    : "-";
}
function LoadingRows({ columns }: { columns: number }) {
  return Array.from({ length: 6 }).map((_, row) => (
    <tr key={row} className="border-t">
      {Array.from({ length: columns }).map((__, col) => (
        <td key={col} className="px-3 py-3">
          <Skeleton className="h-5 w-full" />
        </td>
      ))}
    </tr>
  ));
}
