import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — StockFlow B2B" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Profile & Settings" description="Manage your personal details and notification preferences." />

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">RS</AvatarFallback></Avatar>
          <div>
            <div className="text-lg font-semibold">Rahul Sharma</div>
            <div className="text-sm text-muted-foreground">Customer Admin · Acme Retail Pvt. Ltd.</div>
          </div>
          <Button variant="outline" className="ml-auto">Change avatar</Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><label className="text-xs font-medium text-muted-foreground">Full name</label><input className="input" defaultValue="Rahul Sharma" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Email</label><input className="input" defaultValue="rahul@acmeretail.in" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Phone</label><input className="input" defaultValue="+91 98200 12345" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Timezone</label><select className="input"><option>Asia/Kolkata (IST)</option></select></div>
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline">Cancel</Button><Button>Save changes</Button></div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-sm font-semibold">Notification Preferences</div>
        <div className="mt-3 space-y-3 text-sm">
          {["Order status changes", "Approval requests", "Low stock alerts", "Weekly summary"].map((n) => (
            <label key={n} className="flex items-center justify-between rounded-md border border-border p-3">
              <span>{n}</span>
              <input type="checkbox" defaultChecked className="rounded border-border" />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
