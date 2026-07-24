import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { DataError } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications - StockFlow B2B" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: notifications = [], isLoading, isError, error } = useNotifications();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="All alerts across orders, approvals, inventory and system events."
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              Mark all as read
            </Button>
            <Button size="sm" variant="ghost" disabled>
              Settings
            </Button>
          </>
        }
      />

      {isError ? (
        <DataError message={`Failed to load notifications: ${error.message}`} />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Tabs defaultValue="All">
            <div className="border-b border-border px-3 pt-2">
              <TabsList className="h-10 bg-transparent gap-1">
                {["All", "Orders", "Approvals", "Inventory", "System"].map((tab) => (
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
            <ul className="divide-y divide-border">
              {isLoading ? (
                <li className="p-4 text-sm text-muted-foreground">Loading notifications...</li>
              ) : notifications.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">
                  No notifications returned by backend.
                </li>
              ) : (
                notifications.map((notification) => (
                  <li
                    key={notification.id ?? notification.title}
                    className={`flex items-start gap-3 p-4 ${
                      notification.unread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{notification.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {[notification.category, notification.time].filter(Boolean).join(" - ") ||
                          "-"}
                      </div>
                    </div>
                    {notification.unread && (
                      <span className="mt-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </li>
                ))
              )}
            </ul>
          </Tabs>
        </div>
      )}
    </div>
  );
}
