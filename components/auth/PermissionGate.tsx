"use client";

import { ReactNode } from "react";
import { useHasPermission, useHasAnyPermission } from "@/lib/hooks/use-permissions";
import { Permission } from "@/lib/definitions";

interface PermissionGateProps {
  children: ReactNode;
  requiredPermissions: Permission | Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission.
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * Shows fallback content if user doesn't have required permissions
 */
export function PermissionGate({
  children,
  requiredPermissions,
  requireAll = true,
  fallback = null,
}: PermissionGateProps) {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  const hasAllPermissions = useHasPermission(permissions);
  const hasAnyPermission = useHasAnyPermission(permissions);

  const hasRequiredPermissions = requireAll
    ? hasAllPermissions
    : hasAnyPermission;

  if (!hasRequiredPermissions) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
