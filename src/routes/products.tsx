
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
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

import {
  branchesApi,
  branchRecords,
  businessCustomersApi,
  organizationsApi,
  ProductForm,
  productRecords,
  productsApi,
} from "@/services/admin-api.service";

import { useAuth } from "@/lib/auth-context";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { products } from "@/lib/sample-data";

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

const categories = [
  "House Keeping",
  "Pantry",
  "Staionery",
];

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

  const isSa = isSuperAdmin(user);

  /*
   * ============================================================
   * ORGANIZATION / BRANCH
   *
   * These are ONLY used to fetch Customer Sell Codes.
   * They are NOT sent to Product API.
   * ============================================================
   */

  const [organizationId, setOrganizationId] = useState(
    isSa ? "" : user?.organizationId ?? "",
  );

  const [branchId, setBranchId] = useState(
    isSa ? "" : user?.branchId ?? "",
  );

  /*
   * Selected Customer Sell Code.
   * This is the ONLY filter sent to Product API.
   */
  const [customerSellCode, setCustomerSellCode] = useState("");

  /*
   * ============================================================
   * PRODUCT FORM
   * ============================================================
   */

  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const [productForm, setProductForm] =
    useState<ProductForm>(emptyProductForm);

  /*
   * ============================================================
   * ORGANIZATIONS
   *
   * Only Super Admin needs this dropdown.
   * ============================================================
   */

  const organizationsQuery = useQuery({
    queryKey: ["admin", "branches", "organizations"],

    queryFn: async () =>
      (await organizationsApi.list({ size: 100 })).data.content.filter(
        (item) => item.organizationType === "PARENT",
      ),

    enabled: isSa,

    retry: false,

    staleTime: 60 * 1000,
  });

  /*
   * ============================================================
   * BRANCHES
   *
   * Organization + Branch are used only to fetch customers
   * and therefore Customer Sell Codes.
   * ============================================================
   */

  const branchesQuery = useQuery({
    queryKey: [
      "admin",
      "customers",
      "branches",
      organizationId,
    ],

    queryFn: async () =>
      branchRecords(
        (
          await branchesApi.list({
            size: 100,
            organizationId,
          })
        ).data,
      ),

    enabled: Boolean(organizationId),

    retry: false,

    staleTime: 60 * 1000,
  });

  const branches = branchRecords(branchesQuery.data);

  /*
   * ============================================================
   * BUSINESS CUSTOMERS
   *
   * This API gets Organization + Branch.
   *
   * From this response we get Customer Sell Codes.
   * ============================================================
   */

  const customersQuery = useQuery({
    queryKey: [
      "admin",
      "business-customers",
      organizationId,
      branchId,
    ],

    queryFn: async () =>
      (
        await businessCustomersApi.list({
          organizationId: organizationId || undefined,
          branchId: branchId || undefined,
        })
      ).data,

    enabled:
      Boolean(organizationId) &&
      Boolean(branchId) &&
      (canView || canCreate),

    retry: false,

    staleTime: 60 * 1000,
  });

  const customers = Array.isArray(customersQuery.data)
    ? customersQuery.data
    : customersQuery.data?.content ?? [];

  /*
   * ============================================================
   * CUSTOMER SELL CODE LIST
   *
   * Change customerSellCode below if your backend uses
   * a different property name.
   * ============================================================
   */

  const sellCodes = customers
    .map((customer: any) => ({
      id: customer.id,

      code:
        customer.customerCode ??
        "",

      name:
        customer.name ??
        customer.customerName ??
        "",
    }))
    .filter((item) => item.code)
    .filter(
      (item, index, array) =>
        array.findIndex(
          (x) => x.code === item.code,
        ) === index,
    );

  
    console.log(customerSellCode)

 const productFetchQuery = useQuery({
    queryKey: ["admin", "product-list", customerSellCode],
    queryFn: async () =>
      productRecords(
              (
        await productsApi.list({
          size: 100,
          customerCode: customerSellCode || undefined,
        })
      ).data,
      ),    
    enabled: canView || canCreate,
    retry: false,
    staleTime: 60 * 1000,
  });
    const products = productRecords(productFetchQuery.data);

  /*
   * ============================================================
   * CREATE PRODUCT
   * ============================================================
   */

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

  /*
   * ============================================================
   * ORGANIZATION CHANGE
   * ============================================================
   */

  function handleOrganizationChange(value: string) {
    setOrganizationId(value);

    // Reset branch
    setBranchId("");

    // Reset sell code
    setCustomerSellCode("");
  }

  /*
   * ============================================================
   * BRANCH CHANGE
   * ============================================================
   */

  function handleBranchChange(value: string) {
    setBranchId(value);

    // Reset sell code
    setCustomerSellCode("");
  }

  /*
   * ============================================================
   * NORMAL USER
   *
   * Organization + Branch automatically come from user.
   * ============================================================
   */

  useEffect(() => {
    if (!isSa) {
      setOrganizationId(
        user?.organizationId ?? "",
      );

      setBranchId(
        user?.branchId ?? "",
      );

      setCustomerSellCode("");
    }
  }, [
    isSa,
    user?.organizationId,
    user?.branchId,
  ]);

  /*
   * ============================================================
   * CREATE PRODUCT SUBMIT
   * ============================================================
   */

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    createProduct.mutate({
      category: productForm.category,
      customerSellCode:
        productForm.customerSellCode,
      navItemCode:
        productForm.navItemCode,
      itemDescription:
        productForm.itemDescription,
      uom: productForm.uom,
      unitRate:
        productForm.unitRate,
    });
  }

  /*
   * ============================================================
   * CLOSE DIALOG
   * ============================================================
   */

  function handleClose() {
    setProductDialogOpen(false);

    setProductForm(emptyProductForm);
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">

      {/* ======================================================
          PAGE HEADER
          ====================================================== */}

      <PageHeader
        title="Products"
        description="Catalog of products, pricing, and assignments."
        actions={
          <Button
            onClick={() =>
              setProductDialogOpen(true)
            }
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Product
          </Button>
        }
      />

      {/* ======================================================
          FILTER SECTION
          ====================================================== */}

      <div className="rounded-xl border border-border bg-card p-4">

        <div className="grid gap-4 md:grid-cols-3">

          {/* ==================================================
              ORGANIZATION
              Super Admin ONLY
              ================================================== */}

          {isSa && (
            <div className="space-y-2">

              <Label htmlFor="customer-organization">
                Parent Organization
              </Label>

              <select
                id="customer-organization"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={organizationId}
                onChange={(event) =>
                  handleOrganizationChange(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Select organization
                </option>

                {(
                  organizationsQuery.data ?? []
                ).map((organization) => (
                  <option
                    key={organization.id}
                    value={organization.id}
                  >
                    {organization.name} (
                    {organization.organizationCode})
                  </option>
                ))}
              </select>

            </div>
          )}

          {/* ==================================================
              BRANCH
              Super Admin ONLY
              ================================================== */}

          {isSa && (
            <div className="space-y-2">

              <Label htmlFor="customer-branch">
                Branch
              </Label>

              <select
                id="customer-branch"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={branchId}
                onChange={(event) =>
                  handleBranchChange(
                    event.target.value,
                  )
                }
                disabled={!organizationId}
              >
                <option value="">
                  Select branch
                </option>

                {branches.map((branch: any) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                    {branch.branchCode
                      ? ` (${branch.branchCode})`
                      : ""}
                  </option>
                ))}
              </select>

            </div>
          )}

          {/* ==================================================
              CUSTOMER SELL CODE
              ================================================== */}

          <div className="space-y-2">

            <Label htmlFor="customer-sell-code-filter">
              Customer Sell Code
            </Label>

            <select
              id="customer-sell-code-filter"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={customerSellCode}
              onChange={(event) =>
                setCustomerSellCode(
                  event.target.value,
                )
              }
              disabled={
                !organizationId ||
                !branchId ||
                customersQuery.isLoading
              }
            >
              <option value="">
                Select customer sell code
              </option>

              {sellCodes.map((item) => (
                <option
                  key={item.id ?? item.code}
                  value={item.code}
                >
                  {item.code}
                  {item.name
                    ? ` - ${item.name}`
                    : ""}
                </option>
              ))}
            </select>

            {customersQuery.isLoading && (
              <p className="text-xs text-muted-foreground">
                Loading customer sell codes...
              </p>
            )}

            {!customersQuery.isLoading &&
              organizationId &&
              branchId &&
              sellCodes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No customer sell codes found.
                </p>
              )}

          </div>

        </div>

        {/* ====================================================
            NORMAL USER MESSAGE
            ==================================================== */}

        {!isSa && (
          <div className="mt-3 text-xs text-muted-foreground">
            Organization and Branch are automatically
            selected from your account.
          </div>
        )}

      </div>

      {/* ======================================================
          PRODUCT TABLE
          ====================================================== */}

      {productFetchQuery.isError ? (
        <DataError
          message={`Failed to load products: ${
            productFetchQuery.error instanceof Error
              ? productFetchQuery.error.message
              : "Unknown error"
          }`}
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

              {productFetchQuery.isLoading ? (
                <TableLoadingRows columns={9} />

              ) : !customerSellCode ? (
                <TableMessageRow
                  columns={9}
                  message="Please select a Customer Sell Code."
                />

              ) : products.length === 0 ? (
                <TableMessageRow
                  columns={9}
                  message="No products found for the selected Customer Sell Code."
                />

              ) : (
                products.map((product: any) => (

                  <tr
                    key={
                      product.id ??
                      product.sku
                    }
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
                        <StatusBadge
                          status={product.status}
                        />
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

      {/* ======================================================
          CREATE PRODUCT DIALOG
          ====================================================== */}

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

            <DialogTitle>
              Create Product
            </DialogTitle>

            <DialogDescription>
              Add a new product to the product catalog.
            </DialogDescription>

          </DialogHeader>

          <form
            className="space-y-5"
            onSubmit={handleSubmit}
          >

            <div className="grid gap-4 sm:grid-cols-2">

              {/* CATEGORY */}

              <div className="space-y-2">

                <Label htmlFor="product-category">
                  Category
                </Label>

                <select
                  id="product-category"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={
                    productForm.category
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category:
                        event.target.value,
                    })
                  }
                  required
                >

                  <option value="">
                    Select category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ),
                  )}

                </select>

              </div>

              {/* CUSTOMER SELL CODE */}

              <div className="space-y-2">

                <Label htmlFor="product-customer-sell-code">
                  Customer Sell Code
                </Label>

                <select
                  id="product-customer-sell-code"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={
                    productForm.customerSellCode
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      customerSellCode:
                        event.target.value,
                    })
                  }
                  required
                >

                  <option value="">
                    Select customer sell code
                  </option>

                  {sellCodes.map((item) => (
                    <option
                      key={
                        item.id ??
                        item.code
                      }
                      value={item.code}
                    >
                      {item.code}
                      {item.name
                        ? ` - ${item.name}`
                        : ""}
                    </option>
                  ))}

                </select>

              </div>

              {/* NAV ITEM CODE */}

              <div className="space-y-2">

                <Label htmlFor="nav-item-code">
                  Nav Item Code
                </Label>

                <Input
                  id="nav-item-code"
                  value={
                    productForm.navItemCode
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      navItemCode:
                        event.target.value,
                    })
                  }
                  placeholder="Enter NAV item code"
                  required
                />

              </div>

              {/* ITEM DESCRIPTION */}

              <div className="space-y-2">

                <Label htmlFor="item-description">
                  Item Description
                </Label>

                <Input
                  id="item-description"
                  value={
                    productForm.itemDescription
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      itemDescription:
                        event.target.value,
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
                  value={
                    productForm.uom
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      uom:
                        event.target.value,
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

              {/* UNIT RATE */}

              <div className="space-y-2">

                <Label htmlFor="unit-rate">
                  Unit Rate
                </Label>

                <Input
                  id="unit-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    productForm.unitRate
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      unitRate:
                        Number(
                          event.target.value,
                        ),
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

              <Button
                type="submit"
                disabled={
                  createProduct.isPending
                }
              >
                {createProduct.isPending
                  ? "Creating..."
                  : "Create Product"}
              </Button>

            </DialogFooter>

          </form>

        </DialogContent>

      </Dialog>

    </div>
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return `INR ${value.toLocaleString(
    "en-IN",
  )}`;
}

