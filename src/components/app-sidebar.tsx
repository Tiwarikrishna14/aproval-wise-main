import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  ClipboardList,
  CheckSquare,
  Users,
  Package,
  BarChart3,
  HelpCircle,
  Settings,
  LogOut,
  Bell,
  UserCircle,
  ShieldCheck,
  Warehouse,
  Workflow,
  KeyRound,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./logo";
import { useRole, type Role } from "@/lib/role-context";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: LucideIcon };

const customerNav: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "My Orders", to: "/orders", icon: ShoppingCart },
  { label: "My Inventory", to: "/inventory", icon: Boxes },
  { label: "Stock Requests", to: "/stock-requests", icon: ClipboardList },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "FAQ", to: "/faq", icon: HelpCircle },
  { label: "Profile", to: "/settings", icon: UserCircle },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Orders", to: "/orders", icon: ShoppingCart },
  { label: "Approval Queue", to: "/approvals", icon: CheckSquare },
  { label: "Inventory Verification", to: "/stock-verification", icon: Warehouse },
  { label: "Stock Requests", to: "/stock-requests", icon: ClipboardList },
  { label: "Customers", to: "/customers", icon: Users },
  { label: "Products", to: "/products", icon: Package },
  { label: "Workflow Setup", to: "/workflows", icon: Workflow },
  { label: "Roles & Permissions", to: "/roles", icon: KeyRound },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "FAQ Management", to: "/faq", icon: HelpCircle },
  { label: "Audit Logs", to: "/audit-logs", icon: ScrollText },
  { label: "Settings", to: "/settings", icon: Settings },
];

const approverNav: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Approval Queue", to: "/approvals", icon: CheckSquare },
  { label: "Orders", to: "/orders", icon: ShoppingCart },
  { label: "Stock Requests", to: "/stock-requests", icon: ClipboardList },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "FAQ", to: "/faq", icon: HelpCircle },
  { label: "Settings", to: "/settings", icon: Settings },
];

const verifierNav: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Stock Verification", to: "/stock-verification", icon: ShieldCheck },
  { label: "Inventory", to: "/inventory", icon: Boxes },
  { label: "Orders", to: "/orders", icon: ShoppingCart },
  { label: "Stock Requests", to: "/stock-requests", icon: ClipboardList },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Settings },
];

function navForRole(role: Role): NavItem[] {
  switch (role) {
    case "customer":
      return customerNav;
    case "admin":
      return adminNav;
    case "approver":
      return approverNav;
    case "verifier":
      return verifierNav;
  }
}

export function Sidebar() {
  const { role } = useRole();
  const nav = navForRole(role);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-64 shrink-0 flex-col bg-navy text-navy-foreground border-r border-navy-border">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <div className="mx-4 mb-3 border-t border-navy-border" />
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
          {role === "customer" ? "Customer Portal" : role === "admin" ? "Admin Console" : role === "approver" ? "Approver Workspace" : "Verifier Workspace"}
        </div>
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-white ring-1 ring-primary/30"
                      : "text-navy-foreground/80 hover:bg-navy-hover hover:text-white",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-navy-muted group-hover:text-white")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mx-4 border-t border-navy-border" />
      <div className="p-3">
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium text-navy-foreground/80 hover:bg-navy-hover hover:text-white">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
