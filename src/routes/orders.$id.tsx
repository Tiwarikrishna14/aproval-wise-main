import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  MessageSquare,
  Repeat,
  XCircle,
} from "lucide-react";

import { DataError, EmptyState, TableMessageRow } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrder } from "@/hooks/use-orders";
import type { TimelineItem } from "@/lib/domain-types";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({ meta: [{ title: `Order ${params.id} - StockFlow B2B` }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { data: order, isLoading, isError, error } = useOrder(id);

  if (isLoading) {
    return <EmptyState message="Loading order from backend..." />;
  }

  if (isError) {
    return <DataError message={`Failed to load order: ${error.message}`} />;
  }

  if (!order) {
    return <EmptyState message="Order was not returned by the backend." />;
  }

  const items = order.items ?? [];
  const timeline = order.timeline ?? [];
  const documents = order.documents ?? [];
  const comments = order.comments ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/orders">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Orders
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">Order {order.id}</h2>
              {order.status && <StatusBadge status={order.status} />}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
              <Meta k="Created" v={order.createdDate} />
              <Meta k="Required" v={order.requiredDate} />
              <Meta k="Customer" v={order.customer} />
              <Meta k="Branch" v={order.branch} />
              <Meta k="Total" v={formatMoney(order.totalAmount)} />
              <Meta k="Priority" v={order.priority} />
              <Meta k="Submitted by" v={order.submittedBy} />
              <Meta k="Current Step" v={order.currentStep} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled>
              <XCircle className="mr-1.5 h-4 w-4" />
              Cancel Order
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-1.5 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Repeat className="mr-1.5 h-4 w-4" />
              Reorder
            </Button>
            <Button size="sm" disabled>
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card">
          <Tabs defaultValue="summary">
            <div className="border-b border-border px-3 pt-2">
              <TabsList className="h-10 bg-transparent p-0 gap-1">
                <TabsTrigger value="summary">Order Summary</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="approvals">Approval History</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary" className="p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <SummaryBlock title="Delivery Information" lines={order.deliveryLines ?? []} />
                <SummaryBlock title="Billing Information" lines={order.billingLines ?? []} />
                <SummaryBlock
                  title="Order Totals"
                  lines={[
                    `Items: ${order.totalItems ?? items.length}`,
                    `Quantity: ${order.totalQty ?? "-"}`,
                    `Grand total: ${formatMoney(order.totalAmount)}`,
                  ]}
                />
                <SummaryBlock title="Account Manager" lines={order.managerLines ?? []} />
              </div>
              {order.notes ? (
                <div className="mt-6 rounded-md border border-border bg-surface/60 p-4">
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Order Notes
                  </div>
                  <p className="mt-1 text-sm">{order.notes}</p>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="products" className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Product</th>
                      <th className="px-5 py-3 text-right font-medium">Requested</th>
                      <th className="px-5 py-3 text-right font-medium">Approved</th>
                      <th className="px-5 py-3 text-right font-medium">Fulfilled</th>
                      <th className="px-5 py-3 text-right font-medium">Unit Price</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <TableMessageRow columns={6} message="No order items returned by backend." />
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
                            {item.fulfilledQty ?? "-"}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums">
                            {formatMoney(item.unitPrice)}
                          </td>
                          <td className="px-5 py-3">
                            {item.status ? <StatusBadge status={item.status} /> : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="approvals" className="p-6">
              {timeline.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No approval history returned by backend.
                </div>
              ) : (
                <ol className="space-y-4">
                  {timeline.map((item, index) => (
                    <li key={`${item.title}-${index}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <StepIcon state={item.state ?? "pending"} />
                        {index < timeline.length - 1 && (
                          <div className="mt-1 h-14 w-px bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="mt-0.5 text-[13px] text-muted-foreground">
                          {[item.by, item.time].filter(Boolean).join(" - ") || "-"}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>

            <TabsContent value="documents" className="p-6">
              {documents.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No documents returned by backend.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {documents.map((document) => (
                    <div
                      key={document.id ?? document.name}
                      className="flex items-center justify-between rounded-md border border-border p-3"
                    >
                      <div className="text-sm font-medium">{document.name}</div>
                      {document.url ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={document.url}>Open</a>
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4 p-6">
              {comments.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No comments returned by backend.
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id ?? comment.text}
                    className="rounded-md border border-border p-4"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-medium">
                        {[comment.by, comment.role].filter(Boolean).join(" - ") || "-"}
                      </div>
                      <div className="text-muted-foreground">{comment.time}</div>
                    </div>
                    <p className="mt-2 text-sm">{comment.text}</p>
                  </div>
                ))
              )}
              <textarea className="input min-h-[80px]" placeholder="Add a comment..." disabled />
              <Button size="sm" disabled>
                Post Comment
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Approval Progress
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {timeline.length
              ? `${timeline.filter((item) => item.state === "done").length} of ${timeline.length} steps completed`
              : "No approval steps returned by backend."}
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

function Meta({ k, v }: { k: string; v?: string | number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="mt-0.5 text-sm font-medium">{v ?? "-"}</div>
    </div>
  );
}

function SummaryBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-md border border-border bg-surface/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="mt-2 space-y-0.5 text-sm">
        {lines.length === 0 ? (
          <div className="text-muted-foreground">Not returned by backend.</div>
        ) : (
          lines.map((line, index) => (
            <div key={index} className={index === 0 ? "font-medium" : "text-muted-foreground"}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: NonNullable<TimelineItem["state"]> }) {
  if (state === "done") {
    return (
      <div className="grid h-8 w-8 place-items-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-4 w-4" />
      </div>
    );
  }

  if (state === "active") {
    return (
      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="grid h-8 w-8 place-items-center rounded-full bg-destructive/15 text-destructive">
        <XCircle className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground">
      <Circle className="h-4 w-4" />
    </div>
  );
}
