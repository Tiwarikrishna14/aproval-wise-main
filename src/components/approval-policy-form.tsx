import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  businessCustomersApi,
  rolesApi,
  type ApprovalLevelPolicy,
  type OrderApprovalPolicy,
} from "@/services/admin-api.service";

const defaultRoles = ["MID_APPROVER", "FINAL_APPROVER", "ORDER_APPROVER"];
const emptyPolicy: OrderApprovalPolicy = {
  approvalMode: "SEQUENTIAL",
  selfApprovalAllowed: false,
  levels: [{ levelNumber: 1, minimumApprovers: 1, completionRule: "ALL", eligibleRoles: [] }],
};

export function ApprovalPolicyForm({
  customerId,
  canEdit,
}: {
  customerId: string;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [policy, setPolicy] = useState<OrderApprovalPolicy>(emptyPolicy);
  const [errors, setErrors] = useState<string[]>([]);
  const policyQuery = useQuery({
    queryKey: ["approval-policy", customerId],
    queryFn: async () => (await businessCustomersApi.getApprovalPolicy(customerId)).data,
    enabled: Boolean(customerId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const rolesQuery = useQuery({
    queryKey: ["approval-policy", "roles"],
    queryFn: async () => (await rolesApi.assignable()).data,
    enabled: canEdit,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (policyQuery.data) setPolicy(normalizePolicy(policyQuery.data));
  }, [policyQuery.data]);

  const savePolicy = useMutation({
    mutationFn: (body: OrderApprovalPolicy) =>
      businessCustomersApi.updateApprovalPolicy(customerId, body),
    onSuccess: async (response) => {
      setPolicy(normalizePolicy(response.data));
      setErrors([]);
      toast.success("Approval policy saved successfully");
      await queryClient.invalidateQueries({ queryKey: ["approval-policy", customerId] });
    },
    onError: (error) => toast.error(error.message),
  });
  const roleOptions = Array.from(
    new Set([
      ...defaultRoles,
      ...(rolesQuery.data ?? [])
        .map((role) => role.name.toUpperCase())
        .filter((name) => name.includes("APPROVER")),
    ]),
  );

  function updateLevel(index: number, next: Partial<ApprovalLevelPolicy>) {
    setPolicy((current) => ({
      ...current,
      levels: current.levels.map((level, levelIndex) =>
        levelIndex === index ? { ...level, ...next } : level,
      ),
    }));
  }

  function toggleRole(index: number, role: string) {
    const selected = policy.levels[index].eligibleRoles ?? [];
    updateLevel(index, {
      eligibleRoles: selected.includes(role)
        ? selected.filter((item) => item !== role)
        : [...selected, role],
    });
  }

  function addLevel() {
    setPolicy((current) => ({
      ...current,
      levels: [
        ...current.levels,
        {
          levelNumber: current.levels.length + 1,
          minimumApprovers: 1,
          completionRule: "ALL",
          eligibleRoles: [],
        },
      ],
    }));
  }

  function removeLevel(index: number) {
    setPolicy((current) => ({
      ...current,
      levels: current.levels
        .filter((_, levelIndex) => levelIndex !== index)
        .map((level, levelIndex) => ({ ...level, levelNumber: levelIndex + 1 })),
    }));
  }

  function submit() {
    const normalized = normalizePolicy(policy);
    const nextErrors = validatePolicy(normalized);
    setErrors(nextErrors);
    if (!nextErrors.length) savePolicy.mutate(normalized);
  }

  if (policyQuery.isLoading)
    return <p className="text-sm text-muted-foreground">Loading policy...</p>;
  if (policyQuery.isError && !canEdit) {
    return <p className="text-sm text-destructive">{policyQuery.error.message}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="approval-mode">Approval Mode</Label>
          <select
            id="approval-mode"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={policy.approvalMode}
            disabled={!canEdit}
            onChange={(event) =>
              setPolicy((current) => ({
                ...current,
                approvalMode: event.target.value as OrderApprovalPolicy["approvalMode"],
              }))
            }
          >
            <option value="SEQUENTIAL">Sequential</option>
            <option value="PARALLEL">Parallel</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {policy.approvalMode === "SEQUENTIAL"
              ? "Each level starts after the previous level is complete."
              : "All levels can act independently."}
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
          <Checkbox
            checked={policy.selfApprovalAllowed}
            disabled={!canEdit}
            onCheckedChange={(checked) =>
              setPolicy((current) => ({ ...current, selfApprovalAllowed: checked === true }))
            }
          />
          Allow order creator to approve their own order
        </label>
      </div>

      <div className="space-y-3">
        {policy.levels.map((level, index) => (
          <div key={level.levelNumber} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-medium">Level {level.levelNumber}</div>
              {canEdit ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => removeLevel(index)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Remove
                </Button>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`minimum-approvers-${index}`}>Minimum Approvers</Label>
                <Input
                  id={`minimum-approvers-${index}`}
                  type="number"
                  min={1}
                  value={level.minimumApprovers}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateLevel(index, { minimumApprovers: Number(event.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`completion-rule-${index}`}>Completion Rule</Label>
                <select
                  id={`completion-rule-${index}`}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={level.completionRule}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateLevel(index, {
                      completionRule: event.target.value as ApprovalLevelPolicy["completionRule"],
                    })
                  }
                >
                  <option value="ALL">ALL — every assigned approver</option>
                  <option value="ANY">ANY — one approval completes the level</option>
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Eligible Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                  >
                    <Checkbox
                      checked={(level.eligibleRoles ?? []).includes(role)}
                      disabled={!canEdit}
                      onCheckedChange={() => toggleRole(index, role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Empty selection allows any active user with ORDER_APPROVE permission.
              </p>
            </div>
          </div>
        ))}
      </div>

      {errors.length ? (
        <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      ) : null}
      {policyQuery.isError && canEdit ? (
        <p className="text-sm text-muted-foreground">
          No saved policy was loaded. Configure and save one below.
        </p>
      ) : null}
      {canEdit ? (
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={addLevel}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Approval Level
          </Button>
          <Button type="button" disabled={savePolicy.isPending} onClick={submit}>
            {savePolicy.isPending ? "Saving..." : "Save Policy"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function normalizePolicy(policy: OrderApprovalPolicy): OrderApprovalPolicy {
  return {
    ...policy,
    levels: (policy.levels ?? []).map((level, index) => ({
      ...level,
      levelNumber: index + 1,
      eligibleRoles: level.eligibleRoles ?? [],
    })),
  };
}

function validatePolicy(policy: OrderApprovalPolicy) {
  const errors: string[] = [];
  if (!policy.approvalMode) errors.push("Approval mode is required");
  if (!policy.levels.length) errors.push("At least one approval level is required");
  policy.levels.forEach((level, index) => {
    if (level.levelNumber !== index + 1)
      errors.push("Approval levels must start from 1 and be continuous");
    if (level.minimumApprovers < 1)
      errors.push(`Level ${level.levelNumber} requires at least one approver`);
    if (!level.completionRule)
      errors.push(`Completion rule is required for level ${level.levelNumber}`);
  });
  return errors;
}
