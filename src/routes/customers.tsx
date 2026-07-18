import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { customers } from "@/lib/sample-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — StockFlow B2B" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Customers" description="Manage customer organizations, users, and workflows." actions={<Button><Plus className="mr-1.5 h-4 w-4" />New Customer</Button>} />
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {["Customer", "Code", "Primary Contact", "Branches", "Active Orders", "Credit", "Status", "Manager", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.code} className="border-t border-border hover:bg-surface/50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.code}</td>
                <td className="px-4 py-3">{c.contact}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.branches}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.orders}</td>
                <td className="px-4 py-3"><StatusBadge status={c.credit === "Healthy" ? "Healthy" : c.credit === "Blocked" ? "Rejected" : "Low Stock"} /></td>
                <td className="px-4 py-3"><StatusBadge status={c.status === "Active" ? "Approved" : "Rejected"} /></td>
                <td className="px-4 py-3 text-muted-foreground">{c.manager}</td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">Open</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
