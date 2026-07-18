import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "customer" | "approver" | "verifier" | "admin";

export const ROLES: { id: Role; label: string; badge: string }[] = [
  { id: "customer", label: "Customer View", badge: "Customer Admin" },
  { id: "approver", label: "Order Approver", badge: "Order Approver" },
  { id: "verifier", label: "Stock Verifier", badge: "Stock Verifier" },
  { id: "admin", label: "Admin View", badge: "Super Admin" },
];

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  roleMeta: (typeof ROLES)[number];
};

const RoleContext = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("customer");
  const roleMeta = ROLES.find((r) => r.id === role)!;
  return (
    <RoleContext.Provider value={{ role, setRole, roleMeta }}>{children}</RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
