import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

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
  const { isReady, isAuthenticated } = useAuth();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated && !isLoginPage) {
      navigate({ to: "/login", replace: true });
      return;
    }

    if (isAuthenticated && isLoginPage) {
      navigate({ to: "/", replace: true });
    }
  }, [isAuthenticated, isLoginPage, isReady, navigate]);

  if (!isReady) return <FullPageLoader />;
  if (!isAuthenticated && !isLoginPage) return <FullPageLoader />;
  if (isLoginPage) return <Outlet />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
