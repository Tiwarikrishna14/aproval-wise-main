import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { GitBranch, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

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
import { useAuth } from "@/lib/auth-context";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import {
  branchRecords,
  branchesApi,
  organizationsApi,
  type CreateBranchRequest,
} from "@/services/admin-api.service";

const branchesQueryKey = ["admin", "branches"] as const;

type BranchForm = {
  branchCode: string;
  name: string;
  city: string;
};

const emptyForm: BranchForm = { branchCode: "", name: "", city: "" };

export const Route = createFileRoute("/branches")({
  head: () => ({ meta: [{ title: "Branches - StockFlow B2B" }] }),
  component: BranchesPage,
});

function BranchesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(user?.organizationId ?? "");
  const canManage = hasPermission(user, "BRANCH_CREATE") && Boolean(selectedOrganizationId);
  const organizationsQuery = useQuery({
    queryKey: ["admin", "branches", "organizations"],
    queryFn: async () =>
      (await organizationsApi.list({ size: 100 })).data.content.filter(
        (item) => item.organizationType === "PARENT",
      ),
    enabled: isSuperAdmin(user),
    retry: false,
    staleTime: 60 * 1000,
  });
  const branchesQuery = useQuery({
    queryKey: [...branchesQueryKey, selectedOrganizationId],
    queryFn: async () =>
      branchRecords(
        (await branchesApi.list({ size: 100, organizationId: selectedOrganizationId || undefined }))
          .data,
      ),
    enabled: hasPermission(user, "BRANCH_VIEW") || canManage,
    retry: false,
    staleTime: 60 * 1000,
  });
  const branches = branchRecords(branchesQuery.data);

  const createBranch = useMutation({
    mutationFn: (body: CreateBranchRequest) => branchesApi.create(selectedOrganizationId, body),
    onSuccess: async () => {
      setOpen(false);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: branchesQueryKey });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !selectedOrganizationId) return;
    createBranch.mutate({
      branchCode: form.branchCode.trim(),
      name: form.name.trim(),
      city: form.city.trim() || undefined,
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Branches"
        description="Manage branches under your organization and keep users and customers branch-scoped."
        actions={
          canManage ? (
            <Button onClick={() => setOpen(true)} disabled={!selectedOrganizationId}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Branch
            </Button>
          ) : null
        }
      />

      {isSuperAdmin(user) ? (
        <div className="max-w-sm space-y-2">
          <Label htmlFor="branch-organization">Parent Organization</Label>
          <select
            id="branch-organization"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedOrganizationId}
            onChange={(event) => setSelectedOrganizationId(event.target.value)}
          >
            <option value="">Select organization</option>
            {(organizationsQuery.data ?? []).map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} ({organization.organizationCode})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!canManage && !hasPermission(user, "BRANCH_VIEW") ? (
        <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          Branch management requires BRANCH_VIEW or BRANCH_CREATE.
        </div>
      ) : branchesQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load branches from the backend.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Branch", "Code", "City", "Customers", "Users", "Status"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branchesQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading branches...
                  </td>
                </tr>
              ) : branches.length ? (
                branches.map((branch) => (
                  <tr key={branch.id} className="border-t border-border hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        <GitBranch className="h-4 w-4 text-primary" />
                        {branch.name}
                      </div>
                      <div className="pl-6 text-xs text-muted-foreground">
                        {branch.address || "No address"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{branch.branchCode}</td>
                    <td className="px-4 py-3">{branch.city || "-"}</td>
                    <td className="px-4 py-3">{branch.customerCount ?? 0}</td>
                    <td className="px-4 py-3">{branch.userCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          branch.status === "ACTIVE"
                            ? "Approved"
                            : branch.status === "INACTIVE"
                              ? "Cancelled"
                              : "Rejected"
                        }
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No branches have been created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open && canManage} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Branch</DialogTitle>
            <DialogDescription>
              Create a branch under the selected parent organization. Customers and users can then
              be assigned to it.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Branch Code" id="branch-code">
                <Input
                  id="branch-code"
                  value={form.branchCode}
                  onChange={(event) => setForm({ ...form, branchCode: event.target.value })}
                  placeholder="NOIDA-HQ"
                  required
                />
              </Field>
              <Field label="Branch Name" id="branch-name">
                <Input
                  id="branch-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Akribiz Noida HQ"
                  required
                />
              </Field>
              <Field label="City" id="branch-city">
                <Input
                  id="branch-city"
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                  placeholder="Noida"
                />
              </Field>
            </div>
            {createBranch.isError ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createBranch.error.message}
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBranch.isPending}>
                {createBranch.isPending ? "Creating..." : "Create Branch"}
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
