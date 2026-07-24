import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";

export type Role = "customer" | "approver" | "verifier" | "admin";

export const ROLES: { id: Role; label: string; badge: string }[] = [
  { id: "customer", label: "Customer View", badge: "Customer Admin" },
  { id: "approver", label: "Order Approver", badge: "Order Approver" },
  { id: "verifier", label: "Stock Verifier", badge: "Stock Verifier" },
  { id: "admin", label: "Admin View", badge: "Admin" },
];

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  roleMeta: (typeof ROLES)[number];
};

const RoleContext = createContext<Ctx | null>(null);

function prettifyBackendRole(role: string) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "CUSTOMER_ADMIN" || role === "ORGANIZATION_ADMIN") return "Customer Admin";

  return role
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function roleBadgeForUser(role: Role, backendRoles?: string[]) {
  const primaryRole = backendRoles?.[0];

  if (primaryRole) return prettifyBackendRole(primaryRole);

  return ROLES.find((item) => item.id === role)?.badge ?? "User";
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>("customer");

  useEffect(() => {
    if (user?.role) setRole(user.role);
  }, [user?.role]);

  const baseRoleMeta = ROLES.find((r) => r.id === role)!;
  const roleMeta = {
    ...baseRoleMeta,
    badge: roleBadgeForUser(role, user?.roles),
  };

  return (
    <RoleContext.Provider value={{ role, setRole, roleMeta }}>{children}</RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
