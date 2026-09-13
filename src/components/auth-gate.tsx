import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { isCustomerAccountUser } from "@/lib/permissions";

function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-sm text-muted-foreground">
      Loading...
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
  if (isCustomerAccount && isCustomerManagementPath) return <FullPageLoader />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
