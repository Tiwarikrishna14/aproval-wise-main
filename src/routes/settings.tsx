import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import {
  organizationsApi,
  usersApi,
  type OrganizationResponse,
  type UpdateOrganizationRequest,
  type UpdateUserRequest,
  type UserResponse,
} from "@/services/admin-api.service";
import type { AuthUser } from "@/services/auth.service";

const organizationTypes = ["PARENT", "SYSTEM", "CUSTOMER", "SUPPLIER"] as const;

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type OrganizationForm = {
  name: string;
  organizationType: OrganizationResponse["organizationType"];
  email: string;
  phone: string;
};

const emptyProfileForm: ProfileForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

const emptyOrganizationForm: OrganizationForm = {
  name: "",
  organizationType: "CUSTOMER",
  email: "",
  phone: "",
};

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings - StockFlow B2B" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, refreshSession } = useAuth();
  const userId = user?.id ?? "";
  const organizationId = user?.organizationId ?? "";
  const canViewUser = hasPermission(user, "USER_VIEW") || hasPermission(user, "USER_UPDATE");
  const canUpdateUser = hasPermission(user, "USER_UPDATE");
  const canViewOrganization =
    hasPermission(user, "ORGANIZATION_VIEW") || hasPermission(user, "ORGANIZATION_UPDATE");
  const canUpdateOrganization = hasPermission(user, "ORGANIZATION_UPDATE");
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [organizationForm, setOrganizationForm] = useState<OrganizationForm>(emptyOrganizationForm);

  const profileQuery = useQuery({
    queryKey: ["settings", "user", userId],
    queryFn: async () => (await usersApi.get(userId)).data,
    enabled: Boolean(userId && canViewUser),
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const organizationQuery = useQuery({
    queryKey: ["settings", "organization", organizationId],
    queryFn: async () => (await organizationsApi.get(organizationId)).data,
    enabled: Boolean(organizationId && canViewOrganization),
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const profile = profileQuery.data;
  const organization = organizationQuery.data;

  useEffect(() => {
    setProfileForm(profileFormFromUser(profile, user));
  }, [profile, user]);

  useEffect(() => {
    if (!organization) return;

    setOrganizationForm({
      name: organization.name,
      organizationType: organization.organizationType,
      email: organization.email ?? "",
      phone: organization.phone ?? "",
    });
  }, [organization]);

  const updateProfile = useMutation({
    mutationFn: (body: UpdateUserRequest) => usersApi.update(userId, body),
    onSuccess: async (response) => {
      queryClient.setQueryData(["settings", "user", userId], response.data);
      mergeUpdatedUser(queryClient, response.data);
      await refreshSession();
    },
  });

  const updateOrganization = useMutation({
    mutationFn: (body: UpdateOrganizationRequest) => organizationsApi.update(organizationId, body),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "organization", organizationId], response.data);
      mergeUpdatedOrganization(queryClient, response.data);
    },
  });

  function updateProfileField(field: keyof ProfileForm, value: string) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function updateOrganizationField(field: keyof OrganizationForm, value: string) {
    setOrganizationForm((current) => ({ ...current, [field]: value }));
  }

  function resetProfileForm() {
    updateProfile.reset();
    setProfileForm(profileFormFromUser(profile, user));
  }

  function resetOrganizationForm() {
    updateOrganization.reset();
    if (!organization) return;

    setOrganizationForm({
      name: organization.name,
      organizationType: organization.organizationType,
      email: organization.email ?? "",
      phone: organization.phone ?? "",
    });
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpdateUser || !userId) return;

    updateProfile.mutate({
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      email: profileForm.email.trim() || undefined,
      phone: profileForm.phone.trim() || undefined,
    });
  }

  function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpdateOrganization || !organizationId) return;

    updateOrganization.mutate({
      name: organizationForm.name.trim(),
      organizationType: organizationForm.organizationType,
      email: organizationForm.email.trim() || undefined,
      phone: organizationForm.phone.trim() || undefined,
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Profile & Settings"
        description="Manage your personal details and organization profile."
      />

      <form className="rounded-xl border border-border bg-card p-6" onSubmit={submitProfile}>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
              {user?.initials ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-lg font-semibold">{user?.name ?? "User"}</div>
            <div className="text-sm text-muted-foreground">
              {[user?.role, user?.organizationId].filter(Boolean).join(" - ") || "Profile"}
            </div>
          </div>
          <Button variant="outline" className="ml-auto" disabled>
            Change avatar
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="profile-first-name">
            <Input
              id="profile-first-name"
              value={profileForm.firstName}
              onChange={(event) => updateProfileField("firstName", event.target.value)}
              readOnly={!canUpdateUser}
              disabled={updateProfile.isPending}
              required
            />
          </Field>
          <Field label="Last name" htmlFor="profile-last-name">
            <Input
              id="profile-last-name"
              value={profileForm.lastName}
              onChange={(event) => updateProfileField("lastName", event.target.value)}
              readOnly={!canUpdateUser}
              disabled={updateProfile.isPending}
              required
            />
          </Field>
          <Field label="Email" htmlFor="profile-email">
            <Input
              id="profile-email"
              type="email"
              value={profileForm.email}
              onChange={(event) => updateProfileField("email", event.target.value)}
              readOnly={!canUpdateUser}
              disabled={updateProfile.isPending}
            />
          </Field>
          <Field label="Phone" htmlFor="profile-phone">
            <Input
              id="profile-phone"
              value={profileForm.phone}
              onChange={(event) => updateProfileField("phone", event.target.value)}
              readOnly={!canUpdateUser}
              disabled={updateProfile.isPending}
            />
          </Field>
          <ReadOnlyField label="Role" value={user?.role ?? ""} />
          <ReadOnlyField label="Organization ID" value={organizationId} />
          <ReadOnlyField label="Branch ID" value={user?.branchId || "Organization-wide"} />
        </div>

        {!canUpdateUser ? (
          <div className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
            Updating user details requires USER_UPDATE.
          </div>
        ) : null}
        {profileQuery.isError ? (
          <div className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Could not load full user details from the backend. You can still edit available auth
            details.
          </div>
        ) : null}
        {updateProfile.isError ? (
          <div className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {updateProfile.error.message}
          </div>
        ) : null}
        {updateProfile.isSuccess ? (
          <div className="mt-4 rounded-md border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">
            User details updated.
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetProfileForm}
            disabled={!canUpdateUser || updateProfile.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              !canUpdateUser ||
              updateProfile.isPending ||
              !profileForm.firstName.trim() ||
              !profileForm.lastName.trim()
            }
          >
            {updateProfile.isPending ? "Saving..." : "Save user"}
          </Button>
        </div>
      </form>

      <form className="rounded-xl border border-border bg-card p-6" onSubmit={submitOrganization}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Organization Details</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Details for the organization linked to your login.
            </div>
          </div>
          {organization?.status ? <StatusBadge status={organization.status} /> : null}
        </div>

        {!organizationId ? (
          <div className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
            No organization is assigned to this account.
          </div>
        ) : !canViewOrganization ? (
          <div className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
            Viewing organization details requires ORGANIZATION_VIEW.
          </div>
        ) : organizationQuery.isLoading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : organizationQuery.isError ? (
          <div className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Could not load organization details from the backend.
          </div>
        ) : organization ? (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Organization name" htmlFor="organization-name">
                <Input
                  id="organization-name"
                  value={organizationForm.name}
                  onChange={(event) => updateOrganizationField("name", event.target.value)}
                  readOnly={!canUpdateOrganization}
                  disabled={updateOrganization.isPending}
                  required
                />
              </Field>
              <ReadOnlyField label="Organization code" value={organization.organizationCode} />
              <Field label="Type" htmlFor="organization-type">
                <select
                  id="organization-type"
                  className="input"
                  value={organizationForm.organizationType}
                  onChange={(event) =>
                    updateOrganizationField("organizationType", event.target.value)
                  }
                  disabled={!canUpdateOrganization || updateOrganization.isPending}
                >
                  {organizationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Email" htmlFor="organization-email">
                <Input
                  id="organization-email"
                  type="email"
                  value={organizationForm.email}
                  onChange={(event) => updateOrganizationField("email", event.target.value)}
                  readOnly={!canUpdateOrganization}
                  disabled={updateOrganization.isPending}
                />
              </Field>
              <Field label="Phone" htmlFor="organization-phone">
                <Input
                  id="organization-phone"
                  value={organizationForm.phone}
                  onChange={(event) => updateOrganizationField("phone", event.target.value)}
                  readOnly={!canUpdateOrganization}
                  disabled={updateOrganization.isPending}
                />
              </Field>
              <ReadOnlyField
                label="Last updated"
                value={formatDate(organization.updatedAt || organization.createdAt)}
              />
            </div>

            {!canUpdateOrganization ? (
              <div className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
                Updating organization details requires ORGANIZATION_UPDATE.
              </div>
            ) : null}
            {updateOrganization.isError ? (
              <div className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {updateOrganization.error.message}
              </div>
            ) : null}
            {updateOrganization.isSuccess ? (
              <div className="mt-4 rounded-md border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">
                Organization details updated.
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetOrganizationForm}
                disabled={!canUpdateOrganization || updateOrganization.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !canUpdateOrganization ||
                  updateOrganization.isPending ||
                  !organizationForm.name.trim()
                }
              >
                {updateOrganization.isPending ? "Saving..." : "Save organization"}
              </Button>
            </div>
          </>
        ) : null}
      </form>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-sm font-semibold">Notification Preferences</div>
        <div className="mt-3 text-sm text-muted-foreground">
          Notification preference APIs are not available in the current backend documentation.
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input className="input" value={value || "-"} readOnly />
    </div>
  );
}

function profileFormFromUser(profile: UserResponse | undefined, user: AuthUser | null) {
  if (profile) {
    return {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
    };
  }

  if (!user) return emptyProfileForm;

  const [firstName = "", ...lastNameParts] = user.name.trim().split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(" "),
    email: user.email,
    phone: "",
  };
}

function mergeUpdatedUser(
  queryClient: ReturnType<typeof useQueryClient>,
  updatedUser: UserResponse,
) {
  queryClient.setQueryData<UserResponse[]>(["admin", "users"], (current = []) =>
    current.map((record) => (record.id === updatedUser.id ? updatedUser : record)),
  );
}

function mergeUpdatedOrganization(
  queryClient: ReturnType<typeof useQueryClient>,
  updatedOrganization: OrganizationResponse,
) {
  const updateList = (current: OrganizationResponse[] = []) =>
    current.map((organization) =>
      organization.id === updatedOrganization.id ? updatedOrganization : organization,
    );

  queryClient.setQueryData<OrganizationResponse[]>(["admin", "organizations"], updateList);
  queryClient.setQueryData<OrganizationResponse[]>(["admin", "users", "organizations"], updateList);
}

function formatDate(value?: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
