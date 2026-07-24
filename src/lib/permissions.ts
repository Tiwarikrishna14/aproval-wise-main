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
