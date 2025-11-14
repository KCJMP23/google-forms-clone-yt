"use client";

import { useUserRole } from "./use-user-role";
import { Permission } from "@/lib/definitions";

/**
 * Hook to check if user has specific permission(s)
 * Returns true if user has ALL specified permissions
 */
export function useHasPermission(
  requiredPermissions: Permission | Permission[]
): boolean {
  const { permissions, isLoading } = useUserRole();

  if (isLoading) return false;

  const perms = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return perms.every((perm) => permissions.includes(perm));
}

/**
 * Hook to check if user has ANY of the specified permissions
 */
export function useHasAnyPermission(
  requiredPermissions: Permission[]
): boolean {
  const { permissions, isLoading } = useUserRole();

  if (isLoading) return false;

  return requiredPermissions.some((perm) => permissions.includes(perm));
}

/**
 * Hook to get all user permissions
 */
export function usePermissions(): {
  permissions: Permission[];
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
} {
  const { permissions, isLoading } = useUserRole();

  return {
    permissions,
    isLoading,
    hasPermission: (permission: Permission) => permissions.includes(permission),
  };
}
