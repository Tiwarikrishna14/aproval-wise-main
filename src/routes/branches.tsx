import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { GitBranch, Pencil, Plus, Power } from "lucide-react";
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
  branchRecords,
  branchesApi,
  organizationsApi,
  type BranchResponse,
  type CreateBranchRequest,
  type PageResponse,
  type UpdateBranchRequest,
} from "@/services/admin-api.service";

const queryKey = ["admin", "branches"] as const;
const pageSizes = [10, 20, 50, 100];
type BranchForm = {
  branchCode: string;
  name: string;
  city: string;
  address: string;
  status: BranchResponse["status"];
};
const emptyForm: BranchForm = { branchCode: "", name: "", city: "", address: "", status: "ACTIVE" };

export const Route = createFileRoute("/branches")({
  head: () => ({ meta: [{ title: "Branches - Akribiz B2B" }] }),
  component: BranchesPage,
});

function BranchesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSa = isSuperAdmin(user);
  const canView = hasPermission(user, "BRANCH_VIEW");
  const canCreate = hasPermission(user, "BRANCH_CREATE");
  const canUpdate = hasPermission(user, "BRANCH_UPDATE");
  const [organizationId, setOrganizationId] = useState(isSa ? "" : (user?.organizationId ?? ""));
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BranchResponse | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [deactivateTarget, setDeactivateTarget] = useState<BranchResponse | null>(null);

  const organizationsQuery = useQuery({
    queryKey: ["admin", "branches", "organizations"],
    queryFn: async () => (await organizationsApi.list({ size: 100 })).data.content,
    enabled: isSa,
    retry: false,
    staleTime: 60_000,
  });
  const branchesQuery = useQuery({
    queryKey: [...queryKey, organizationId, page, size],
    queryFn: async () =>
      (
        await branchesApi.list({
          organizationId: organizationId || undefined,
          page,
          size,
          sort: ["createdAt,desc"],
        })
      ).data,
    enabled: (canView || canCreate) && (!isSa || Boolean(organizationId)),
    retry: false,
  });
  const branches = branchRecords(branchesQuery.data);
  const pageData = Array.isArray(branchesQuery.data)
    ? undefined
    : (branchesQuery.data as PageResponse<BranchResponse> | undefined);
  const totalPages = pageData?.totalPages ?? (branches.length ? 1 : 0);
  useEffect(() => {
    if (totalPages > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  const createMutation = useMutation({
    mutationFn: (body: CreateBranchRequest) => branchesApi.create(organizationId, body),
    onSuccess: async () => {
      setCreateOpen(false);
      setForm(emptyForm);
      toast.success("Branch created successfully");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBranchRequest }) =>
      branchesApi.update(id, body),
    onSuccess: async () => {
      setEditing(null);
      setForm(emptyForm);
      toast.success("Branch updated successfully");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(error.message),
  });
  const validationQuery = useQuery({
    queryKey: ["branch-delete-validation", deactivateTarget?.id],
    queryFn: async () => (await branchesApi.deleteValidation(deactivateTarget!.id)).data,
    enabled: Boolean(deactivateTarget),
    retry: false,
  });
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => branchesApi.deactivate(id, true),
    onSuccess: async () => {
      setDeactivateTarget(null);
      toast.success("Branch deactivated successfully");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    if (editing)
      updateMutation.mutate({
        id: editing.id,
        body: {
          name: form.name.trim(),
          city: form.city.trim() || undefined,
          address: form.address.trim() || undefined,
          status: form.status,
        },
      });
    else
      createMutation.mutate({
        branchCode: form.branchCode.trim(),
        name: form.name.trim(),
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined,
      });
  }
  function openEdit(item: BranchResponse) {
    setEditing(item);
    setForm({
      branchCode: item.branchCode,
      name: item.name,
      city: item.city ?? "",
      address: item.address ?? "",
      status: item.status,
    });
  }
  function closeForm(open: boolean) {
    if (open || createMutation.isPending || updateMutation.isPending) return;
    setCreateOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }
  const pending = createMutation.isPending || updateMutation.isPending;

  if (!canView && !canCreate)
    return (
      <div className="mx-auto max-w-[1400px] rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        Branch access requires BRANCH_VIEW or BRANCH_CREATE.
      </div>
    );
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Branches"
        description="Manage branches under an organization."
        actions={
          canCreate ? (
            <Button
              disabled={!organizationId}
              onClick={() => {
                setForm(emptyForm);
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Branch
            </Button>
          ) : null
        }
      />
      {isSa ? (
        <div className="max-w-sm space-y-2">
          <Label htmlFor="branch-organization">Organization</Label>
          <select
            id="branch-organization"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={organizationId}
            onChange={(e) => {
              setOrganizationId(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Select organization</option>
            {(organizationsQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.organizationCode})
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {isSa && !organizationId ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Select an organization to view its branches.
        </div>
      ) : branchesQuery.isError ? (
        <InlineError message={branchesQuery.error.message} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-surface text-xs uppercase tracking-normal text-muted-foreground">
                <tr>
                  {[
                    "Branch",
                    "Code",
                    "City",
                    "Customers",
                    "Users",
                    "Status",
                    ...(canUpdate ? ["Actions"] : []),
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchesQuery.isLoading ? (
                  <LoadingRows columns={canUpdate ? 7 : 6} />
                ) : branches.length ? (
                  branches.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-surface/50">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 font-medium">
                          <GitBranch className="h-4 w-4 text-primary" />
                          {item.name}
                        </div>
                        <div className="pl-6 text-xs text-muted-foreground">
                          {item.address || "No address"}
                        </div>
                      </td>
                      <td className="px-3 py-3">{item.branchCode}</td>
                      <td className="px-3 py-3">{item.city || "-"}</td>
                      <td className="px-3 py-3">{item.customerCount ?? 0}</td>
                      <td className="px-3 py-3">{item.userCount ?? 0}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={item.status === "ACTIVE" ? "Approved" : "Cancelled"} />
                      </td>
                      {canUpdate ? (
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            {item.status === "ACTIVE" ? (
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
                      colSpan={canUpdate ? 7 : 6}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No branches found.
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
            total={pageData?.totalElements ?? branches.length}
            loading={branchesQuery.isLoading}
            setPage={setPage}
            setSize={setSize}
          />
        </div>
      )}
      <Dialog open={createOpen || Boolean(editing)} onOpenChange={closeForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Branch" : "Create Branch"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update branch details and status."
                : "Create a branch under the selected organization."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {!editing ? (
                <Field label="Branch Code" id="branch-code">
                  <Input
                    id="branch-code"
                    value={form.branchCode}
                    onChange={(e) => setForm({ ...form, branchCode: e.target.value })}
                    required
                  />
                </Field>
              ) : null}
              <Field label="Branch Name" id="branch-name">
                <Input
                  id="branch-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="City" id="branch-city">
                <Input
                  id="branch-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
              <Field label="Address" id="branch-address">
                <Input
                  id="branch-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
              {editing ? (
                <Field label="Status" id="branch-status">
                  <select
                    id="branch-status"
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as BranchResponse["status"] })
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
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
                disabled={pending}
                onClick={() => closeForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  pending ||
                  !organizationId ||
                  !form.name.trim() ||
                  (!editing && !form.branchCode.trim())
                }
              >
                {pending ? "Saving..." : "Save Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DeactivateDialog
        open={Boolean(deactivateTarget)}
        entityName={deactivateTarget?.name || "branch"}
        validation={validationQuery.data}
        validating={validationQuery.isLoading}
        deactivating={deactivateMutation.isPending}
        error={validationQuery.error?.message || deactivateMutation.error?.message}
        extraWarning="Business customers mapped to this branch will be moved to organization level."
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
      <span>{total ? `${total} branch(es)` : "No branches"}</span>
      <div className="flex items-center gap-2">
        <Label htmlFor="branch-page-size">Rows</Label>
        <select
          id="branch-page-size"
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
