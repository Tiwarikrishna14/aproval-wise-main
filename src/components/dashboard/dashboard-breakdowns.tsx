import type { ReactNode } from "react";

import { canViewDashboardLevel } from "@/components/dashboard/dashboard-scope";
import { Section } from "@/components/page-parts";
import type { DashboardResponse } from "@/services/dashboard-api.service";

export function DashboardBreakdowns({ dashboard }: { dashboard: DashboardResponse }) {
  const showOrganizations =
    canViewDashboardLevel(dashboard, "organization") && dashboard.organizationBreakdown.length > 0;
  const showBranches =
    canViewDashboardLevel(dashboard, "branch") && dashboard.branchBreakdown.length > 0;
  if (!showOrganizations && !showBranches) return null;

  return (
    <div
      className={`grid items-start gap-6 ${showOrganizations && showBranches ? "xl:grid-cols-2" : ""}`}
    >
      {showOrganizations ? (
        <Section title="Organization Performance">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase text-muted-foreground">
                <tr>
                  <Header>Name</Header>
                  <Header>Code</Header>
                  <Header align="right">Branches</Header>
                  <Header align="right">Customers</Header>
                  <Header align="right">Orders</Header>
                </tr>
              </thead>
              <tbody>
                {dashboard.organizationBreakdown.map((item) => (
                  <tr key={item.id} className="border-t">
                    <Cell>{item.name}</Cell>
                    <Cell>{item.organization_code}</Cell>
                    <Cell align="right">{item.active_branch_count}</Cell>
                    <Cell align="right">{item.business_customer_count}</Cell>
                    <Cell align="right">{item.order_count}</Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
      {showBranches ? (
        <Section title="Branch Performance">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase text-muted-foreground">
                <tr>
                  <Header>Name</Header>
                  <Header>Code</Header>
                  <Header align="right">Customers</Header>
                  <Header align="right">Orders</Header>
                </tr>
              </thead>
              <tbody>
                {dashboard.branchBreakdown.map((item) => (
                  <tr key={item.id} className="border-t">
                    <Cell>{item.name}</Cell>
                    <Cell>{item.branch_code}</Cell>
                    <Cell align="right">{item.business_customer_count}</Cell>
                    <Cell align="right">{item.order_count}</Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Header({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Cell({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <td className={`px-4 py-3 tabular-nums ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </td>
  );
}
