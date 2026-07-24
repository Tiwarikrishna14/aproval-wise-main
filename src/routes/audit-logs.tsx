import { createFileRoute } from "@tanstack/react-router";
import { Download, Filter } from "lucide-react";

import { DataError, TableLoadingRows, TableMessageRow } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { useAuditLogs } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs - StockFlow B2B" }] }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const { data: auditLogs = [], isLoading, isError, error } = useAuditLogs();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Immutable log of every user action across the platform."
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              <Filter className="mr-1.5 h-4 w-4" />
              Filters
            </Button>
            <Button size="sm" disabled>
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
      />

      {isError ? (
        <DataError message={`Failed to load audit logs: ${error.message}`} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {[
                  "Date & Time",
                  "User",
                  "Role",
                  "Action",
                  "Module",
                  "Record",
                  "Old Value",
                  "New Value",
                  "IP",
                ].map((header) => (
                  <th key={header} className="px-4 py-3 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoadingRows columns={9} />
              ) : auditLogs.length === 0 ? (
                <TableMessageRow columns={9} message="No audit logs returned by backend." />
              ) : (
                auditLogs.map((log, index) => (
                  <tr key={log.id ?? index} className="border-t border-border hover:bg-surface/50">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {log.time ?? "-"}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.user ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.role ?? "-"}</td>
                    <td className="px-4 py-3">{log.action ?? "-"}</td>
                    <td className="px-4 py-3">{log.module ?? "-"}</td>
                    <td className="px-4 py-3 text-primary">{log.record ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.oldVal ?? "-"}</td>
                    <td className="px-4 py-3">{log.newVal ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {log.ip ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
