import type { AuthUser } from "@/services/auth.service";

export function isSuperAdmin(user: AuthUser | null | undefined) {
  return Boolean(user?.roles?.includes("SUPER_ADMIN"));
}

export function hasPermission(user: AuthUser | null | undefined, permission: string) {
  return isSuperAdmin(user) || Boolean(user?.permissions?.includes(permission));
}

export function hasAnyPermission(user: AuthUser | null | undefined, permissions: string[]) {
  return (
    isSuperAdmin(user) || permissions.some((permission) => user?.permissions?.includes(permission))
  );
}

function normalizedRoles(user: AuthUser | null | undefined) {
  return (user?.roles ?? []).map((role) => role.toUpperCase());
}

export function isCustomerAccountUser(user: AuthUser | null | undefined) {
  if (!user || isSuperAdmin(user)) return false;

  const roles = normalizedRoles(user);

  return (
    user.userType?.toUpperCase() === "CUSTOMER" ||
    roles.includes("CUSTOMER") ||
    roles.includes("CUSTOMER_ADMIN") ||
    user.role === "customer"
  );
}

export function isCustomerProductOnlyUser(user: AuthUser | null | undefined) {
  if (!isCustomerAccountUser(user)) return false;

  const roles = normalizedRoles(user);
  const hasElevatedRole = roles.some(
    (role) =>
      role === "SUPER_ADMIN" ||
      role === "ORG_ADMIN" ||
      role === "ORGANIZATION_ADMIN" ||
      role === "BRANCH_ADMIN" ||
      role.includes("APPROVER") ||
      role.includes("VERIFIER") ||
      role.includes("BRANCH") ||
      role.includes("ORGANIZATION"),
  );

  return !hasElevatedRole;
}
