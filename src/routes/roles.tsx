import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-parts";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — StockFlow B2B" }] }),
  component: RolesPage,
});

const ROLES = [
  "Customer Viewer", "Customer Order Creator", "Customer Approver",
  "Inventory Manager", "Order Reviewer", "Stock Verifier",
  "Finance Approver", "Final Approver", "Operations Admin", "Super Admin",
];

const GROUPS: Record<string, string[]> = {
  Orders: ["View", "Create", "Edit", "Submit", "Cancel", "Approve", "Reject"],
  Inventory: ["View", "Adjust", "Archive", "Return", "Verify"],
  Customers: ["View", "Create", "Edit", "Deactivate"],
  Workflow: ["View", "Configure", "Activate"],
  Reports: ["View", "Export"],
};

function RolesPage() {
  const [sel, setSel] = useState("Order Reviewer");
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Roles & Permissions" description="Define role-based access to every module and action." />
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="grid gap-2 h-fit">
          {ROLES.map((r) => (
            <button key={r} onClick={() => setSel(r)} className={`rounded-lg border p-3 text-left text-sm font-medium transition ${sel === r ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-card hover:bg-surface/50"}`}>
              {r}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          <div>
            <div className="text-lg font-semibold">{sel}</div>
            <div className="text-xs text-muted-foreground">Permissions applied to all users assigned this role.</div>
          </div>
          {Object.entries(GROUPS).map(([g, perms]) => (
            <div key={g}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{g}</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {perms.map((p) => (
                  <label key={p} className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm hover:bg-surface/50">
                    <Checkbox defaultChecked={g === "Orders" && ["View", "Approve", "Reject"].includes(p)} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
