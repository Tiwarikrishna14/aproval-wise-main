import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShoppingCart,
  ClipboardCheck,
  Truck,
  AlertTriangle,
  PackageX,
  Archive,
  Plus,
  ClipboardList,
  Boxes,
  Repeat,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Clock,
} from "lucide-react";
import { MetricCard, PageHeader, Section } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { orders, inventory, approvalQueue } from "@/lib/sample-data";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — StockFlow B2B" },
      { name: "description", content: "Overview of orders, approvals, and stock activity." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { role } = useRole();
  if (role === "admin" || role === "approver" || role === "verifier") return <AdminDashboard />;
  return <CustomerDashboard />;
}

function BarChart() {
  const data = [
    { m: "Feb", created: 42, approved: 36, delivered: 30 },
    { m: "Mar", created: 55, approved: 48, delivered: 44 },
    { m: "Apr", created: 61, approved: 52, delivered: 47 },
    { m: "May", created: 48, approved: 44, delivered: 40 },
    { m: "Jun", created: 72, approved: 65, delivered: 58 },
    { m: "Jul", created: 84, approved: 71, delivered: 60 },
  ];
  const max = 90;
  return (
    <div className="px-5 pb-5 pt-4">
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" /> Created</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-info" /> Approved</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-success" /> Delivered</span>
      </div>
      <div className="grid grid-cols-6 items-end gap-4 h-52">
        {data.map((d) => (
          <div key={d.m} className="flex flex-col items-center gap-2">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div className="w-2.5 rounded-t bg-primary/80" style={{ height: `${(d.created / max) * 100}%` }} />
              <div className="w-2.5 rounded-t bg-info/80" style={{ height: `${(d.approved / max) * 100}%` }} />
              <div className="w-2.5 rounded-t bg-success/80" style={{ height: `${(d.delivered / max) * 100}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground">{d.m}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerDashboard() {
  const lowStock = inventory.filter((i) => i.status === "Low Stock").slice(0, 3);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-primary">Customer Portal</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Good morning, Rahul</h2>
            <p className="mt-1 text-sm text-muted-foreground">Here is an overview of your orders and stock activity.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/orders/new"><Plus className="mr-1.5 h-4 w-4" /> Create Order</Link></Button>
            <Button variant="outline" asChild><Link to="/stock-requests/new"><ClipboardList className="mr-1.5 h-4 w-4" /> Request Stock</Link></Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={ShoppingCart} label="Active Orders" value={12} trend="+2 this week" tone="default" />
        <MetricCard icon={ClipboardCheck} label="Awaiting Approval" value={4} trend="Avg 6h" tone="warning" />
        <MetricCard icon={Truck} label="In Transit" value={3} trend="Delivery Fri" tone="info" />
        <MetricCard icon={AlertTriangle} label="Low Stock Items" value={7} trend="Reorder soon" tone="warning" />
        <MetricCard icon={PackageX} label="Pending Stock Requests" value={5} trend="+1 today" tone="destructive" />
        <MetricCard icon={Archive} label="Archived Items" value={18} trend="Last 30d" tone="default" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Order Overview" description="Orders created, approved, and delivered — last 6 months" className="xl:col-span-2">
          <BarChart />
        </Section>
        <Section title="Quick Actions">
          <div className="grid grid-cols-1 gap-2 p-4">
            {[
              { icon: Plus, label: "Create New Order", to: "/orders/new" },
              { icon: ClipboardList, label: "Request Stock", to: "/stock-requests/new" },
              { icon: Boxes, label: "View Inventory", to: "/inventory" },
              { icon: Repeat, label: "Reorder Previous Order", to: "/orders" },
            ].map((a) => (
              <Link key={a.label} to={a.to} className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition">
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
        actions={<Button variant="outline" size="sm" asChild><Link to="/orders">View all</Link></Button>}
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
              {orders.slice(0, 5).map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-surface/50">
                  <td className="px-5 py-3">
                    <Link to="/orders/$id" params={{ id: o.id }} className="font-medium text-primary hover:underline">{o.id}</Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{o.createdDate}</td>
                  <td className="px-5 py-3">{o.products}</td>
                  <td className="px-5 py-3 text-right tabular-nums">₹{o.totalAmount.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-muted-foreground">{o.requiredDate}</td>
                  <td className="px-5 py-3 text-right">
                    <Button asChild size="sm" variant="ghost"><Link to="/orders/$id" params={{ id: o.id }}>Details</Link></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Low Stock Alerts" description="Products approaching or below reorder threshold">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {lowStock.map((p) => (
            <div key={p.sku} className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">SKU {p.sku}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><div className="text-muted-foreground">Available</div><div className="mt-0.5 text-sm font-semibold tabular-nums">{p.available}</div></div>
                <div><div className="text-muted-foreground">Threshold</div><div className="mt-0.5 text-sm font-semibold tabular-nums">{p.threshold}</div></div>
                <div><div className="text-muted-foreground">Reorder</div><div className="mt-0.5 text-sm font-semibold tabular-nums text-primary">{p.reorder}</div></div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" asChild className="flex-1"><Link to="/stock-requests/new">Request Stock</Link></Button>
                <Button size="sm" variant="ghost">Dismiss</Button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description="Live view of approvals, verification queues, and SLA health across all customers."
        actions={<>
          <Button variant="outline" size="sm"><Clock className="mr-1.5 h-4 w-4" />Last 7 days</Button>
          <Button size="sm"><TrendingUp className="mr-1.5 h-4 w-4" />Export Report</Button>
        </>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={ShoppingCart} label="Orders Pending Review" value={18} trend="+5 today" tone="info" />
        <MetricCard icon={ClipboardCheck} label="Approval Tasks" value={26} trend="8 assigned" tone="default" />
        <MetricCard icon={Boxes} label="Stock Verification Pending" value={12} trend="Avg 4h" tone="warning" />
        <MetricCard icon={ClipboardList} label="Customer Stock Requests" value={15} trend="+3 today" tone="default" />
        <MetricCard icon={Repeat} label="Returns Pending" value={6} trend="2 escalated" tone="warning" />
        <MetricCard icon={AlertTriangle} label="SLA Breaches" value={3} trend="Action required" tone="destructive" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Approval Workload" description="Open tasks grouped by approver role" className="xl:col-span-2">
          <div className="p-5 space-y-4">
            {[
              { role: "Order Reviewer", count: 12, cap: 20 },
              { role: "Stock Verifier", count: 8, cap: 15 },
              { role: "Finance Approver", count: 4, cap: 10 },
              { role: "Final Approver", count: 2, cap: 8 },
            ].map((r) => (
              <div key={r.role}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{r.role}</span>
                  <span className="tabular-nums text-muted-foreground">{r.count} / {r.cap} tasks</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(r.count / r.cap) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Recent Activity" description="Audit trail across modules">
          <ul className="divide-y divide-border">
            {[
              { icon: CheckCircle2, tone: "text-success", text: "Priya approved ORD-2026-1047", time: "2m ago" },
              { icon: Boxes, tone: "text-info", text: "Amit adjusted stock: TPR-80MM", time: "18m ago" },
              { icon: PackageX, tone: "text-destructive", text: "SR-2026-030 rejected by Neha", time: "1h ago" },
              { icon: ShoppingCart, tone: "text-primary", text: "New customer: Prime Logistics", time: "3h ago" },
              { icon: ClipboardCheck, tone: "text-warning-foreground", text: "Workflow updated: High Value Approval", time: "Yesterday" },
            ].map((a, i) => (
              <li key={i} className="flex items-start gap-3 p-4">
                <div className={`mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-secondary ${a.tone}`}>
                  <a.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{a.text}</div>
                  <div className="text-[11px] text-muted-foreground">{a.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section
        title="Orders Requiring Attention"
        description="Tasks nearing or breaching SLA"
        actions={<Button size="sm" asChild><Link to="/approvals">Go to Approval Queue</Link></Button>}
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
              {approvalQueue.map((t) => (
                <tr key={t.taskId} className="border-t border-border hover:bg-surface/50">
                  <td className="px-5 py-3">
                    <Link to="/approvals/$id" params={{ id: t.taskId }} className="font-medium text-primary hover:underline">{t.entity}</Link>
                  </td>
                  <td className="px-5 py-3">{t.customer}</td>
                  <td className="px-5 py-3 text-right tabular-nums">₹{t.amount.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3 text-muted-foreground">{t.waiting}</td>
                  <td className="px-5 py-3">{t.step}</td>
                  <td className="px-5 py-3"><StatusBadge status={t.priority} /></td>
                  <td className="px-5 py-3">
                    <span className={t.sla === "Breached" ? "text-destructive font-medium" : t.sla === "Breach Risk" ? "text-warning-foreground font-medium" : "text-success"}>
                      {t.sla}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" asChild><Link to="/approvals/$id" params={{ id: t.taskId }}>Review</Link></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
