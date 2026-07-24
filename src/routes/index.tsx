import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  PackageX,
  Plus,
  Repeat,
  ShoppingCart,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { MetricCard, PageHeader, Section } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useAdminDashboard, useCustomerDashboard } from "@/hooks/use-dashboard";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import type { ActivityItem, DashboardMetric, OrderOverviewPoint } from "@/lib/dashboard-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — StockFlow B2B" },
      { name: "description", content: "Overview of orders, approvals, and stock activity." },
    ],
  }),
  component: Dashboard,
});

const customerMetricIcons: Record<string, LucideIcon> = {
  activeOrders: ShoppingCart,
  awaitingApproval: ClipboardCheck,
  inTransit: Truck,
  lowStockItems: AlertTriangle,
  pendingStockRequests: PackageX,
  archivedItems: Archive,
};

const adminMetricIcons: Record<string, LucideIcon> = {
  ordersPendingReview: ShoppingCart,
  approvalTasks: ClipboardCheck,
  stockVerificationPending: Boxes,
  customerStockRequests: ClipboardList,
  returnsPending: Repeat,
  slaBreaches: AlertTriangle,
};

const activityIcons: Record<ActivityItem["iconKey"], LucideIcon> = {
  approval: CheckCircle2,
  stock: Boxes,
  request: PackageX,
  order: ShoppingCart,
  workflow: ClipboardCheck,
};

function Dashboard() {
  const { role } = useRole();
  if (role === "admin" || role === "approver" || role === "verifier") return <AdminDashboard />;
  return <CustomerDashboard />;
}

function shouldShowPageLoader(queries: Array<{ isPending: boolean; data: unknown }>) {
  return queries.every((query) => query.isPending && query.data == null);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "-";
  return `INR ${value.toLocaleString("en-IN")}`;
}

function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-8 w-14 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

function MetricsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <MetricSkeleton key={index} />
      ))}
    </div>
  );
}

function SectionBodySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="px-5 pb-5 pt-4">
      <div className="mb-3 flex gap-4">
        <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid h-52 grid-cols-6 items-end gap-4">
        {[50, 70, 82, 64, 90, 76].map((height, index) => (
          <div key={index} className="flex h-full flex-col items-center justify-end gap-2">
            <div
              className="w-full animate-pulse rounded-t-md bg-muted"
              style={{ height: `${height}%` }}
            />
            <div className="h-3 w-8 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableLoadingRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <tr>
      <td colSpan={columns} className="p-5">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </td>
    </tr>
  );
}

function TableErrorRows({ columns, error }: { columns: number; error: unknown }) {
  return (
    <tr>
      <td colSpan={columns} className="px-5 py-8 text-center text-sm text-destructive">
        Failed to load this section: {errorMessage(error)}
      </td>
    </tr>
  );
}

function SectionError({ error }: { error: unknown }) {
  return (
    <div className="p-5 text-sm text-destructive">
      Failed to load this section: {errorMessage(error)}
    </div>
  );
}

function CustomerDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>
      <MetricsGridSkeleton />
      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Order Overview" className="xl:col-span-2">
          <ChartSkeleton />
        </Section>
        <Section title="Quick Actions">
          <SectionBodySkeleton rows={4} />
        </Section>
      </div>
      <Section title="Recent Orders">
        <SectionBodySkeleton />
      </Section>
      <Section title="Low Stock Alerts">
        <SectionBodySkeleton rows={3} />
      </Section>
    </div>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="space-y-2">
          <div className="h-8 w-72 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <MetricsGridSkeleton />
      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Approval Workload" className="xl:col-span-2">
          <SectionBodySkeleton rows={4} />
        </Section>
        <Section title="Recent Activity">
          <SectionBodySkeleton rows={5} />
        </Section>
      </div>
      <Section title="Orders Requiring Attention">
        <SectionBodySkeleton />
      </Section>
    </div>
  );
}

function renderMetric(metric: DashboardMetric, icons: Record<string, LucideIcon>) {
  const Icon = icons[metric.id] ?? ShoppingCart;
  return (
    <MetricCard
      key={metric.id}
      icon={Icon}
      label={metric.label}
      value={metric.value}
      trend={metric.trend}
      tone={metric.tone ?? "default"}
    />
  );
}

