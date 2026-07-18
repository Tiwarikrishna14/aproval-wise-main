import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { products } from "@/lib/sample-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — StockFlow B2B" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Products" description="Catalog of products, pricing, and assignments." actions={<Button><Plus className="mr-1.5 h-4 w-4" />New Product</Button>} />
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {["Product", "SKU", "Category", "Unit", "Base Price", "Stock", "Active Customers", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.sku} className="border-t border-border hover:bg-surface/50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.sku}</td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{p.unit}</td>
                <td className="px-4 py-3 tabular-nums">₹{p.price.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 tabular-nums">{p.stock}</td>
                <td className="px-4 py-3 tabular-nums">{p.customers}</td>
                <td className="px-4 py-3"><StatusBadge status="Approved" /></td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
