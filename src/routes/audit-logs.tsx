import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-parts";
import { auditLogs } from "@/lib/sample-data";
import { Filter, Download } from "lucide-react";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — StockFlow B2B" }] }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Audit Logs" description="Immutable log of every user action across the platform." actions={<><Button variant="outline" size="sm"><Filter className="mr-1.5 h-4 w-4" />Filters</Button><Button size="sm"><Download className="mr-1.5 h-4 w-4" />Export CSV</Button></>} />
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {["Date & Time", "User", "Role", "Action", "Module", "Record", "Old Value", "New Value", "IP"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((l, i) => (
              <tr key={i} className="border-t border-border hover:bg-surface/50">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{l.time}</td>
                <td className="px-4 py-3 font-medium">{l.user}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.role}</td>
                <td className="px-4 py-3">{l.action}</td>
                <td className="px-4 py-3">{l.module}</td>
                <td className="px-4 py-3 text-primary">{l.record}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.oldVal}</td>
                <td className="px-4 py-3">{l.newVal}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
