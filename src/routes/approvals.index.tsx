import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { approvalQueue } from "@/lib/sample-data";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/approvals/")({
  head: () => ({ meta: [{ title: "Approval Queue — StockFlow B2B" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Approval Queue"
        description="Tasks assigned to you and your team, prioritized by SLA."
      />

      <div className="rounded-xl border border-border bg-card">
        <Tabs defaultValue="Assigned to Me">
          <div className="border-b border-border px-3 pt-2">
            <TabsList className="h-10 bg-transparent gap-1">
              {["Assigned to Me", "Unassigned", "My Team", "Completed", "Rejected", "Returned"].map((t) => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-8 rounded-md text-[13px]">{t}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="grid gap-3 border-b border-border p-4 md:grid-cols-5">
            <select className="input"><option>Entity: All</option><option>Orders</option><option>Stock Requests</option></select>
            <select className="input"><option>Customer: All</option></select>
            <select className="input"><option>Priority: All</option><option>High</option><option>Medium</option><option>Low</option></select>
            <select className="input"><option>Approval Level: All</option></select>
            <select className="input"><option>SLA: All</option><option>Breached</option><option>Breach Risk</option><option>Within SLA</option></select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Task</th>
                  <th className="px-4 py-3 text-left font-medium">Entity</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Submitted By</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Step</th>
                  <th className="px-4 py-3 text-left font-medium">Priority</th>
                  <th className="px-4 py-3 text-left font-medium">Waiting</th>
                  <th className="px-4 py-3 text-left font-medium">SLA</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {approvalQueue.map((t) => (
                  <tr key={t.taskId} className="border-t border-border hover:bg-surface/50">
                    <td className="px-4 py-3 font-medium">{t.taskId}</td>
                    <td className="px-4 py-3"><Link to="/approvals/$id" params={{ id: t.taskId }} className="text-primary hover:underline">{t.entity}</Link></td>
                    <td className="px-4 py-3">{t.customer}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.submittedBy}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">₹{t.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">{t.step}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.priority} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{t.waiting}</td>
                    <td className="px-4 py-3">
                      <span className={t.sla === "Breached" ? "text-destructive font-medium" : t.sla === "Breach Risk" ? "text-warning-foreground font-medium" : "text-success"}>{t.sla}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost">Reject</Button>
                        <Button size="sm" asChild><Link to="/approvals/$id" params={{ id: t.taskId }}>Review</Link></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
