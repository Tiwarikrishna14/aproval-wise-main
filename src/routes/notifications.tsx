import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-parts";
import { notifications } from "@/lib/sample-data";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — StockFlow B2B" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Notifications" description="All alerts across orders, approvals, inventory and system events." actions={<><Button variant="outline" size="sm">Mark all as read</Button><Button size="sm" variant="ghost">Settings</Button></>} />
      <div className="rounded-xl border border-border bg-card">
        <Tabs defaultValue="All">
          <div className="border-b border-border px-3 pt-2">
            <TabsList className="h-10 bg-transparent gap-1">
              {["All", "Orders", "Approvals", "Inventory", "System"].map((t) => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-8 rounded-md text-[13px]">{t}</TabsTrigger>
              ))}
            </TabsList>
          </div>
          <ul className="divide-y divide-border">
            {notifications.map((n, i) => (
              <li key={i} className={`flex items-start gap-3 p-4 ${n.unread ? "bg-primary/5" : ""}`}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Bell className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.category} · {n.time}</div>
                </div>
                {n.unread && <span className="mt-2 h-2 w-2 rounded-full bg-primary" />}
              </li>
            ))}
          </ul>
        </Tabs>
      </div>
    </div>
  );
}
