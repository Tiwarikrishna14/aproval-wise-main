import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, HelpCircle, Undo2, XCircle } from "lucide-react";
import type { ComponentType } from "react";

import { DataError, EmptyState, TableMessageRow } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useApproval } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/approvals/$id")({
  head: () => ({ meta: [{ title: "Approval Review - StockFlow B2B" }] }),
  component: ApprovalReview,
});

function ApprovalReview() {
  const { id } = Route.useParams();
  const { data: task, isLoading, isError, error } = useApproval(id);

  if (isLoading) return <EmptyState message="Loading approval task from backend..." />;
  if (isError) return <DataError message={`Failed to load approval task: ${error.message}`} />;
  if (!task) return <EmptyState message="Approval task was not returned by backend." />;

  const items = task.items ?? [];
  const history = task.history ?? [];
  const comments = task.comments ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/approvals">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Queue
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Approval Task - {task.taskId}
                </div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  {task.entity ?? task.taskId}
                </h2>
                <div className="mt-1 text-sm text-muted-foreground">
                  {[task.customer, task.submittedBy].filter(Boolean).join(" - ") || "-"}
                </div>
              </div>
              {task.status && <StatusBadge status={task.status} />}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Info k="Total Amount" v={formatMoney(task.amount)} />
              <Info k="Items" v={String(items.length)} />
              <Info k="Priority" v={task.priority ?? "-"} />
              <Info k="Step" v={task.step ?? "-"} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3 text-sm font-semibold">Products</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Product</th>
                    <th className="px-5 py-3 text-right font-medium">Requested</th>
                    <th className="px-5 py-3 text-right font-medium">Approved Qty</th>
                    <th className="px-5 py-3 text-right font-medium">Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <TableMessageRow columns={4} message="No approval items returned by backend." />
                  ) : (
                    items.map((item) => (
                      <tr key={item.id ?? item.sku} className="border-t border-border">
                        <td className="px-5 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.sku}</div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {item.requestedQty ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {item.approvedQty ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {formatMoney(item.unitPrice)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-sm font-semibold">Approval History</div>
            {history.length === 0 ? (
              <div className="mt-3 text-sm text-muted-foreground">
                No approval history returned by backend.
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {history.map((item, index) => (
                  <li key={`${item.title}-${index}`} className="py-2 text-sm text-muted-foreground">
                    {[item.title, item.by, item.time].filter(Boolean).join(" - ")}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-sm font-semibold">Comments</div>
            {comments.length === 0 ? (
              <div className="mt-3 text-sm text-muted-foreground">
                No comments returned by backend.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id ?? comment.text}
                    className="rounded-md border border-border p-3 text-sm"
                  >
                    <div className="text-xs text-muted-foreground">
                      {[comment.by, comment.role, comment.time].filter(Boolean).join(" - ")}
                    </div>
                    <div className="mt-1">{comment.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="sticky top-24 h-fit space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Current Step
            </div>
            <div className="mt-1 text-lg font-semibold">{task.step ?? "-"}</div>
            <div className="mt-2 space-y-2 text-sm">
              <Row k="Waiting" v={task.waiting ?? "-"} />
              <Row k="SLA" v={task.sla ?? "-"} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm font-semibold">Decision</div>
            <div className="mt-3 space-y-2">
              <DecisionButton icon={CheckCircle2} label="Approve" />
              <DecisionButton icon={CheckCircle2} label="Partially Approve" />
              <DecisionButton icon={XCircle} label="Reject" />
              <DecisionButton icon={Undo2} label="Return for Correction" />
              <DecisionButton icon={HelpCircle} label="Request Information" />
            </div>
            <div className="mt-4 space-y-2">
              <textarea
                className="input min-h-[90px]"
                placeholder="Approval comments..."
                disabled
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="flex-1" disabled>
                Save Draft
              </Button>
              <Button className="flex-1" disabled>
                Submit Decision
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "-";
  return `INR ${value.toLocaleString("en-IN")}`;
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/50 p-3">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="mt-0.5 text-sm font-semibold">{v}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function DecisionButton({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      disabled
      className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