function BarChart({ data }: { data: OrderOverviewPoint[] }) {
  const max = 90;
  return (
    <div className="px-5 pb-5 pt-4">
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary" /> Created
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-info" /> Approved
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-success" /> Delivered
        </span>
      </div>
      <div className="grid h-52 grid-cols-6 items-end gap-4">
        {data.map((d) => (
          <div key={d.m} className="flex flex-col items-center gap-2">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                className="w-2.5 rounded-t bg-primary/80"
                style={{ height: `${(d.created / max) * 100}%` }}
              />
              <div
                className="w-2.5 rounded-t bg-info/80"
                style={{ height: `${(d.approved / max) * 100}%` }}
              />
              <div
                className="w-2.5 rounded-t bg-success/80"
                style={{ height: `${(d.delivered / max) * 100}%` }}
              />
            </div>
            <div className="text-[11px] text-muted-foreground">{d.m}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerDashboard() {
  const { user } = useAuth();
  const dashboard = useCustomerDashboard();
  const queries = [
    dashboard.metrics,
    dashboard.orderOverview,
    dashboard.recentOrders,
    dashboard.lowStock,
  ];

  if (shouldShowPageLoader(queries)) return <CustomerDashboardSkeleton />;

  const metrics = dashboard.metrics.data ?? [];
  const orderOverview = dashboard.orderOverview.data ?? [];
  const recentOrders = dashboard.recentOrders.data ?? [];
  const lowStock = dashboard.lowStock.data ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-primary">
              Customer Portal
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Good morning{user?.name ? `, ${user.name}` : ""}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Here is an overview of your orders and stock activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/orders/new">
                <Plus className="mr-1.5 h-4 w-4" /> Create Order
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/stock-requests/new">
                <ClipboardList className="mr-1.5 h-4 w-4" /> Request Stock
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {dashboard.metrics.isPending && metrics.length === 0 ? (
        <MetricsGridSkeleton />
      ) : dashboard.metrics.isError ? (
        <div className="rounded-xl border border-border bg-card">
          <SectionError error={dashboard.metrics.error} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => renderMetric(metric, customerMetricIcons))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Section
          title="Order Overview"
          description="Orders created, approved, and delivered — last 6 months"
          className="xl:col-span-2"
        >
          {dashboard.orderOverview.isPending && orderOverview.length === 0 ? (
            <ChartSkeleton />
          ) : dashboard.orderOverview.isError ? (
            <SectionError error={dashboard.orderOverview.error} />
          ) : (
            <BarChart data={orderOverview} />
          )}
        </Section>
        <Section title="Quick Actions">
          <div className="grid grid-cols-1 gap-2 p-4">
            {[
              { icon: Plus, label: "Create New Order", to: "/orders/new" },
              { icon: ClipboardList, label: "Request Stock", to: "/stock-requests/new" },
              { icon: Boxes, label: "View Inventory", to: "/inventory" },
              { icon: Repeat, label: "Reorder Previous Order", to: "/orders" },
            ].map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-sm font-medium">{a.label}</div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Section>
      </div>

      <Section
        title="Recent Orders"
        description="Latest activity across your organization"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/orders">View all</Link>
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Order ID</th>
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Items</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Required</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentOrders.isPending && recentOrders.length === 0 ? (
                <TableLoadingRows columns={7} />
              ) : dashboard.recentOrders.isError ? (
                <TableErrorRows columns={7} error={dashboard.recentOrders.error} />
              ) : (
                recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-surface/50">
                    <td className="px-5 py-3">
                      <Link
                        to="/orders/$id"
                        params={{ id: o.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {o.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.createdDate ?? "-"}</td>
                    <td className="px-5 py-3">{o.products ?? "-"}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatMoney(o.totalAmount)}
                    </td>
                    <td className="px-5 py-3">
                      {o.status ? <StatusBadge status={o.status} /> : "-"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.requiredDate ?? "-"}</td>
                    <td className="px-5 py-3 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/orders/$id" params={{ id: o.id }}>
                          Details
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Low Stock Alerts"
        description="Products approaching or below reorder threshold"
      >
        {dashboard.lowStock.isPending && lowStock.length === 0 ? (
          <SectionBodySkeleton rows={3} />
        ) : dashboard.lowStock.isError ? (
          <SectionError error={dashboard.lowStock.error} />
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {lowStock.map((p) => (
              <div key={p.sku} className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">SKU {p.sku}</div>
                  </div>
                  {p.status ? <StatusBadge status={p.status} /> : "-"}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Available</div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums">{p.available}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Threshold</div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums">{p.threshold}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Reorder</div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums text-primary">
                      {p.reorder}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" asChild className="flex-1">
                    <Link to="/stock-requests/new">Request Stock</Link>
                  </Button>
                  <Button size="sm" variant="ghost">
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function AdminDashboard() {
  const dashboard = useAdminDashboard();
  const queries = [
    dashboard.metrics,
    dashboard.approvalWorkload,
    dashboard.recentActivity,
    dashboard.attention,
  ];

  if (shouldShowPageLoader(queries)) return <AdminDashboardSkeleton />;

  const metrics = dashboard.metrics.data ?? [];
  const workload = dashboard.approvalWorkload.data ?? [];
  const activity = dashboard.recentActivity.data ?? [];
  const attention = dashboard.attention.data ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description="Live view of approvals, verification queues, and SLA health across all customers."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Clock className="mr-1.5 h-4 w-4" />
              Last 7 days
            </Button>
            <Button size="sm">
              <TrendingUp className="mr-1.5 h-4 w-4" />
              Export Report
            </Button>
          </>
        }
      />

      {dashboard.metrics.isPending && metrics.length === 0 ? (
        <MetricsGridSkeleton />
      ) : dashboard.metrics.isError ? (
        <div className="rounded-xl border border-border bg-card">
          <SectionError error={dashboard.metrics.error} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => renderMetric(metric, adminMetricIcons))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Section
          title="Approval Workload"
          description="Open tasks grouped by approver role"
          className="xl:col-span-2"
        >
          {dashboard.approvalWorkload.isPending && workload.length === 0 ? (
            <SectionBodySkeleton rows={4} />
          ) : dashboard.approvalWorkload.isError ? (
            <SectionError error={dashboard.approvalWorkload.error} />
          ) : (
            <div className="space-y-4 p-5">
              {workload.map((r) => (
                <div key={r.role}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{r.role}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {r.count} / {r.cap} tasks
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(r.count / r.cap) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Recent Activity" description="Audit trail across modules">
          {dashboard.recentActivity.isPending && activity.length === 0 ? (
            <SectionBodySkeleton rows={5} />
          ) : dashboard.recentActivity.isError ? (
            <SectionError error={dashboard.recentActivity.error} />
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((a, index) => {
                const Icon = activityIcons[a.iconKey];
                return (
                  <li key={`${a.text}-${index}`} className="flex items-start gap-3 p-4">
                    <div
                      className={`mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-secondary ${a.tone}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{a.text}</div>
                      <div className="text-[11px] text-muted-foreground">{a.time}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <Section
        title="Orders Requiring Attention"
        description="Tasks nearing or breaching SLA"
        actions={
          <Button size="sm" asChild>
            <Link to="/approvals">Go to Approval Queue</Link>
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Order</th>
                <th className="px-5 py-3 text-left font-medium">Customer</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-left font-medium">Waiting</th>
                <th className="px-5 py-3 text-left font-medium">Current Step</th>
                <th className="px-5 py-3 text-left font-medium">Priority</th>
                <th className="px-5 py-3 text-left font-medium">SLA</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {dashboard.attention.isPending && attention.length === 0 ? (
                <TableLoadingRows columns={8} />
              ) : dashboard.attention.isError ? (
                <TableErrorRows columns={8} error={dashboard.attention.error} />
              ) : (
                attention.map((t) => (
                  <tr key={t.taskId} className="border-t border-border hover:bg-surface/50">
                    <td className="px-5 py-3">
                      <Link
                        to="/approvals/$id"
                        params={{ id: t.taskId }}
                        className="font-medium text-primary hover:underline"
                      >
                        {t.entity}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{t.customer}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatMoney(t.amount)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{t.waiting}</td>
                    <td className="px-5 py-3">{t.step}</td>
                    <td className="px-5 py-3">
                      {t.priority ? <StatusBadge status={t.priority} /> : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          t.sla === "Breached"
                            ? "font-medium text-destructive"
                            : t.sla === "Breach Risk"
                              ? "font-medium text-warning-foreground"
                              : "text-success"
                        }
                      >
                        {t.sla}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" asChild>
                        <Link to="/approvals/$id" params={{ id: t.taskId }}>
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
      </Section>
    </div>
  );
}
