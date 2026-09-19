import { Link } from "@tanstack/react-router";

import { formatMoney } from "@/components/dashboard/dashboard-overview";
import { canViewDashboardLevel } from "@/components/dashboard/dashboard-scope";
import { Section } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { DashboardResponse } from "@/services/dashboard-api.service";

export function DashboardRankings({ dashboard }: { dashboard: DashboardResponse }) {
  const showTopCustomers = canViewDashboardLevel(dashboard, "branch");

  return (
    <>
      <div className={`grid gap-6 ${showTopCustomers ? "xl:grid-cols-2" : ""}`}>
        {showTopCustomers ? (
          <Section title="Top Customers" description="Highest order activity and value">
            <RankedList
              empty="No customer activity in this period."
              items={dashboard.topCustomers.map((item) => ({
                id: item.id,
                label: item.name,
                detail: `${item.order_count} orders`,
                value: formatMoney(item.order_value),
              }))}
            />
          </Section>
        ) : null}
        <Section title="Popular Order Locations" description="Most-used delivery locations">
          <RankedList
            empty="No location activity in this period."
            items={dashboard.topOrderLocations.map((item) => ({
              id: item.name,
              label: item.name,
              detail: "Orders",
              value: item.order_count.toLocaleString("en-IN"),
            }))}
          />
        </Section>
      </div>
      <Section title="Highest-value Orders" description="Largest orders in the selected period">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Order</th>
                <th className="px-5 py-3 text-left font-medium">Customer</th>
                <th className="px-5 py-3 text-left font-medium">Created</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Value</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {dashboard.topOrders.length ? (
                dashboard.topOrders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-surface/50">
                    <td className="px-5 py-3 font-medium">{order.order_number}</td>
                    <td className="px-5 py-3">{order.business_customer_name || "-"}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {formatMoney(order.total_amount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/orders/$id" params={{ id: order.id }}>
                          Details
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    No orders in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function RankedList({
  items,
  empty,
}: {
  items: Array<{ id: string; label: string; detail: string; value: string | number }>;
  empty: string;
}) {
  if (!items.length) return <div className="p-5 text-sm text-muted-foreground">{empty}</div>;
  return (
    <ol className="divide-y divide-border">
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3 px-5 py-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{item.label}</div>
            <div className="text-xs text-muted-foreground">{item.detail}</div>
          </div>
          <div className="font-semibold tabular-nums">{item.value}</div>
        </li>
      ))}
    </ol>
  );
}

function formatDate(value: string) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value),
      )
    : "-";
}
