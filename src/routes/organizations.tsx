import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { organizationsApi, type CreateOrganizationRequest } from "@/services/admin-api.service";

const queryKey = ["admin", "parent-organizations"] as const;
type OrganizationForm = { organizationCode: string; name: string; email: string; phone: string };
const emptyForm: OrganizationForm = { organizationCode: "", name: "", email: "", phone: "" };

export const Route = createFileRoute("/organizations")({
  head: () => ({ meta: [{ title: "Organizations - StockFlow B2B" }] }),
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OrganizationForm>(emptyForm);
  const canView = hasPermission(user, "ORGANIZATION_VIEW");
  const canCreate = isSuperAdmin(user) && hasPermission(user, "ORGANIZATION_CREATE");
  const organizationsQuery = useQuery({
    queryKey,
    queryFn: async () => (await organizationsApi.list({ size: 100 })).data.content.filter((item) => item.organizationType === "PARENT"),
    enabled: canView || canCreate,
    retry: false,
    staleTime: 60 * 1000,
  });
  const createOrganization = useMutation({
    mutationFn: (body: CreateOrganizationRequest) => organizationsApi.create(body),
    onSuccess: async () => {
      setOpen(false);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;
    createOrganization.mutate({
      organizationCode: form.organizationCode.trim(),
      name: form.name.trim(),
      organizationType: "PARENT",
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
    });
  }

  if (!canView && !canCreate) return <div className="mx-auto max-w-[1400px] rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Organization access requires ORGANIZATION_VIEW.</div>;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="Parent Organizations" description="Create the top-level organization before adding branches, customers, and users." actions={canCreate ? <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />New Organization</Button> : null} />
      {organizationsQuery.isError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Could not load organizations from the backend.</div> : <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-sm"><thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground"><tr>{["Organization", "Code", "Email", "Phone", "Status", "Created"].map((header) => <th key={header} className="px-4 py-3 text-left font-medium">{header}</th>)}</tr></thead><tbody>{organizationsQuery.isLoading ? <LoadingRows columns={6} /> : organizationsQuery.data?.length ? organizationsQuery.data.map((organization) => <tr key={organization.id} className="border-t border-border hover:bg-surface/50"><td className="px-4 py-3"><div className="flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-primary" />{organization.name}</div></td><td className="px-4 py-3 text-muted-foreground">{organization.organizationCode}</td><td className="px-4 py-3 text-muted-foreground">{organization.email || "-"}</td><td className="px-4 py-3 text-muted-foreground">{organization.phone || "-"}</td><td className="px-4 py-3"><StatusBadge status={organization.status === "ACTIVE" ? "Approved" : "Cancelled"} /></td><td className="px-4 py-3 text-muted-foreground">{formatDate(organization.createdAt)}</td></tr>) : <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No parent organizations created yet.</td></tr>}</tbody></table></div>}

      <Dialog open={open && canCreate} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create Parent Organization</DialogTitle><DialogDescription>After creating the organization, create its organization admin and branches.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><Field label="Organization Code" id="organization-code"><Input id="organization-code" value={form.organizationCode} onChange={(event) => setForm({ ...form, organizationCode: event.target.value })} placeholder="AKRIBIZ" required /></Field><Field label="Organization Name" id="organization-name"><Input id="organization-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Akribiz" required /></Field><Field label="Email" id="organization-email"><Input id="organization-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label="Phone" id="organization-phone"><Input id="organization-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field></div>{createOrganization.isError ? <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createOrganization.error.message}</div> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={createOrganization.isPending}>{createOrganization.isPending ? "Creating..." : "Create Organization"}</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}</div>; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "-"; }
function LoadingRows({ columns }: { columns: number }) { return Array.from({ length: 6 }).map((_, rowIndex) => <tr key={rowIndex} className="border-t border-border">{Array.from({ length: columns }).map((__, columnIndex) => <td key={columnIndex} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}</tr>); }
