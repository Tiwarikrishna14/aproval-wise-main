import type { ReactNode } from "react";
import { Sidebar } from "./app-sidebar";
import { Header } from "./app-header";
import { RoleProvider } from "@/lib/role-context";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RoleProvider>
      <div className="flex min-h-screen w-full bg-surface">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </RoleProvider>
  );
}
