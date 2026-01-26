"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UserRole, Permission } from "@/lib/definitions";

interface UserRoleData {
  userId: string;
  role: UserRole;
  permissions: Permission[];
  isLoading: boolean;
}

/**
 * Hook to get current user's role and permissions
 * Integrates with Clerk authentication and RBAC system
 */
export function useUserRole(): UserRoleData {
  const { user, isLoaded } = useUser();
  const [roleData, setRoleData] = useState<Omit<UserRoleData, "isLoading">>({
    userId: "",
    role: UserRole.GUEST,
    permissions: [],
  });

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setRoleData({
          userId: "",
          role: UserRole.GUEST,
          permissions: [],
        });
        return;
      }

      try {
        // Fetch user role from server
        const response = await fetch("/api/user/role");
        if (response.ok) {
          const data = await response.json();
          setRoleData({
            userId: user.id,
            role: data.role || UserRole.GUEST,
            permissions: data.permissions || [],
          });
        } else {
          // Fallback to metadata if API fails
          const role = (user.publicMetadata?.role as UserRole) || UserRole.GUEST;
          setRoleData({
            userId: user.id,
            role,
            permissions: [],
          });
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
        // Fallback to guest role
        setRoleData({
          userId: user.id,
          role: UserRole.GUEST,
          permissions: [],
        });
      }
    }

    if (isLoaded) {
      fetchUserRole();
    }
  }, [user, isLoaded]);

  return {
    ...roleData,
    isLoading: !isLoaded,
  };
}

/**
 * Hook to check if user has specific role(s)
 */
export function useHasRole(requiredRoles: UserRole | UserRole[]): boolean {
  const { role, isLoading } = useUserRole();

  if (isLoading) return false;

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(role);
}

/**
 * Hook to get role display name
 */
export function useRoleDisplayName(): string {
  const { role, isLoading } = useUserRole();

  if (isLoading) return "Loading...";

  const displayNames: Record<UserRole, string> = {
    [UserRole.SYSTEM_ADMIN]: "System Administrator",
    [UserRole.COMPLIANCE_OFFICER]: "Compliance Officer",
    [UserRole.PHYSICIAN]: "Physician",
    [UserRole.PROVIDER]: "Healthcare Provider",
    [UserRole.RESEARCH_COORDINATOR]: "Research Coordinator",
    [UserRole.CLINICAL_STAFF]: "Clinical Staff",
    [UserRole.PATIENT]: "Patient",
    [UserRole.AUDITOR]: "Auditor",
    [UserRole.GUEST]: "Guest",
  };

  return displayNames[role] || "Unknown";
}
