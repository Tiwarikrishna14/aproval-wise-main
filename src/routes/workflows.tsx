import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { workflows } from "@/lib/sample-data";
import { Plus, GripVertical, Trash2 } from "lucide-react";

export const Route = createFileRoute("/workflows")({
  head: () => ({ meta: [{ title: "Approval Workflows — StockFlow B2B" }] }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const steps = [
    { n: 1, name: "Order Review", role: "Order Reviewer", type: "Any one approver", sla: "8h" },
    { n: 2, name: "Stock Verification", role: "Stock Verifier", type: "Required", sla: "12h" },
    { n: 3, name: "Finance Approval", role: "Finance Approver", type: "Condition: Amount > ₹50,000", sla: "24h" },
    { n: 4, name: "Final Approval", role: "Final Approver", type: "Required", sla: "24h" },
  ];
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Approval Workflows" description="Configure multi-step approval flows per module and customer." actions={<Button><Plus className="mr-1.5 h-4 w-4" />New Workflow</Button>} />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold">Workflows</div>
          <ul className="divide-y divide-border">
            {workflows.map((w, i) => (
              <li key={w.name} className={`cursor-pointer p-4 ${i === 1 ? "bg-primary/5" : "hover:bg-surface/50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{w.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{w.module} · {w.customer} · {w.steps} steps</div>
                  </div>
                  <StatusBadge status={w.status === "Active" ? "Approved" : "Draft"} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <div className="text-[15px] font-semibold">High Value Order Approval</div>
              <div className="text-xs text-muted-foreground">Orders module · All customers · Last updated 28 Jun 2026</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Add Condition</Button>
              <Button size="sm">Activate Workflow</Button>
            </div>
          </div>
          <ol className="p-6 space-y-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-lg border border-border bg-surface/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <GripVertical className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Step {s.n}</div>
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Role: {s.role} · {s.type} · SLA {s.sla}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">Edit</Button>
                    <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  </div>
                </div>
              </li>
            ))}
            <Button variant="outline" className="w-full"><Plus className="mr-1.5 h-4 w-4" />Add Step</Button>
          </ol>
        </div>
      </div>
    </div>
  );
}
