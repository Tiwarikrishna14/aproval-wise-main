import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

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
  businessCustomersApi,
  organizationsApi,
  type CreateBusinessCustomerRequest,
} from "@/services/admin-api.service";

type CustomerForm = {
  customerCode: string;
  name: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  email: string;
  phone: string;
};
const emptyForm: CustomerForm = {
  customerCode: "",
  name: "",
  city: "",
  state: "",
  address: "",
  pincode: "",
  email: "",
  phone: "",
};

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Business Customers - StockFlow B2B" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canView = hasPermission(user, "CUSTOMER_VIEW");
  const canCreate = hasPermission(user, "CUSTOMER_CREATE");
  const isSa = isSuperAdmin(user);
  const [organizationId, setOrganizationId] = useState(isSa ? "" : (user?.organizationId ?? ""));
  const [branchId, setBranchId] = useState(user?.branchId ?? "");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [pincodeStatus, setPincodeStatus] = useState("");

  useEffect(() => {
    const pincode = form.pincode.replace(/\D/g, "");
    if (pincode.length !== 6) {
      setPincodeStatus("");
      return;
    }

    const controller = new AbortController();
    setPincodeStatus("Looking up location...");

    fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Pincode lookup failed");
        return (await response.json()) as Array<{
          Status?: string;
          PostOffice?: Array<{ District?: string; State?: string; Name?: string }>;
        }>;
      })
      .then((result) => {
        const location = result[0]?.PostOffice?.[0];
        if (!location) {
          setPincodeStatus("Location not found");
          return;
        }

        setForm((current) => ({
          ...current,
          city: location.District || location.Name || current.city,
          state: location.State || current.state,
        }));
        setPincodeStatus("Location found");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPincodeStatus("Could not find location; enter city and state manually");
      });

    return () => controller.abort();
  }, [form.pincode]);

  const branchesQuery = useQuery({
    queryKey: ["admin", "customers", "branches", organizationId],
    queryFn: async () =>
      branchRecords((await branchesApi.list({ size: 100, organizationId })).data),
    enabled: (canView || canCreate) && Boolean(organizationId),
    retry: false,
    staleTime: 60 * 1000,
  });
  const customersQuery = useQuery({
    queryKey: ["admin", "business-customers", organizationId, branchId],
    queryFn: async () =>
      (await businessCustomersApi.list({ branchId: branchId || undefined, organizationId: organizationId || undefined })).data,
    enabled: canView || canCreate,
    retry: false,
    staleTime: 60 * 1000,
  });
  const organizationsQuery = useQuery({
    queryKey: ["admin", "customers", "organizations"],
    queryFn: async () => (await organizationsApi.list({ size: 100 })).data.content,
    enabled: canView || canCreate,
    retry: false,
    staleTime: 60 * 1000,
  });
  const branches = branchRecords(branchesQuery.data);
  const organizations = (organizationsQuery.data ?? []).filter(
    (organization) => organization.organizationType === "PARENT",
  );
  const organizationsById = new Map(
    (organizationsQuery.data ?? []).map((organization) => [organization.id, organization.name]),
  );
  const branchesById = new Map(branches.map((branch) => [branch.id, branch]));
  const customers = Array.isArray(customersQuery.data)
    ? customersQuery.data
    : customersQuery.data?.content ?? [];

  const createCustomer = useMutation({
    mutationFn: (body: CreateBusinessCustomerRequest) =>
      businessCustomersApi.create(branchId, body),
    onSuccess: async () => {
      setForm(emptyForm);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ["admin", "business-customers", organizationId, branchId],
      });
    },
  });

  function updateField(field: keyof CustomerForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate || !branchId) return;
    createCustomer.mutate({
      customerCode: form.customerCode.trim(),
      name: form.name.trim(),
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      address: form.address.trim() || undefined,
      pincode: form.pincode.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
    });
  }

  if (!canView && !canCreate) {
    return (
      <div className="mx-auto max-w-[1400px] rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        Business customer access requires CUSTOMER_VIEW or CUSTOMER_CREATE.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Business Customers"
        description="Customers belong to a branch; branch users can only access their own branch customers."
        actions={
          canCreate ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Customer
            </Button>
          ) : null
        }
      />

      {isSa ? <div className="grid gap-4 sm:grid-cols-2">
        <div className="max-w-sm space-y-2">
        <Label htmlFor="customer-organization">Organization</Label>
        <select
          id="customer-organization"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={organizationId}
          onChange={(event) => {
            setOrganizationId(event.target.value);
            setBranchId("");
          }}
        >
          {isSa ? <option value="">All organizations</option> : null}
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name} ({organization.organizationCode})
            </option>
          ))}
        </select>
        </div>

        <div className="max-w-sm space-y-2">
        <Label htmlFor="customer-branch">Branch</Label>
        <select
          id="customer-branch"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
        >
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name} ({branch.city || "Branch"})
            </option>
          ))}
        </select>
        </div>
      </div> : null}

      {customersQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load business customers from the backend.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {[
                  "Customer",
                  "Code",
                  "Managing Organization / Branch",
                  "Customer Location",
                  "Email",
                  "Phone",
                  "Status",
                  "Updated",
                ].map((header) => (
                  <th key={header} className="px-4 py-3 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customersQuery.isLoading ? (
                <LoadingRows columns={8} />
              ) : customers.length ? (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-t border-border hover:bg-surface/50">
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.customerCode}</td>
                    <td className="px-4 py-3">
                      <div>
                        {organizationsById.get(
                          customer.organizationId ||
                            branchesById.get(customer.branchId)?.organizationId ||
                            "",
                        ) || customer.organizationId || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {branchesById.get(customer.branchId)?.name || customer.branchId}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{[customer.city, customer.state].filter(Boolean).join(", ") || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {[customer.address, customer.pincode].filter(Boolean).join(" - ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.email || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.phone || "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={customer.status === "ACTIVE" ? "Approved" : "Cancelled"}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(customer.updatedAt || customer.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No business customers in this branch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isCreateOpen && canCreate} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Business Customer</DialogTitle>
            <DialogDescription>
              The selected branch manages this customer; the fields below describe the
              customer&apos;s own location.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Organization" id="create-customer-organization">
              <select
                id="create-customer-organization"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={organizationId}
                onChange={(event) => {
                  setOrganizationId(event.target.value);
                  setBranchId("");
                }}
                required
              >
                <option value="">Select organization</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} ({organization.organizationCode})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Managing Branch" id="create-customer-branch">
              <select
                id="create-customer-branch"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                required
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.city || "Branch"})
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer Code" id="customer-code">
                <Input
                  id="customer-code"
                  value={form.customerCode}
                  onChange={(event) => updateField("customerCode", event.target.value)}
                  placeholder="HALDIRAM-NOIDA"
                  required
                />
              </Field>
              <Field label="Customer Name" id="customer-name">
                <Input
                  id="customer-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Haldiram"
                  required
                />
              </Field>
              <Field label="Customer City" id="customer-city">
                <Input
                  id="customer-city"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  placeholder="Noida"
                  required
                />
              </Field>
              <Field label="State" id="customer-state">
                <Input
                  id="customer-state"
                  value={form.state}
                  onChange={(event) => updateField("state", event.target.value)}
                  placeholder="Uttar Pradesh"
                />
              </Field>
              <Field label="Customer Address" id="customer-address">
                <Input
                  id="customer-address"
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="Sector 18, Noida"
                />
              </Field>
              <Field label="Pincode" id="customer-pincode">
                <div className="space-y-1">
                  <Input
                    id="customer-pincode"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(event) => updateField("pincode", event.target.value.replace(/\D/g, ""))}
                    placeholder="201301"
                  />
                  {pincodeStatus ? <p className="text-xs text-muted-foreground">{pincodeStatus}</p> : null}
                </div>
              </Field>
              <Field label="Email" id="customer-email">
                <Input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </Field>
              <Field label="Phone" id="customer-phone">
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </Field>
            </div>
            {createCustomer.isError ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createCustomer.error.message}
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCustomer.isPending}>
                {createCustomer.isPending ? "Creating..." : "Create Customer"}
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
function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value),
      )
    : "-";
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
