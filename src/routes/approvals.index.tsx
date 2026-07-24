import { createFileRoute, Link } from "@tanstack/react-router";

import { DataError, TableLoadingRows, TableMessageRow } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApprovals } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/approvals/")({
  head: () => ({ meta: [{ title: "Approval Queue - StockFlow B2B" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { data: approvals = [], isLoading, isError, error } = useApprovals();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Approval Queue"
        description="Tasks assigned to you and your team, prioritized by SLA."
      />

      {isError ? (
        <DataError message={`Failed to load approvals: ${error.message}`} />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Tabs defaultValue="Assigned to Me">
            <div className="border-b border-border px-3 pt-2">
              <TabsList className="h-10 bg-transparent gap-1">
                {[
                  "Assigned to Me",
                  "Unassigned",
                  "My Team",
                  "Completed",
                  "Rejected",
                  "Returned",
                ].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-8 rounded-md text-[13px]"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="grid gap-3 border-b border-border p-4 md:grid-cols-5">
              <select className="input" disabled>
                <option>Entity: All</option>
              </select>
              <select className="input" disabled>
                <option>Customer: All</option>
              </select>
              <select className="input" disabled>
                <option>Priority: All</option>
              </select>
              <select className="input" disabled>
                <option>Approval Level: All</option>
              </select>
              <select className="input" disabled>
                <option>SLA: All</option>
              </select>
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
                  {isLoading ? (
                    <TableLoadingRows columns={10} />
                  ) : approvals.length === 0 ? (
                    <TableMessageRow columns={10} message="No approvals returned by backend." />
                  ) : (
                    approvals.map((task) => (
                      <tr key={task.taskId} className="border-t border-border hover:bg-surface/50">
                        <td className="px-4 py-3 font-medium">{task.taskId}</td>
                        <td className="px-4 py-3">
                          <Link
                            to="/approvals/$id"
                            params={{ id: task.taskId }}
                            className="text-primary hover:underline"
                          >
                            {task.entity ?? task.taskId}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{task.customer ?? "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {task.submittedBy ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {formatMoney(task.amount)}
                        </td>
                        <td className="px-4 py-3">{task.step ?? "-"}</td>
                        <td className="px-4 py-3">
                          {task.priority ? <StatusBadge status={task.priority} /> : "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{task.waiting ?? "-"}</td>
                        <td className="px-4 py-3">{task.sla ?? "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" asChild>
                            <Link to="/approvals/$id" params={{ id: task.taskId }}>
                              Review
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "-";
  return `INR ${value.toLocaleString("en-IN")}`;
}
