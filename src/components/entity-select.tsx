import { useQuery } from "@tanstack/react-query";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import {
  branchRecords,
  branchesApi,
  organizationsApi,
  type BranchResponse,
  type OrganizationResponse,
} from "@/services/admin-api.service";

const entitySelectKeys = {
  organizations: ["entity-select", "organizations"] as const,
  branches: (organizationId?: string) =>
    ["entity-select", "branches", organizationId ?? "all"] as const,
};

type SharedProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  emptyLabel?: string;
};

export function OrganizationSelect({
  value,
  onValueChange,
  emptyLabel = "Select organization",
  className,
  disabled,
  organizationTypes,
  ...props
}: SharedProps & { organizationTypes?: OrganizationResponse["organizationType"][] }) {
  const query = useQuery({
    queryKey: entitySelectKeys.organizations,
    queryFn: async () => (await organizationsApi.list({ size: 100 })).data.content,
    staleTime: 60_000,
    retry: false,
  });

  return (
    <BaseSelect
      {...props}
      value={value}
      onValueChange={onValueChange}
      emptyLabel={query.isLoading ? "Loading organizations..." : emptyLabel}
      className={className}
      disabled={disabled || query.isLoading}
      hasError={query.isError}
    >
      {(query.data ?? [])
        .filter(
          (organization: OrganizationResponse) =>
            !organizationTypes?.length || organizationTypes.includes(organization.organizationType),
        )
        .map((organization: OrganizationResponse) => (
          <option key={organization.id} value={organization.id}>
            {organization.name} ({organization.organizationCode})
          </option>
        ))}
    </BaseSelect>
  );
}

export function BranchSelect({
  value,
  onValueChange,
  organizationId,
  emptyLabel = "Select branch",
  activeOnly = false,
  excludeBranchId,
  enabled = true,
  className,
  disabled,
  ...props
}: SharedProps & {
  organizationId?: string;
  activeOnly?: boolean;
  excludeBranchId?: string;
  enabled?: boolean;
}) {
  const query = useQuery({
    queryKey: entitySelectKeys.branches(organizationId),
    queryFn: async () =>
      branchRecords(
        (await branchesApi.list({ size: 100, organizationId: organizationId || undefined })).data,
      ),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
  const branches = (query.data ?? []).filter(
    (branch: BranchResponse) =>
      (!activeOnly || branch.status === "ACTIVE") && branch.id !== excludeBranchId,
  );

  return (
    <BaseSelect
      {...props}
      value={value}
      onValueChange={onValueChange}
      emptyLabel={query.isLoading ? "Loading branches..." : emptyLabel}
      className={className}
      disabled={disabled || !enabled || query.isLoading}
      hasError={query.isError}
    >
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name} ({branch.city || branch.branchCode})
        </option>
      ))}
    </BaseSelect>
  );
}

function BaseSelect({
  value,
  onValueChange,
  emptyLabel,
  hasError,
  className,
  children,
  ...props
}: SharedProps & { hasError: boolean }) {
  return (
    <select
      {...props}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
        hasError && "border-destructive",
        className,
      )}
    >
      <option value="">{hasError ? "Unable to load options" : emptyLabel}</option>
      {children}
    </select>
  );
}
