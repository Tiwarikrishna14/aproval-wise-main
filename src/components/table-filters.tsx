import type { ReactNode } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TableFilters({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TableFilterActions({
  onApply,
  onReset,
  disabled = false,
}: {
  onApply: () => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <Button type="button" variant="outline" onClick={onApply} disabled={disabled}>
        <Search className="mr-1.5 h-4 w-4" />
        Apply
      </Button>
      <Button type="button" variant="ghost" onClick={onReset} disabled={disabled}>
        <X className="mr-1.5 h-4 w-4" />
        Reset
      </Button>
    </>
  );
}
