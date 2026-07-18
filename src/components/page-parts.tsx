import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <h2 className="truncate text-2xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  tone?: "default" | "warning" | "success" | "destructive" | "info";
}) {
  const toneMap: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };
  return (
    <button className="group text-left rounded-xl border border-border bg-card p-4 shadow-[0_1px_0_0_rgba(15,23,42,0.02)] transition hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn("grid h-9 w-9 place-items-center rounded-lg", toneMap[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        {trend && <span className="text-[11px] font-medium text-muted-foreground">{trend}</span>}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="mt-0.5 text-[13px] text-muted-foreground">{label}</div>
      </div>
    </button>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="border-t border-border">{children}</div>
    </section>
  );
}
