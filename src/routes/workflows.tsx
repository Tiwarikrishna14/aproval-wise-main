import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { ApprovalPolicyForm } from "@/components/approval-policy-form";
import { DataError, EmptyState } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import {
  hasAnyPermission,
  hasPermission,
  isOrganizationAdminUser,
  isSuperAdmin,
} from "@/lib/permissions";
import { businessCustomersApi, type BusinessCustomerResponse } from "@/services/admin-api.service";

export const Route = createFileRoute("/workflows")({
  head: () => ({ meta: [{ title: "Approval Workflows - Akribiz B2B" }] }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const { user } = useAuth();
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const roles = (user?.roles ?? []).map((role) => role.toUpperCase());
  const customerAdmin = roles.includes("CUSTOMER_ADMIN");
  const organizationAdmin = isOrganizationAdminUser(user);
  const administrator = isSuperAdmin(user) || organizationAdmin || customerAdmin;
  const ownCustomerId = customerAdmin ? (user?.businessCustomerId ?? "") : "";
  const canView = administrator && hasAnyPermission(user, ["CUSTOMER_VIEW", "CUSTOMER_UPDATE"]);
  const canEdit = administrator && hasPermission(user, "CUSTOMER_UPDATE");
  const customersQuery = useQuery({
    queryKey: ["admin", "approval-workflows", "customers", user?.organizationId],
    queryFn: async () =>
      (
        await businessCustomersApi.list({
          organizationId: isSuperAdmin(user) ? undefined : user?.organizationId,
          size: 100,
          status: "ACTIVE",
        })
      ).data,
    enabled: canView && !customerAdmin,
    retry: false,
    staleTime: 60 * 1000,
  });
  const customers: BusinessCustomerResponse[] = Array.isArray(customersQuery.data)
    ? customersQuery.data
    : (customersQuery.data?.content ?? []);
  const activeCustomerId = ownCustomerId || selectedCustomerId;

  if (!canView) {
    return (
      <DataError message="Approval workflow access is limited to Super Admin, Organization Admin, and Customer Admin users." />
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title="Workflow Setup"
        description="Configure customer-specific order approval policies and approval levels."
      />

      <Tabs defaultValue="approval-workflow">
        <TabsList>
          <TabsTrigger value="approval-workflow">Approval Workflow</TabsTrigger>
        </TabsList>
        <TabsContent value="approval-workflow" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold">Business Customer Approval Policy</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure sequential or parallel approval levels for order creation.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-5 p-5">
              {customerAdmin ? (
                <div className="rounded-md border bg-surface/40 p-3">
                  <div className="text-xs text-muted-foreground">Business Customer</div>
                  <div className="font-medium">
                    {user?.businessCustomerName ||
                      user?.businessCustomerCode ||
                      "Your customer account"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Customer administrators can update only their own approval policy.
                  </p>
                </div>
              ) : customersQuery.isError ? (
                <DataError message={customersQuery.error.message} />
              ) : (
                <div className="max-w-xl space-y-2">
                  <label htmlFor="workflow-customer" className="text-sm font-medium">
                    Business Customer
                  </label>
                  <select
                    id="workflow-customer"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedCustomerId}
                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                    disabled={customersQuery.isLoading}
                  >
                    <option value="">
                      {customersQuery.isLoading ? "Loading customers..." : "Select a customer"}
                    </option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.customerCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeCustomerId ? (
                <ApprovalPolicyForm customerId={activeCustomerId} canEdit={canEdit} />
              ) : customerAdmin ? (
                <DataError message="Your login is not mapped to a business customer." />
              ) : (
                <EmptyState message="Select a business customer to configure its approval policy." />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
