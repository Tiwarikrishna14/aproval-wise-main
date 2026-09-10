import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import {
  DataError,
  TableLoadingRows,
  TableMessageRow,
} from "@/components/data-state";

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

import { useProducts } from "@/hooks/use-domain-data";
import { branchesApi, branchRecords, businessCustomersApi, organizationsApi, ProductForm, productsApi } from "@/services/admin-api.service";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [{ title: "Products - Akribiz B2B" }],
  }),
  component: ProductsPage,
});



const emptyProductForm: ProductForm = {
  category: "",
  customerSellCode: "",
  navItemCode: "",
  itemDescription: "",
  uom: "",
  unitRate: 0.0,
};

// Predefined Categories
const categories = [
  "House Keeping",
  "Pantry",
  "Staionery"
];

// Predefined UOMs
const uoms = [
  "EA",
  "PCS",
  "SET",
  "KG",
  "MTR",
  "LTR",
  "BOX",
];



function ProductsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canView = hasPermission(user, "CUSTOMER_VIEW");
  const canCreate = hasPermission(user, "CUSTOMER_CREATE");
  
  const { data: products = [], isLoading, isError, error } = useProducts();

  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const [productForm, setProductForm] =
    useState<ProductForm>(emptyProductForm);
  const isSa = isSuperAdmin(user);

  const [organizationId, setOrganizationId] = useState(isSa ? "" : (user?.organizationId ?? ""));
  const [branchId, setBranchId] = useState(user?.branchId ?? "");

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
      queryKey: ["admin", "customers", "branches", organizationId],
      queryFn: async () =>
        branchRecords((await branchesApi.list({ size: 100, organizationId })).data),
      enabled: isSuperAdmin(user),
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
    const customersById = new Map(customers.map((customer) => [customer.id, customer]));
    
  const createProduct = useMutation({
    mutationFn: (body: ProductForm) =>
      productsApi.create(body),

    onSuccess: async () => {
      setProductDialogOpen(false);
      setProductForm(emptyProductForm);

      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
  });


  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createProduct.mutate({
      category: productForm.category,
      customerSellCode: productForm.customerSellCode,
      navItemCode: productForm.navItemCode,
      itemDescription: productForm.itemDescription,
      uom: productForm.uom,
      unitRate: productForm.unitRate,
    });
  }

  function handleClose() {
    setProductDialogOpen(false);
    setProductForm(emptyProductForm);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Products"
        description="Catalog of products, pricing, and assignments."
        actions={
          <Button onClick={() => setProductDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Product
          </Button>
        }
      />
<div className="max-w-sm space-y-2">
          <Label htmlFor="customer-organization">Parent Organization</Label>
          <select
            id="customer-organization"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            <option value="">Select organization</option>
            {(organizationsQuery.data ?? []).map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} ({organization.organizationCode})
              </option>
            ))}
          </select>
        </div>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="customer-organization">Parent Organization</Label>
          <select
            id="customer-organization"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            <option value="">Select organization</option>
            {(organizationsQuery.data ?? []).map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} ({organization.organizationCode})
              </option>
            ))}
          </select>
        </div>
      {isError ? (
        <DataError
          message={`Failed to load products: ${error.message}`}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {[
                  "Product",
                  "SKU",
                  "Category",
                  "Unit",
                  "Base Price",
                  "Stock",
                  "Active Customers",
                  "Status",
                  "",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left font-medium"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <TableLoadingRows columns={9} />
              ) : products.length === 0 ? (
                <TableMessageRow
                  columns={9}
                  message="No products returned by backend."
                />
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id ?? product.sku}
                    className="border-t border-border hover:bg-surface/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {product.name}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {product.sku}
                    </td>

                    <td className="px-4 py-3">
                      {product.category ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {product.unit ?? "-"}
                    </td>

                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(product.price)}
                    </td>

                    <td className="px-4 py-3 tabular-nums">
                      {product.stock ?? "-"}
                    </td>

                    <td className="px-4 py-3 tabular-nums">
                      {product.customers ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {product.status ? (
                        <StatusBadge status={product.status} />
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================
          CREATE PRODUCT DIALOG
          ========================= */}
      <Dialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setProductDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>

            <DialogDescription>
              Add a new product to the product catalog.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-5"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="product-category">
                  Category
                </Label>

                <select
                  id="product-category"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Sell Code */}
              <div className="space-y-2">
                <Label htmlFor="customer-sell-code">
                  Customer Sell Code
                </Label>

                <Input
                  id="customer-sell-code"
                  value={productForm.customerSellCode}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      customerSellCode: event.target.value,
                    })
                  }
                  placeholder="Enter customer sell code"
                  required
                />
              </div>

              {/* Nav Item Code */}
              <div className="space-y-2">
                <Label htmlFor="nav-item-code">
                  Nav Item Code
                </Label>

                <Input
                  id="nav-item-code"
                  value={productForm.navItemCode}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      navItemCode: event.target.value,
                    })
                  }
                  placeholder="Enter NAV item code"
                  required
                />
              </div>

              {/* Item Description */}
              <div className="space-y-2">
                <Label htmlFor="item-description">
                  Item Description
                </Label>

                <Input
                  id="item-description"
                  value={productForm.itemDescription}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      itemDescription: event.target.value,
                    })
                  }
                  placeholder="Enter item description"
                  required
                />
              </div>

              {/* UOM */}
              <div className="space-y-2">
                <Label htmlFor="product-uom">
                  UOM
                </Label>

                <select
                  id="product-uom"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={productForm.uom}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      uom: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    Select UOM
                  </option>

                  {uoms.map((uom) => (
                    <option
                      key={uom}
                      value={uom}
                    >
                      {uom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Rate */}
              <div className="space-y-2">
                <Label htmlFor="unit-rate">
                  Unit Rate
                </Label>

                <Input
                  id="unit-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.unitRate}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      unitRate:  Number(event.target.value),
                    })
                  }
                  placeholder="Enter unit rate"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>

              <Button type="submit">
                Create Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "-";

  return `INR ${value.toLocaleString("en-IN")}`;
}

