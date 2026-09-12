import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, ImageIcon, Plus, Upload, X } from "lucide-react";

import { DataError, TableLoadingRows, TableMessageRow } from "@/components/data-state";

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

import {
  branchesApi,
  branchRecords,
  businessCustomersApi,
  type BranchResponse,
  type BusinessCustomerResponse,
  organizationsApi,
  type ProductForm,
  type ProductResponse,
  productRecords,
  productsApi,
} from "@/services/admin-api.service";
import { getApiAssetUrl } from "@/services/api-client";

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

const categories = ["House Keeping", "Pantry", "Staionery"];

const uoms = ["EA", "PCS", "SET", "KG", "MTR", "LTR", "BOX"];

const productImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const bulkProductExtensions = [".csv", ".xls", ".xlsx"];
const productImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const bulkTemplateCsv = [
  "category,navItemCode,itemDescription,uom,unitRate,image",
  "Food,NAV001,Rice Bag,KG,120.00,rice.jpg",
  "Food,NAV002,Wheat Bag,KG,95.00,wheat.png",
  "Food,NAV003,Sugar Bag,KG,82.50,",
].join("\n");

const bulkTemplateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(bulkTemplateCsv)}`;

type FormMessage = {
  tone: "success" | "destructive";
  text: string;
};

function hasAllowedExtension(fileName: string, extensions: string[]) {
  const lowerName = fileName.toLowerCase();
  return extensions.some((extension) => lowerName.endsWith(extension));
}

function isAllowedProductImage(file: File) {
  return (
    hasAllowedExtension(file.name, productImageExtensions) &&
    (!file.type || productImageTypes.includes(file.type))
  );
}

function formDataFromProduct(form: ProductForm, image: File) {
  const data = new FormData();

  data.set("category", form.category);
  data.set("customerSellCode", form.customerSellCode);
  data.set("navItemCode", form.navItemCode);
  data.set("itemDescription", form.itemDescription);
  data.set("uom", form.uom);
  data.set("unitRate", String(form.unitRate));
  data.set("image", image);

  return data;
}

function ProductsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canView = hasPermission(user, "PRODUCT_VIEW");
  const canCreate = hasPermission(user, "PRODUCT_CREATE");

  const isSa = isSuperAdmin(user);
  const assignedBusinessCustomerId = isSa ? undefined : user?.businessCustomerId;

  /*
   * ============================================================
   * ORGANIZATION / BRANCH
   *
   * These are ONLY used to fetch Customer Sell Codes.
   * They are NOT sent to Product API.
   * ============================================================
   */

  const [organizationId, setOrganizationId] = useState(isSa ? "" : (user?.organizationId ?? ""));

  const [branchId, setBranchId] = useState(isSa ? "" : (user?.branchId ?? ""));

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

  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreviewUrl, setProductImagePreviewUrl] = useState("");
  const [productImageInputKey, setProductImageInputKey] = useState(0);
  const [productImageError, setProductImageError] = useState("");
  const [productMessage, setProductMessage] = useState<FormMessage | null>(null);
  const [bulkCustomerSellCode, setBulkCustomerSellCode] = useState("");
  const [bulkProductFile, setBulkProductFile] = useState<File | null>(null);
  const [bulkImageFiles, setBulkImageFiles] = useState<File[]>([]);
  const [bulkProductFileInputKey, setBulkProductFileInputKey] = useState(0);
  const [bulkImageInputKey, setBulkImageInputKey] = useState(0);
  const [bulkError, setBulkError] = useState("");
  const [bulkMessage, setBulkMessage] = useState<FormMessage | null>(null);

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
    queryKey: ["admin", "customers", "branches", organizationId],

    queryFn: async () =>
      branchRecords(
        (
          await branchesApi.list({
            size: 100,
            organizationId,
          })
        ).data,
      ),

    enabled: isSa && Boolean(organizationId),

    retry: false,

    staleTime: 60 * 1000,
  });

  const branches = branchRecords(branchesQuery.data);

  /*
   * ============================================================
   * BUSINESS CUSTOMERS
   *
   * Super Admin gets Organization + Branch.
   * Normal users get only their assigned Business Customer.
   *
   * From this response we get Customer Sell Codes.
   * ============================================================
   */

  const customersQuery = useQuery({
    queryKey: ["admin", "business-customers", organizationId, branchId, assignedBusinessCustomerId],

    queryFn: async () => {
      if (!isSa) {
        if (!assignedBusinessCustomerId) return [];
        return [(await businessCustomersApi.get(assignedBusinessCustomerId)).data];
      }

      return (
        await businessCustomersApi.list({
          organizationId: organizationId || undefined,
          branchId: branchId || undefined,
        })
      ).data;
    },

    enabled:
      (canView || canCreate) &&
      (isSa ? Boolean(organizationId) && Boolean(branchId) : Boolean(assignedBusinessCustomerId)),

    retry: false,

    staleTime: 60 * 1000,
  });

  const customers: BusinessCustomerResponse[] = Array.isArray(customersQuery.data)
    ? customersQuery.data
    : (customersQuery.data?.content ?? []);

  /*
   * ============================================================
   * CUSTOMER SELL CODE LIST
   *
   * Change customerSellCode below if your backend uses
   * a different property name.
   * ============================================================
   */

  const sellCodes = customers
    .map((customer) => ({
      id: customer.id,

      code: customer.customerCode ?? "",

      name: customer.name ?? customer.customerName ?? "",
    }))
    .filter((item) => item.code)
    .filter((item, index, array) => array.findIndex((x) => x.code === item.code) === index);

  const assignedCustomerSellCode = !isSa && sellCodes.length === 1 ? sellCodes[0].code : "";

  const productFetchQuery = useQuery({
    queryKey: ["admin", "product-list", customerSellCode],
    queryFn: async () =>
      productRecords(
        (
          await productsApi.list({
            size: 100,
            customerSellCode,
          })
        ).data,
      ),
    enabled: Boolean(customerSellCode) && (canView || canCreate),
    retry: false,
    staleTime: 60 * 1000,
  });
  const products = productRecords(productFetchQuery.data).filter(
    (product) => isSa || product.customerSellCode === customerSellCode,
  );

  useEffect(() => {
    if (!productImageFile) {
      setProductImagePreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(productImageFile);
    setProductImagePreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [productImageFile]);

  /*
   * ============================================================
   * CREATE PRODUCT
   * ============================================================
   */

  const createProduct = useMutation({
    mutationFn: ({ form, image }: { form: ProductForm; image?: File | null }) =>
      image
        ? productsApi.createWithImage(formDataFromProduct(form, image))
        : productsApi.create(form),

    onSuccess: async () => {
      setProductDialogOpen(false);
      setProductMessage({
        tone: "success",
        text: "Product created successfully.",
      });

      resetProductCreateForm();

      await queryClient.invalidateQueries({
        queryKey: ["admin", "product-list"],
      });
    },

    onError: (error) => {
      setProductMessage({
        tone: "destructive",
        text: error instanceof Error ? error.message : "Failed to create product.",
      });
    },
  });

  const bulkUpload = useMutation({
    mutationFn: ({
      customerSellCode,
      file,
      images,
    }: {
      customerSellCode: string;
      file: File;
      images: File[];
    }) => {
      const data = new FormData();
      data.set("file", file);
      images.forEach((image) => data.append("images", image));

      return productsApi.bulkUpload(customerSellCode, data);
    },

    onSuccess: async () => {
      setBulkMessage({
        tone: "success",
        text: "Bulk product upload completed successfully.",
      });
      resetBulkUploadForm();

      await queryClient.invalidateQueries({
        queryKey: ["admin", "product-list"],
      });
    },

    onError: (error) => {
      setBulkMessage({
        tone: "destructive",
        text: error instanceof Error ? error.message : "Bulk upload failed.",
      });
    },
  });

  function resetProductCreateForm() {
    setProductForm({
      ...emptyProductForm,
      customerSellCode: isSa ? "" : customerSellCode,
    });
    setProductImageFile(null);
    setProductImageError("");
    setProductImageInputKey((key) => key + 1);
  }

  function resetBulkUploadForm() {
    setBulkProductFile(null);
    setBulkImageFiles([]);
    setBulkError("");
    setBulkProductFileInputKey((key) => key + 1);
    setBulkImageInputKey((key) => key + 1);
    if (!isSa) setBulkCustomerSellCode(customerSellCode);
  }

  function handleProductImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setProductImageError("");

    if (!file) {
      setProductImageFile(null);
      return;
    }

    if (!isAllowedProductImage(file)) {
      setProductImageFile(null);
      setProductImageInputKey((key) => key + 1);
      setProductImageError("Use a JPG, JPEG, PNG, WEBP, or GIF image.");
      return;
    }

    setProductImageFile(file);
  }

  function removeProductImage() {
    setProductImageFile(null);
    setProductImageError("");
    setProductImageInputKey((key) => key + 1);
  }

  function handleBulkProductFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setBulkError("");

    if (!file) {
      setBulkProductFile(null);
      return;
    }

    if (!hasAllowedExtension(file.name, bulkProductExtensions)) {
      setBulkProductFile(null);
      setBulkProductFileInputKey((key) => key + 1);
      setBulkError("Upload a CSV, XLS, or XLSX product file.");
      return;
    }

    setBulkProductFile(file);
  }

  function handleBulkImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setBulkError("");

    if (!files.length) {
      setBulkImageFiles([]);
      return;
    }

    const invalidFile = files.find((file) => !isAllowedProductImage(file));
    if (invalidFile) {
      setBulkImageFiles([]);
      setBulkImageInputKey((key) => key + 1);
      setBulkError(`${invalidFile.name} is not a supported product image.`);
      return;
    }

    const duplicateFileName = files.find(
      (file, index) => files.findIndex((item) => item.name === file.name) !== index,
    );
    if (duplicateFileName) {
      setBulkImageFiles([]);
      setBulkImageInputKey((key) => key + 1);
      setBulkError(`Duplicate image filename: ${duplicateFileName.name}.`);
      return;
    }

    setBulkImageFiles(files);
  }

  function removeBulkProductFile() {
    setBulkProductFile(null);
    setBulkProductFileInputKey((key) => key + 1);
  }

  function removeBulkImage(name: string) {
    setBulkImageFiles((files) => files.filter((file) => file.name !== name));
    setBulkImageInputKey((key) => key + 1);
  }

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
    setBulkCustomerSellCode("");
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
    setBulkCustomerSellCode("");
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
      setOrganizationId(user?.organizationId ?? "");

      setBranchId(user?.branchId ?? "");

      setCustomerSellCode("");
      setProductForm((current) => ({
        ...current,
        customerSellCode: "",
      }));
    }
  }, [isSa, user?.businessCustomerId, user?.organizationId, user?.branchId]);

  useEffect(() => {
    if (!assignedCustomerSellCode) return;

    setCustomerSellCode(assignedCustomerSellCode);
    setBulkCustomerSellCode(assignedCustomerSellCode);
    setProductForm((current) =>
      current.customerSellCode === assignedCustomerSellCode
        ? current
        : {
            ...current,
            customerSellCode: assignedCustomerSellCode,
          },
    );
  }, [assignedCustomerSellCode]);

  /*
   * ============================================================
   * CREATE PRODUCT SUBMIT
   * ============================================================
   */

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductMessage(null);

    const submittedCustomerSellCode = isSa ? productForm.customerSellCode : customerSellCode;
    if (!submittedCustomerSellCode) return;

    createProduct.mutate({
      form: {
        category: productForm.category,
        customerSellCode: submittedCustomerSellCode,
        navItemCode: productForm.navItemCode,
        itemDescription: productForm.itemDescription,
        uom: productForm.uom,
        unitRate: productForm.unitRate,
      },
      image: productImageFile,
    });
  }

  function handleBulkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBulkError("");
    setBulkMessage(null);

    const submittedCustomerSellCode = isSa ? bulkCustomerSellCode : customerSellCode;

    if (!submittedCustomerSellCode) {
      setBulkError("Select a Customer Sell Code before uploading products.");
      return;
    }

    if (!bulkProductFile) {
      setBulkError("Select a CSV, XLS, or XLSX product file.");
      return;
    }

    const duplicateFileName = bulkImageFiles.find(
      (file, index) => bulkImageFiles.findIndex((item) => item.name === file.name) !== index,
    );

    if (duplicateFileName) {
      setBulkError(`Duplicate image filename: ${duplicateFileName.name}.`);
      return;
    }

    bulkUpload.mutate({
      customerSellCode: submittedCustomerSellCode,
      file: bulkProductFile,
      images: bulkImageFiles,
    });
  }

  /*
   * ============================================================
   * CLOSE DIALOG
   * ============================================================
   */

  function handleClose() {
    setProductDialogOpen(false);

    resetProductCreateForm();
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  if (!canView && !canCreate) {
    return (
      <div className="mx-auto max-w-[1400px] rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        Product access requires PRODUCT_VIEW or PRODUCT_CREATE.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* ======================================================
          PAGE HEADER
          ====================================================== */}

      <PageHeader
        title="Products"
        description="Catalog of products, pricing, and assignments."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                if (!isSa && customerSellCode) {
                  setProductForm((current) => ({
                    ...current,
                    customerSellCode,
                  }));
                }

                setProductDialogOpen(true);
              }}
              disabled={!isSa && !customerSellCode}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Product
            </Button>
          ) : null
        }
      />

      {productMessage?.tone === "success" ? <FormMessageBanner message={productMessage} /> : null}

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
              <Label htmlFor="customer-organization">Parent Organization</Label>

              <select
                id="customer-organization"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={organizationId}
                onChange={(event) => handleOrganizationChange(event.target.value)}
              >
                <option value="">Select organization</option>

                {(organizationsQuery.data ?? []).map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} ({organization.organizationCode})
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
              <Label htmlFor="customer-branch">Branch</Label>

              <select
                id="customer-branch"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={branchId}
                onChange={(event) => handleBranchChange(event.target.value)}
                disabled={!organizationId}
              >
                <option value="">Select branch</option>

                {branches.map((branch: BranchResponse) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.branchCode ? ` (${branch.branchCode})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ==================================================
              CUSTOMER SELL CODE
              ================================================== */}

          <div className="space-y-2">
            <Label htmlFor="customer-sell-code-filter">Customer Sell Code</Label>

            {isSa ? (
              <select
                id="customer-sell-code-filter"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={customerSellCode}
                onChange={(event) => setCustomerSellCode(event.target.value)}
                disabled={!organizationId || !branchId || customersQuery.isLoading}
              >
                <option value="">Select customer sell code</option>

                {sellCodes.map((item) => (
                  <option key={item.id ?? item.code} value={item.code}>
                    {item.code}
                    {item.name ? ` - ${item.name}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="customer-sell-code-filter"
                value={customerSellCode}
                placeholder={
                  customersQuery.isLoading ? "Loading customer code..." : "Assigned customer code"
                }
                readOnly
              />
            )}

            {customersQuery.isLoading && (
              <p className="text-xs text-muted-foreground">Loading customer sell codes...</p>
            )}

            {!customersQuery.isLoading &&
              isSa &&
              organizationId &&
              branchId &&
              sellCodes.length === 0 && (
                <p className="text-xs text-muted-foreground">No customer sell codes found.</p>
              )}

            {!customersQuery.isLoading && !isSa && !assignedBusinessCustomerId && (
              <p className="text-xs text-muted-foreground">
                No customer code is assigned to your account.
              </p>
            )}

            {!customersQuery.isLoading &&
              !isSa &&
              assignedBusinessCustomerId &&
              sellCodes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Assigned customer code could not be found.
                </p>
              )}
          </div>
        </div>

        {/* ====================================================
            NORMAL USER MESSAGE
            ==================================================== */}

        {!isSa && (
          <div className="mt-3 text-xs text-muted-foreground">
            Organization, Branch, and Customer Sell Code are locked to your account.
          </div>
        )}
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Bulk Product Upload</h2>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              The image column in the CSV or Excel file must exactly match uploaded image filenames.
              Leave the image column blank when a product has no image.
            </p>
          </div>

          <Button asChild variant="outline" size="sm">
            <a href={bulkTemplateHref} download="product-upload-template.csv">
              <Download className="mr-1.5 h-4 w-4" />
              Template
            </a>
          </Button>
        </div>

        <form className="space-y-4" onSubmit={handleBulkSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bulk-customer-sell-code">Customer Sell Code</Label>
              {isSa ? (
                <select
                  id="bulk-customer-sell-code"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={bulkCustomerSellCode}
                  onChange={(event) => setBulkCustomerSellCode(event.target.value)}
                  disabled={!organizationId || !branchId || customersQuery.isLoading}
                  required
                >
                  <option value="">Select customer sell code</option>
                  {sellCodes.map((item) => (
                    <option key={item.id ?? item.code} value={item.code}>
                      {item.code}
                      {item.name ? ` - ${item.name}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="bulk-customer-sell-code"
                  value={bulkCustomerSellCode || customerSellCode}
                  readOnly
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-product-file">Product File</Label>
              <Input
                key={bulkProductFileInputKey}
                id="bulk-product-file"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleBulkProductFileChange}
                required={!bulkProductFile}
              />
              {bulkProductFile ? (
                <SelectedFileRow
                  icon={<FileSpreadsheet className="h-4 w-4" />}
                  label={bulkProductFile.name}
                  onRemove={removeBulkProductFile}
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-image-files">Images</Label>
              <Input
                key={bulkImageInputKey}
                id="bulk-image-files"
                type="file"
                accept={productImageExtensions.join(",")}
                multiple
                onChange={handleBulkImagesChange}
              />
              {bulkImageFiles.length ? (
                <div className="max-h-28 space-y-1 overflow-auto rounded-md border border-border p-2">
                  {bulkImageFiles.map((file) => (
                    <SelectedFileRow
                      key={file.name}
                      icon={<ImageIcon className="h-4 w-4" />}
                      label={file.name}
                      onRemove={() => removeBulkImage(file.name)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {bulkError ? (
            <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {bulkError}
            </div>
          ) : null}

          {bulkMessage ? <FormMessageBanner message={bulkMessage} /> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={bulkUpload.isPending || (!isSa && !customerSellCode)}>
              <Upload className="mr-1.5 h-4 w-4" />
              {bulkUpload.isPending ? "Uploading..." : "Upload Products"}
            </Button>
          </div>
        </form>
      </section>

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
                  "Image",
                  "Product",
                  "NAV Item Code",
                  "Category",
                  "UOM",
                  "Unit Rate",
                  "Customer Sell Code",
                  "Status",
                  "",
                ].map((header) => (
                  <th key={header} className="px-4 py-3 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {productFetchQuery.isLoading ? (
                <TableLoadingRows columns={9} />
              ) : !customerSellCode ? (
                <TableMessageRow columns={9} message="Please select a Customer Sell Code." />
              ) : products.length === 0 ? (
                <TableMessageRow
                  columns={9}
                  message="No products found for the selected Customer Sell Code."
                />
              ) : (
                products.map((product: ProductResponse) => (
                  <tr
                    key={product.id ?? product.navItemCode}
                    className="border-t border-border hover:bg-surface/50"
                  >
                    <td className="px-4 py-3">
                      <ProductImageThumbnail product={product} />
                    </td>

                    <td className="px-4 py-3 font-medium">{product.itemDescription}</td>

                    <td className="px-4 py-3 text-muted-foreground">{product.navItemCode}</td>

                    <td className="px-4 py-3">{product.category ?? "-"}</td>

                    <td className="px-4 py-3">{product.uom ?? "-"}</td>

                    <td className="px-4 py-3 tabular-nums">{formatMoney(product.unitRate)}</td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {product.customerSellCode ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {product.status ? <StatusBadge status={product.status} /> : "-"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" disabled>
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
            <DialogTitle>Create Product</DialogTitle>

            <DialogDescription>Add a new product to the product catalog.</DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* CATEGORY */}

              <div className="space-y-2">
                <Label htmlFor="product-category">Category</Label>

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
                  <option value="">Select category</option>

                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* CUSTOMER SELL CODE */}

              <div className="space-y-2">
                <Label htmlFor="product-customer-sell-code">Customer Sell Code</Label>

                {isSa ? (
                  <select
                    id="product-customer-sell-code"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={productForm.customerSellCode}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        customerSellCode: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select customer sell code</option>

                    {sellCodes.map((item) => (
                      <option key={item.id ?? item.code} value={item.code}>
                        {item.code}
                        {item.name ? ` - ${item.name}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="product-customer-sell-code"
                    value={productForm.customerSellCode || customerSellCode}
                    readOnly
                    required
                  />
                )}
              </div>

              {/* NAV ITEM CODE */}

              <div className="space-y-2">
                <Label htmlFor="nav-item-code">Nav Item Code</Label>

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

              {/* ITEM DESCRIPTION */}

              <div className="space-y-2">
                <Label htmlFor="item-description">Item Description</Label>

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
                <Label htmlFor="product-uom">UOM</Label>

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
                  <option value="">Select UOM</option>

                  {uoms.map((uom) => (
                    <option key={uom} value={uom}>
                      {uom}
                    </option>
                  ))}
                </select>
              </div>

              {/* UNIT RATE */}

              <div className="space-y-2">
                <Label htmlFor="unit-rate">Unit Rate</Label>

                <Input
                  id="unit-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.unitRate}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      unitRate: Number(event.target.value),
                    })
                  }
                  placeholder="Enter unit rate"
                  required
                />
              </div>

              <div className="space-y-3 sm:col-span-2">
                <Label htmlFor="product-image">Product Image</Label>

                <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
                    {productImagePreviewUrl ? (
                      <img
                        src={productImagePreviewUrl}
                        alt="Selected product"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <Input
                      key={productImageInputKey}
                      id="product-image"
                      type="file"
                      accept={productImageExtensions.join(",")}
                      onChange={handleProductImageChange}
                    />

                    <p className="text-xs text-muted-foreground">
                      Optional JPG, JPEG, PNG, WEBP, or GIF image.
                    </p>

                    {productImageFile ? (
                      <SelectedFileRow
                        icon={<ImageIcon className="h-4 w-4" />}
                        label={productImageFile.name}
                        onRemove={removeProductImage}
                      />
                    ) : null}

                    {productImageError ? (
                      <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {productImageError}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {productMessage?.tone === "destructive" ? (
              <FormMessageBanner message={productMessage} />
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={createProduct.isPending || Boolean(productImageError)}
              >
                {createProduct.isPending ? "Creating..." : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormMessageBanner({ message }: { message: FormMessage }) {
  const toneClasses =
    message.tone === "success"
      ? "border-success/25 bg-success/10 text-success"
      : "border-destructive/25 bg-destructive/10 text-destructive";

  return <div className={`rounded-md border px-3 py-2 text-sm ${toneClasses}`}>{message.text}</div>;
}

function SelectedFileRow({
  icon,
  label,
  onRemove,
}: {
  icon: ReactNode;
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ProductImageThumbnail({ product }: { product: ProductResponse }) {
  const [failed, setFailed] = useState(false);
  const src = product.imagePath && !failed ? getApiAssetUrl(product.imagePath) : "";

  if (!src) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground">
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={product.itemDescription || "Product image"}
      className="h-12 w-12 rounded-md border border-border object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return `INR ${value.toLocaleString("en-IN")}`;
}
