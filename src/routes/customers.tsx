import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import {
  organizationsApi,
  type CreateOrganizationRequest,
  type OrganizationResponse,
} from "@/services/admin-api.service";

const organizationsQueryOptions = {
  queryKey: ["admin", "organizations"] as const,
  queryFn: async () => (await organizationsApi.list({ size: 100 })).data.content,
  staleTime: 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
};

type CustomerForm = {
  organizationCode: string;
  name: string;
  email: string;
  phone: string;
};

const emptyForm: CustomerForm = {
  organizationCode: "",
  name: "",
  email: "",
  phone: "",
};

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers - StockFlow B2B" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const hasManageAccess = hasPermission(user, "ORGANIZATION_CREATE");
  const organizationsQuery = useQuery({
    ...organizationsQueryOptions,
    enabled: hasManageAccess,
  });
  const customers = (organizationsQuery.data ?? []).filter(
    (organization) => organization.organizationType === "CUSTOMER",
  );

  const createCustomer = useMutation({
    mutationFn: (body: CreateOrganizationRequest) => organizationsApi.create(body),
    onSuccess: async (response) => {
      mergeCreatedCustomer(queryClient, response.data);
      setForm(emptyForm);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({
        queryKey: organizationsQueryOptions.queryKey,
        refetchType: "none",
      });
    },
  });

  function updateField(field: keyof CustomerForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeCreateDialog(open: boolean) {
    setIsCreateOpen(open);

    if (!open && !createCustomer.isPending) {
      createCustomer.reset();
      setForm(emptyForm);
    }
  }

  function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasManageAccess) return;

    const payload: CreateOrganizationRequest = {
      organizationCode: form.organizationCode.trim(),
      name: form.name.trim(),
      organizationType: "CUSTOMER",
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
    };

    createCustomer.mutate(payload);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Customers"
        description="Customer organizations loaded from the backend organizations API."
        actions={
          hasManageAccess ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Customer
            </Button>
          ) : null
        }
      />

      {!hasManageAccess ? (
        <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Customer management is not available.</div>
          <p className="mt-1">
            This page requires ORGANIZATION_CREATE. You can view your own organization details from
            Profile & Settings.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/settings">Open Profile & Settings</Link>
          </Button>
        </div>
      ) : null}

      {hasManageAccess ? (
        organizationsQuery.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Could not load organizations from the backend.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Organization", "Code", "Type", "Email", "Phone", "Status", "Updated", ""].map(
                    (header) => (
                      <th key={header} className="px-4 py-3 text-left font-medium">
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {organizationsQuery.isLoading ? (
                  <LoadingRows columns={8} />
                ) : customers.length > 0 ? (
                  customers.map((organization) => (
                    <tr
                      key={organization.id}
                      className="border-t border-border hover:bg-surface/50"
                    >
                      <td className="px-4 py-3 font-medium">{organization.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {organization.organizationCode}
                      </td>
                      <td className="px-4 py-3">{organization.organizationType}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {organization.email || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {organization.phone || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={organization.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(organization.updatedAt || organization.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" disabled>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No customer organizations returned by the backend.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      <Dialog open={isCreateOpen && hasManageAccess} onOpenChange={closeCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Customer Organization</DialogTitle>
            <DialogDescription>
              This creates an organization with organizationType CUSTOMER.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={submitCustomer}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organization Code" htmlFor="organization-code">
                <Input
                  id="organization-code"
                  value={form.organizationCode}
                  onChange={(event) => updateField("organizationCode", event.target.value)}
                  placeholder="CUSTOMER001"
                  required
                />
              </Field>
              <Field label="Customer Name" htmlFor="customer-name">
                <Input
                  id="customer-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Customer organization name"
                  required
                />
              </Field>
              <Field label="Email" htmlFor="customer-email">
                <Input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="admin@customer.com"
                />
              </Field>
              <Field label="Phone" htmlFor="customer-phone">
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="+91..."
                />
              </Field>
            </div>

            {createCustomer.isError ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createCustomer.error.message}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeCreateDialog(false)}
                disabled={createCustomer.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createCustomer.isPending || !form.organizationCode.trim() || !form.name.trim()
                }
              >
                {createCustomer.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function mergeCreatedCustomer(
  queryClient: ReturnType<typeof useQueryClient>,
  createdCustomer: OrganizationResponse,
) {
  queryClient.setQueryData<OrganizationResponse[]>(
    organizationsQueryOptions.queryKey,
    (current = []) => {
      if (current.some((organization) => organization.id === createdCustomer.id)) return current;
      return [createdCustomer, ...current];
    },
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
