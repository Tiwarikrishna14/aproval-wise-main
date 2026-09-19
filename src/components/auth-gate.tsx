import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { isCustomerAccountUser } from "@/lib/permissions";

function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

function NoAccessPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-4">
      <div className="pointer-events-none absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">You don&apos;t have permission</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to view these resources. Please contact your administrator
          to assign the required role and permissions.
        </p>
        <Button type="button" variant="outline" className="mt-6" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function AuthGate() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { isReady, isAuthenticated, user } = useAuth();
  const isLoginPage = pathname === "/login";
  const isCustomerAccount = isCustomerAccountUser(user);
  const isCustomerManagementPath = pathname === "/customers" || pathname.startsWith("/customers/");
  const hasAssignedAccess = Boolean(user?.roles?.length || user?.permissions?.length);

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated && !isLoginPage) {
      navigate({ to: "/login", replace: true });
      return;
    }

    if (isAuthenticated && isLoginPage) {
      navigate({ to: isCustomerAccount ? "/products" : "/", replace: true });
      return;
    }

    if (isAuthenticated && isCustomerAccount && isCustomerManagementPath) {
      navigate({ to: "/products", replace: true });
    }
  }, [
    isCustomerAccount,
    isCustomerManagementPath,
    isAuthenticated,
    isLoginPage,
    isReady,
    navigate,
  ]);

  if (!isReady) return <FullPageLoader />;
  if (!isAuthenticated && !isLoginPage) return <FullPageLoader />;
  if (isLoginPage) return <Outlet />;
  if (!hasAssignedAccess) return <NoAccessPage />;
  if (isCustomerAccount && isCustomerManagementPath) return <FullPageLoader />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
