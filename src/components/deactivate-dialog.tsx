import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { DeleteValidationResponse } from "@/services/admin-api.service";

const countLabels: Record<string, string> = {
  users: "Users",
  branches: "Branches",
  businessCustomers: "Business customers",
  products: "Products",
  notDeliveredOrders: "Not delivered orders",
};

export function DeactivateDialog({
  open,
  entityName,
  validation,
  validating,
  deactivating,
  error,
  extraWarning,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  entityName: string;
  validation?: DeleteValidationResponse | null;
  validating: boolean;
  deactivating: boolean;
  error?: string;
  extraWarning?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const counts = Object.entries(validation?.counts ?? {}).filter(([, value]) => Number(value) > 0);
  const hasWarnings = Boolean(validation?.hasWarnings);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasWarnings ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : null}
            Deactivate {entityName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {validating
              ? "Checking mapped records..."
              : validation?.message ||
                `This will mark ${entityName} as inactive. You can cancel before confirming.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!validating && hasWarnings ? (
          <div className="space-y-3 text-sm">
            {validation?.warnings?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-foreground">
                {validation.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            {extraWarning ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-foreground">
                {extraWarning}
              </p>
            ) : null}
            {counts.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {counts.map(([key, value]) => (
                  <div key={key} className="rounded-md border border-border px-3 py-2">
                    <div className="text-xs text-muted-foreground">{countLabels[key] || key}</div>
                    <div className="font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={validating || deactivating}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={validating || deactivating || !validation}
            onClick={onConfirm}
          >
            {deactivating ? "Deactivating..." : "Confirm Deactivate"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
