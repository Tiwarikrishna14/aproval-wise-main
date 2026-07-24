import { createFileRoute } from "@tanstack/react-router";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { DataError, EmptyState } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useWorkflows } from "@/hooks/use-domain-data";
import type { Workflow, WorkflowStep } from "@/lib/domain-types";

export const Route = createFileRoute("/workflows")({
  head: () => ({ meta: [{ title: "Approval Workflows - StockFlow B2B" }] }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: workflows = [], isLoading, isError, error } = useWorkflows();
  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === selectedId) ?? workflows[0] ?? null;
  const steps = getWorkflowSteps(selectedWorkflow);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Approval Workflows"
        description="Configure multi-step approval flows per module and customer."
        actions={
          <Button disabled>
            <Plus className="mr-1.5 h-4 w-4" />
            New Workflow
          </Button>
        }
      />

      {isError ? (
        <DataError message={`Failed to load workflows: ${error.message}`} />
      ) : isLoading ? (
        <EmptyState message="Loading workflows from backend..." />
      ) : workflows.length === 0 ? (
        <EmptyState message="No workflows returned by backend." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3 text-sm font-semibold">Workflows</div>
            <ul className="divide-y divide-border">
              {workflows.map((workflow) => (
                <li
                  key={workflow.id ?? workflow.name}
                  className={`cursor-pointer p-4 ${
                    selectedWorkflow?.id === workflow.id ? "bg-primary/5" : "hover:bg-surface/50"
                  }`}
                  onClick={() => setSelectedId(workflow.id ?? null)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{workflow.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {[workflow.module, workflow.customer, formatStepCount(workflow.steps)]
                          .filter(Boolean)
                          .join(" - ")}
                      </div>
                    </div>
                    {workflow.status && <StatusBadge status={workflow.status} />}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <div className="text-[15px] font-semibold">{selectedWorkflow?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[selectedWorkflow?.module, selectedWorkflow?.customer, selectedWorkflow?.updated]
                    .filter(Boolean)
                    .join(" - ")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Add Condition
                </Button>
                <Button size="sm" disabled>
                  Activate Workflow
                </Button>
              </div>
            </div>
            <ol className="p-6 space-y-3">
              {steps.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  No workflow steps returned by backend.
                </li>
              ) : (
                steps.map((step, index) => (
                  <li
                    key={`${step.name}-${index}`}
                    className="rounded-lg border border-border bg-surface/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <GripVertical className="mt-1 h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Step {step.n ?? index + 1}
                          </div>
                          <div className="text-sm font-semibold">{step.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {[step.role, step.type, step.sla ? `SLA ${step.sla}` : undefined]
                              .filter(Boolean)
                              .join(" - ")}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" disabled>
                          Edit
                        </Button>
                        <Button size="icon" variant="ghost" disabled>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))
              )}
              <Button variant="outline" className="w-full" disabled>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Step
              </Button>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function getWorkflowSteps(workflow: Workflow | null): WorkflowStep[] {
  if (!workflow || !Array.isArray(workflow.steps)) return [];
  return workflow.steps;
}

function formatStepCount(steps: Workflow["steps"]) {
  if (Array.isArray(steps)) return `${steps.length} steps`;
  if (typeof steps === "number") return `${steps} steps`;
  return undefined;
}
