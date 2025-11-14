"use client";

import { ReactNode } from "react";
import { useHasRole } from "@/lib/hooks/use-user-role";
import { UserRole } from "@/lib/definitions";

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: UserRole | UserRole[];
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user role
 * Shows fallback content if user doesn't have required role
 */
export function RoleGate({
  children,
  allowedRoles,
  fallback = null,
}: RoleGateProps) {
  const hasRole = useHasRole(allowedRoles);

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
