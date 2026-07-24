import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { DataError, TableLoadingRows, TableMessageRow } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products - StockFlow B2B" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data: products = [], isLoading, isError, error } = useProducts();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Products"
        description="Catalog of products, pricing, and assignments."
        actions={
          <Button disabled>
            <Plus className="mr-1.5 h-4 w-4" />
            New Product
          </Button>
        }
      />

      {isError ? (
        <DataError message={`Failed to load products: ${error.message}`} />
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
                  <th key={header} className="px-4 py-3 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoadingRows columns={9} />
              ) : products.length === 0 ? (
                <TableMessageRow columns={9} message="No products returned by backend." />
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id ?? product.sku}
                    className="border-t border-border hover:bg-surface/50"
                  >
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.sku}</td>
                    <td className="px-4 py-3">{product.category ?? "-"}</td>
                    <td className="px-4 py-3">{product.unit ?? "-"}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(product.price)}</td>
                    <td className="px-4 py-3 tabular-nums">{product.stock ?? "-"}</td>
                    <td className="px-4 py-3 tabular-nums">{product.customers ?? "-"}</td>
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
    </div>
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "-";
  return `INR ${value.toLocaleString("en-IN")}`;
}
