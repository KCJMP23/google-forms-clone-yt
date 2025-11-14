"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  FileText,
  Shield,
  Settings,
  Activity,
  Download,
  Users,
} from "lucide-react";
import { useHasPermission, useHasAnyPermission } from "@/lib/hooks/use-permissions";
import { Permission } from "@/lib/definitions";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission | Permission[];
  requireAll?: boolean;
  badge?: string;
  description?: string;
}

/**
 * Role-Based Navigation Component
 *
 * Shows/hides menu items based on user permissions.
 * Integrates with existing Sidebar to add HIPAA-compliant features.
 *
 * Features displayed based on role:
 * - All authenticated users: Forms, Settings
 * - Researchers/Providers: Export Data
 * - Compliance Officers/Auditors: Audit Logs
 * - Compliance Officers/Admins: Consent Management
 * - System Admins: All features
 */
export function RoleBasedNav() {
  const pathname = usePathname();

  // Define navigation items with permission requirements
  const navItems: NavItem[] = [
    {
      label: "Forms",
      href: "/dashboard/forms",
      icon: FileText,
      description: "Manage surveys and forms",
    },
    {
      label: "Consent Management",
      href: "/dashboard/consent",
      icon: Users,
      permission: [Permission.MANAGE_CONSENTS, Permission.VIEW_CONSENTS],
      requireAll: false,
      description: "View patient consents",
    },
    {
      label: "Audit Logs",
      href: "/dashboard/audit-logs",
      icon: Activity,
      permission: Permission.VIEW_AUDIT_LOGS,
      badge: "HIPAA",
      description: "View system activity logs",
    },
    {
      label: "Export Data",
      href: "/dashboard/export",
      icon: Download,
      permission: [Permission.EXPORT_PHI, Permission.DEIDENTIFY_DATA],
      requireAll: false,
      description: "Export research data",
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      description: "Account and security settings",
    },
  ];

  // Check permissions for each item
  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true;

    const permissions = Array.isArray(item.permission)
      ? item.permission
      : [item.permission];

    if (item.requireAll) {
      // User needs ALL permissions
      return permissions.every((p) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useHasPermission(p);
      });
    } else {
      // User needs ANY permission
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useHasAnyPermission(permissions);
    }
  });

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <>
      <Separator className="my-2" />
      <div className="px-3">
        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          HIPAA Features
        </p>
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 px-3",
                  isActive && "bg-purple-50 text-purple-700 hover:bg-purple-100"
                )}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge
                      variant="outline"
                      className="text-xs py-0 h-5 bg-purple-100 text-purple-700 border-purple-300"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );
}
