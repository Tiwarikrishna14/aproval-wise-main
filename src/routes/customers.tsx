import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Pencil, Plus, Power, Search, X } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { DeactivateDialog } from "@/components/deactivate-dialog";
import { BusinessCustomerLocationsDialog } from "@/components/business-customer-locations-dialog";
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
import {
  hasPermission,
  isBranchScopedUser,
  isCustomerAccountUser,
  isSuperAdmin,
} from "@/lib/permissions";
import {
  branchRecords,
  branchesApi,
  businessCustomersApi,
  organizationsApi,
  type BusinessCustomerResponse,
  type CreateBusinessCustomerRequest,
  type PageResponse,
  type UpdateBusinessCustomerRequest,
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

type EditCustomerForm = Omit<CustomerForm, "customerCode"> & {
  status: BusinessCustomerResponse["status"];
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

const emptyEditForm: EditCustomerForm = {
  name: "",
  city: "",
  state: "",
  address: "",
  pincode: "",
  email: "",
  phone: "",
  status: "ACTIVE",
};

const customerPageSizes = [10, 20, 50, 100];

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Business Customers - Akribiz B2B" }] }),
  component: CustomersPage,
});

function customerRecords(
  value: BusinessCustomerResponse[] | PageResponse<BusinessCustomerResponse> | undefined,
) {
  return Array.isArray(value) ? value : (value?.content ?? []);
}

function customerPageResponse(
  value: BusinessCustomerResponse[] | PageResponse<BusinessCustomerResponse> | undefined,
) {
  return Array.isArray(value) ? undefined : value;
}

function CustomersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isCustomerAccount = isCustomerAccountUser(user);
  const canView = !isCustomerAccount && hasPermission(user, "CUSTOMER_VIEW");
  const canCreate = !isCustomerAccount && hasPermission(user, "CUSTOMER_CREATE");
  const canUpdate = !isCustomerAccount && hasPermission(user, "CUSTOMER_UPDATE");
  const isSa = isSuperAdmin(user);
  const branchScopedUser = isBranchScopedUser(user);
  const [organizationId, setOrganizationId] = useState(isSa ? "" : (user?.organizationId ?? ""));
  const [branchId, setBranchId] = useState(branchScopedUser ? (user?.branchId ?? "") : "");
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerPage, setCustomerPage] = useState(0);
  const [customerPageSize, setCustomerPageSize] = useState(20);
  const canChooseCustomerBranch = !branchScopedUser;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [pincodeStatus, setPincodeStatus] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<BusinessCustomerResponse | null>(null);
  const [editForm, setEditForm] = useState<EditCustomerForm>(emptyEditForm);
  const [deleteTarget, setDeleteTarget] = useState<BusinessCustomerResponse | null>(null);
  const [locationsCustomer, setLocationsCustomer] = useState<BusinessCustomerResponse | null>(null);

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
      branchRecords(
        (
          await branchesApi.list({
            size: 100,
            organizationId: organizationId || undefined,
          })
        ).data,
      ),
    enabled: (canView || canCreate) && (isSa || Boolean(organizationId)),
    retry: false,
    staleTime: 60 * 1000,
  });
  const customersQuery = useQuery({
    queryKey: [
      "admin",
      "business-customers",
      {
        organizationId,
        branchId,
        search: submittedSearch,
        city: cityFilter,
        status: statusFilter,
        page: customerPage,
        size: customerPageSize,
      },
    ],
    queryFn: async () =>
      (
        await businessCustomersApi.list({
          page: customerPage,
          size: customerPageSize,
          sort: ["updatedAt,desc"],
          branchId: branchId || undefined,
          organizationId: organizationId || undefined,
          search: submittedSearch || undefined,
          city: cityFilter.trim() || undefined,
          status: statusFilter ? (statusFilter as BusinessCustomerResponse["status"]) : undefined,
        })
      ).data,
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
  const assignedOrganizationQuery = useQuery({
    queryKey: ["admin", "customers", "assigned-organization", user?.organizationId],
    queryFn: async () => (await organizationsApi.get(user?.organizationId ?? "")).data,
    enabled:
      !isSa && Boolean(user?.organizationId) && !user?.organizationName && (canView || canCreate),
    retry: false,
    staleTime: 60 * 1000,
  });
  const assignedBranchQuery = useQuery({
    queryKey: ["admin", "customers", "assigned-branch", user?.branchId],
    queryFn: async () => (await branchesApi.get(user?.branchId ?? "")).data,
    enabled: Boolean(user?.branchId) && !user?.branchName && (canView || canCreate),
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
  const customers = customerRecords(customersQuery.data);
  const pageResponse = customerPageResponse(customersQuery.data);
  const totalElements = pageResponse?.totalElements ?? customers.length;
  const totalPages = pageResponse?.totalPages ?? (customers.length ? 1 : 0);
  const pageStart = totalElements === 0 ? 0 : customerPage * customerPageSize + 1;
  const pageEnd =
    totalElements === 0
      ? 0
      : Math.min(customerPage * customerPageSize + customers.length, totalElements);
  const tableColumnCount = canUpdate ? 9 : 8;

  const organizationLabel = (id?: string | null) => {
    if (!id) return "-";

    return (
      organizationsById.get(id) ||
      (id === user?.organizationId
        ? user?.organizationName || assignedOrganizationQuery.data?.name || "Assigned organization"
        : undefined) ||
      "Unknown organization"
    );
  };
  const branchLabel = (id?: string | null) => {
    if (!id) return "-";

    return (
      branchesById.get(id)?.name ||
      (id === user?.branchId
        ? user?.branchName || assignedBranchQuery.data?.name || "Assigned branch"
        : undefined) ||
      "Unknown branch"
    );
  };

  useEffect(() => {
    if (totalPages > 0 && customerPage > totalPages - 1) {
      setCustomerPage(totalPages - 1);
    }
  }, [customerPage, totalPages]);

  const createCustomer = useMutation({
    mutationFn: (body: CreateBusinessCustomerRequest) =>
      businessCustomersApi.create(branchId, body),
    onSuccess: async () => {
      setForm(emptyForm);
      setIsCreateOpen(false);
      toast.success("Business customer created successfully");
      await queryClient.invalidateQueries({ queryKey: ["admin", "business-customers"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCustomer = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBusinessCustomerRequest }) =>
      businessCustomersApi.update(id, body),
    onSuccess: async () => {
      setEditingCustomer(null);
      setEditForm(emptyEditForm);
      toast.success("Business customer updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["admin", "business-customers"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteValidationQuery = useQuery({
    queryKey: ["business-customer-delete-validation", deleteTarget?.id],
    queryFn: async () => (await businessCustomersApi.deleteValidation(deleteTarget!.id)).data,
    enabled: Boolean(deleteTarget),
    retry: false,
  });

  const deactivateCustomer = useMutation({
    mutationFn: (id: string) => businessCustomersApi.deactivate(id, true),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("Business customer deactivated successfully");
      await queryClient.invalidateQueries({ queryKey: ["admin", "business-customers"] });
    },
    onError: (error) => toast.error(error.message),
  });

  function updateField(field: keyof CustomerForm | keyof EditCustomerForm, value: string) {
    if (field === "status") return;
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateEditField(field: keyof CustomerForm | keyof EditCustomerForm, value: string) {
    if (field === "customerCode") return;
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function applyFilters() {
    setCustomerPage(0);
    setSubmittedSearch(searchInput.trim());
  }

  function resetFilters() {
    setSearchInput("");
    setSubmittedSearch("");
    setCityFilter("");
    setStatusFilter("");
    setCustomerPage(0);
  }

  function changeOrganization(value: string) {
    setOrganizationId(value);
    setBranchId("");
    setCustomerPage(0);
  }

  function changeBranch(value: string) {
    setBranchId(value);
    setCustomerPage(0);
  }

  function changePageSize(value: string) {
    setCustomerPage(0);
    setCustomerPageSize(Number(value));
  }

  function openEditDialog(customer: BusinessCustomerResponse) {
    if (!canUpdate) return;
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      address: customer.address ?? "",
      pincode: customer.pincode ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      status: customer.status ?? "ACTIVE",
    });
  }

  function closeEditDialog(open: boolean) {
    if (open || updateCustomer.isPending) return;
    setEditingCustomer(null);
    setEditForm(emptyEditForm);
  }

  function closeDeleteDialog(open: boolean) {
    if (open || deactivateCustomer.isPending) return;
    setDeleteTarget(null);
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

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpdate || !editingCustomer) return;

    updateCustomer.mutate({
      id: editingCustomer.id,
      body: {
        name: editForm.name.trim(),
        city: editForm.city.trim() || undefined,
        state: editForm.state.trim() || undefined,
        address: editForm.address.trim() || undefined,
        pincode: editForm.pincode.trim() || undefined,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        status: editForm.status,
      },
    });
  }

  function confirmDelete() {
    if (!deleteTarget || deactivateCustomer.isPending || !deleteValidationQuery.data) return;
    deactivateCustomer.mutate(deleteTarget.id);
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

      {customersQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load business customers from the backend.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search customers"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyFilters();
                }}
              />
            </div>

            {isSa ? (
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={organizationId}
                onChange={(event) => changeOrganization(event.target.value)}
                aria-label="Organization filter"
              >
                <option value="">All organizations</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} ({organization.organizationCode})
                  </option>
                ))}
              </select>
            ) : null}

            {canChooseCustomerBranch ? (
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={branchId}
                onChange={(event) => changeBranch(event.target.value)}
                disabled={!organizationId && !isSa}
                aria-label="Branch filter"
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.city || "Branch"})
                  </option>
                ))}
              </select>
            ) : null}

            <Input
              value={cityFilter}
              onChange={(event) => {
                setCityFilter(event.target.value);
                setCustomerPage(0);
              }}
              placeholder="City"
              aria-label="City filter"
            />

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCustomerPage(0);
              }}
              aria-label="Status filter"
            >
              <option value="">Active customers</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>

            <Button type="button" variant="outline" onClick={applyFilters}>
              <Search className="mr-1.5 h-4 w-4" />
              Apply
            </Button>
            <Button type="button" variant="ghost" onClick={resetFilters}>
              <X className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className={canUpdate ? "w-[13%]" : "w-[15%]"} />
                <col className={canUpdate ? "w-[9%]" : "w-[10%]"} />
                <col className={canUpdate ? "w-[16%]" : "w-[19%]"} />
                <col className={canUpdate ? "w-[15%]" : "w-[18%]"} />
                <col className={canUpdate ? "w-[13%]" : "w-[15%]"} />
                <col className={canUpdate ? "w-[10%]" : "w-[11%]"} />
                <col className={canUpdate ? "w-[8%]" : "w-[7%]"} />
                <col className={canUpdate ? "w-[8%]" : "w-[5%]"} />
                {canUpdate ? <col className="w-[8%]" /> : null}
              </colgroup>
              <thead className="bg-surface text-[11px] uppercase tracking-normal text-muted-foreground">
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
                    ...(canUpdate ? [""] : []),
                  ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-normal break-words px-3 py-3 text-left align-top font-medium leading-tight"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customersQuery.isLoading ? (
                  <LoadingRows columns={tableColumnCount} />
                ) : customers.length ? (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-t border-border hover:bg-surface/50">
                      <td className="break-words px-3 py-3 font-medium">
                        <div>{customer.name}</div>
                        {canView ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="mt-1 h-7 px-1.5 text-xs text-muted-foreground"
                            onClick={() => setLocationsCustomer(customer)}
                          >
                            <MapPin className="mr-1 h-3.5 w-3.5" />
                            Locations
                          </Button>
                        ) : null}
                      </td>
                      <td className="break-words px-3 py-3 text-muted-foreground">
                        {customer.customerCode}
                      </td>
                      <td className="break-words px-3 py-3">
                        <div>
                          {organizationLabel(
                            customer.organizationId ||
                              branchesById.get(customer.branchId)?.organizationId ||
                              user?.organizationId,
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {branchLabel(customer.branchId)}
                        </div>
                      </td>
                      <td className="break-words px-3 py-3">
                        <div>
                          {[customer.city, customer.state].filter(Boolean).join(", ") || "-"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[customer.address, customer.pincode].filter(Boolean).join(" - ")}
                        </div>
                      </td>
                      <td className="break-all px-3 py-3 text-muted-foreground">
                        {customer.email || "-"}
                      </td>
                      <td className="break-words px-3 py-3 text-muted-foreground">
                        {customer.phone || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          status={customer.status === "ACTIVE" ? "Approved" : "Cancelled"}
                        />
                      </td>
                      <td className="break-words px-3 py-3 text-muted-foreground">
                        {formatDate(customer.updatedAt || customer.createdAt)}
                      </td>
                      {canUpdate ? (
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            {customer.status === "ACTIVE" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(customer)}
                              >
                                <Power className="mr-1.5 h-3.5 w-3.5" />
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
                      colSpan={tableColumnCount}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No business customers returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              {totalElements
                ? `Showing ${pageStart}-${pageEnd} of ${totalElements}`
                : "No customers to show"}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="customers-page-size" className="text-xs">
                Rows
              </Label>
              <select
                id="customers-page-size"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={customerPageSize}
                onChange={(event) => changePageSize(event.target.value)}
              >
                {customerPageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <div className="mx-2 text-xs">
                Page {totalPages ? customerPage + 1 : 0} of {totalPages || 0}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={customerPage === 0 || customersQuery.isLoading}
                onClick={() => setCustomerPage((page) => Math.max(0, page - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  customersQuery.isLoading || totalPages === 0 || customerPage >= totalPages - 1
                }
                onClick={() => setCustomerPage((page) => page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
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
            {isSa ? (
              <Field label="Organization" id="create-customer-organization">
                <select
                  id="create-customer-organization"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={organizationId}
                  onChange={(event) => changeOrganization(event.target.value)}
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
            ) : null}
            {canChooseCustomerBranch ? (
              <Field label="Managing Branch" id="create-customer-branch">
                <select
                  id="create-customer-branch"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={branchId}
                  onChange={(event) => changeBranch(event.target.value)}
                  disabled={!organizationId || branchesQuery.isLoading}
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
            ) : null}
            <CustomerFields
              form={form}
              updateField={updateField}
              pincodeStatus={pincodeStatus}
              includeCode
            />
            {createCustomer.isError ? <InlineError message={createCustomer.error.message} /> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createCustomer.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCustomer.isPending || !branchId}>
                {createCustomer.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingCustomer)} onOpenChange={closeEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business Customer</DialogTitle>
            <DialogDescription>
              Update customer details or reactivate an inactive customer.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitEdit}>
            {editingCustomer ? (
              <Field label="Customer Code" id="edit-customer-code">
                <Input id="edit-customer-code" value={editingCustomer.customerCode} readOnly />
              </Field>
            ) : null}
            <CustomerFields form={editForm} updateField={updateEditField} />
            <Field label="Status" id="edit-customer-status">
              <select
                id="edit-customer-status"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editForm.status}
                onChange={(event) =>
                  updateEditField(
                    "status",
                    event.target.value as BusinessCustomerResponse["status"],
                  )
                }
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </Field>
            {updateCustomer.isError ? <InlineError message={updateCustomer.error.message} /> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeEditDialog(false)}
                disabled={updateCustomer.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateCustomer.isPending || !editForm.name.trim()}>
                {updateCustomer.isPending ? "Saving..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeactivateDialog
        open={Boolean(deleteTarget)}
        entityName={deleteTarget?.name || "business customer"}
        validation={deleteValidationQuery.data}
        validating={deleteValidationQuery.isLoading}
        deactivating={deactivateCustomer.isPending}
        error={deleteValidationQuery.error?.message || deactivateCustomer.error?.message}
        onOpenChange={closeDeleteDialog}
        onConfirm={confirmDelete}
      />
      <BusinessCustomerLocationsDialog
        customer={locationsCustomer}
        canCreate={canCreate}
        canUpdate={canUpdate}
        onOpenChange={(open) => {
          if (!open) setLocationsCustomer(null);
        }}
      />
    </div>
  );
}

function CustomerFields({
  form,
  updateField,
  pincodeStatus,
  includeCode,
}: {
  form: CustomerForm | EditCustomerForm;
  updateField: (field: keyof CustomerForm | keyof EditCustomerForm, value: string) => void;
  pincodeStatus?: string;
  includeCode?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {includeCode ? (
        <Field label="Customer Code" id="customer-code">
          <Input
            id="customer-code"
            value={(form as CustomerForm).customerCode}
            onChange={(event) => updateField("customerCode", event.target.value)}
            placeholder="CUST001"
            required
          />
        </Field>
      ) : null}
      <Field label="Customer Name" id="customer-name">
        <Input
          id="customer-name"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="ABC Pvt Ltd"
          required
        />
      </Field>
      <Field label="Customer City" id="customer-city">
        <Input
          id="customer-city"
          value={form.city}
          onChange={(event) => updateField("city", event.target.value)}
          placeholder="Delhi"
          required
        />
      </Field>
      <Field label="State" id="customer-state">
        <Input
          id="customer-state"
          value={form.state}
          onChange={(event) => updateField("state", event.target.value)}
          placeholder="Delhi"
        />
      </Field>
      <Field label="Customer Address" id="customer-address">
        <Input
          id="customer-address"
          value={form.address}
          onChange={(event) => updateField("address", event.target.value)}
          placeholder="Address"
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
            placeholder="110001"
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
