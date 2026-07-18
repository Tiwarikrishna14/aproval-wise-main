import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, HelpCircle, Search, ChevronDown } from "lucide-react";
import { useRole, ROLES, type Role } from "@/lib/role-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Orders",
  "/orders/new": "Create Order",
  "/inventory": "Inventory",
  "/stock-requests": "Stock Requests",
  "/stock-requests/new": "Request Stock",
  "/approvals": "Approval Queue",
  "/stock-verification": "Stock Verification",
  "/customers": "Customers",
  "/products": "Products",
  "/workflows": "Approval Workflows",
  "/roles": "Roles & Permissions",
  "/reports": "Reports",
  "/audit-logs": "Audit Logs",
  "/faq": "Help & FAQ",
  "/settings": "Settings",
  "/notifications": "Notifications",
};

function titleFor(pathname: string) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/orders/")) return "Order Details";
  if (pathname.startsWith("/inventory/")) return "Stock Details";
  if (pathname.startsWith("/approvals/")) return "Approval Review";
  if (pathname.startsWith("/customers/")) return "Customer Details";
  if (pathname.startsWith("/workflows/")) return "Workflow Detail";
  return "Dashboard";
}

export function Header() {
  const { role, setRole, roleMeta } = useRole();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titleFor(pathname);
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const initials = user?.initials ?? "U";

  async function handleLogout() {
    await logout();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-[17px] font-semibold tracking-tight">{title}</h1>
          <Badge
            variant="secondary"
            className="hidden sm:inline-flex bg-secondary text-secondary-foreground text-[11px] font-medium"
          >
            Acme Retail Pvt. Ltd.
          </Badge>
        </div>
      </div>

      <div className="hidden md:flex relative w-[320px] shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          placeholder="Search orders, products, customers…"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="hidden sm:inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 h-9 text-xs font-medium hover:bg-surface">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          {ROLES.find((r) => r.id === role)?.label}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">Switch demo role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROLES.map((r) => (
            <DropdownMenuItem key={r.id} onClick={() => setRole(r.id as Role)} className="text-sm">
              <span className={role === r.id ? "font-medium text-primary" : ""}>{r.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        to="/faq"
        className="hidden sm:grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
      >
        <HelpCircle className="h-4.5 w-4.5" />
      </Link>
      <Link
        to="/notifications"
        className="relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
      >
        <Bell className="h-4.5 w-4.5" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md pl-1 pr-2 h-10 hover:bg-surface">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left leading-tight">
            <div className="text-[13px] font-medium">{displayName}</div>
            <div className="text-[11px] text-muted-foreground">{roleMeta.badge}</div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="text-sm font-medium">{displayName}</div>
            <div className="text-xs text-muted-foreground">{displayEmail}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings">Profile & Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/notifications">Notifications</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/faq">Help center</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
