import { Package, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
        <Package className="h-4.5 w-4.5" strokeWidth={2.25} />
        <ArrowUpRight className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-sm bg-primary text-primary-foreground p-[1px]" strokeWidth={3} />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold leading-tight tracking-tight">StockFlow</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-navy-muted">B2B Operations</div>
        </div>
      )}
    </div>
  );
}
