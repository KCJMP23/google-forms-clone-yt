/**
 * Role-Based Access Control (RBAC) System
 *
 * Implements granular permission system for HIPAA compliance.
 * Enforces "minimum necessary" standard per §164.502(b).
 *
 * Principles:
 * - Users only access PHI necessary for their job function
 * - Permissions are role-based with granular controls
 * - All access attempts are audited
 * - Emergency "break-glass" access is logged
 */

'use server';

import { auth } from '@clerk/nextjs';
import { UserRole, MedicalSurvey, MedicalSurveyResponse, Permission } from './definitions';
import { auditPHIAccess } from './audit';
import { ROLE_TIMEOUT_MINUTES, requiresMFA as requiresMFAConfig } from './rbac-config';

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SYSTEM_ADMIN]: [
    // Full system access
    Permission.SYSTEM_ADMIN,
    Permission.VIEW_SURVEYS,
    Permission.CREATE_SURVEY,
    Permission.EDIT_SURVEY,
    Permission.DELETE_SURVEY,
    Permission.PUBLISH_SURVEY,
    Permission.VIEW_RESPONSES,
    Permission.VIEW_PHI,
    Permission.EXPORT_PHI,
    Permission.MANAGE_USERS,
    Permission.ASSIGN_ROLES,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_CONSENTS,
    Permission.BREAK_GLASS,
  ],

  [UserRole.COMPLIANCE_OFFICER]: [
    Permission.COMPLIANCE_REVIEW,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_SURVEYS,
    Permission.VIEW_RESPONSES,
    Permission.VIEW_PHI,
    Permission.EXPORT_PHI,
    Permission.DEIDENTIFY_DATA,
    Permission.BREACH_INVESTIGATION,
    Permission.MANAGE_CONSENTS,
  ],

  [UserRole.PHYSICIAN]: [
    Permission.VIEW_SURVEYS,
    Permission.CREATE_SURVEY,
    Permission.EDIT_SURVEY,
    Permission.VIEW_RESPONSES,
    Permission.VIEW_PHI,
    Permission.SUBMIT_RESPONSE,
    Permission.MANAGE_CONSENTS,
    Permission.BREAK_GLASS, // For emergency patient care
  ],

  [UserRole.PROVIDER]: [
    Permission.VIEW_SURVEYS,
    Permission.VIEW_RESPONSES,
    Permission.VIEW_PHI,
    Permission.SUBMIT_RESPONSE,
    Permission.MANAGE_CONSENTS,
  ],

  [UserRole.RESEARCH_COORDINATOR]: [
    Permission.VIEW_SURVEYS,
    Permission.CREATE_SURVEY,
    Permission.EDIT_SURVEY,
    Permission.VIEW_RESPONSES,
    Permission.EXPORT_PHI, // For approved research
    Permission.DEIDENTIFY_DATA,
    Permission.MANAGE_CONSENTS,
  ],

  [UserRole.CLINICAL_STAFF]: [
    Permission.VIEW_SURVEYS,
    Permission.VIEW_RESPONSES,
    Permission.VIEW_PHI,
    Permission.SUBMIT_RESPONSE,
    Permission.VIEW_CONSENTS,
  ],

  [UserRole.PATIENT]: [
    Permission.VIEW_OWN_RESPONSES,
    Permission.SUBMIT_RESPONSE,
    Permission.VIEW_CONSENTS,
  ],

  [UserRole.AUDITOR]: [
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_SURVEYS,
    // Note: Read-only access, no PHI access without justification
  ],

  [UserRole.GUEST]: [
    // Minimal permissions - can only view public content
  ],
};

/**
 * Get current user with role and permissions
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  role: UserRole;
  permissions: Permission[];
  organizationId?: string;
  departmentId?: string;
} | null> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    // TODO: Fetch user profile from database
    // For now, use Clerk publicMetadata to store role
    // In production, this should come from your database
    // Example database query:
    // const userProfile = await prisma.userProfile.findUnique({
    //   where: { id: userId }
    // });

    // Temporarily use Clerk metadata until database is set up
    // Roles can be set in Clerk dashboard: Users > [User] > Metadata > Public metadata
    // Example: { "role": "physician", "organizationId": "org_123" }

    // For development, default to PHYSICIAN role to test all features
    // In production, this should be GUEST by default
    const role = process.env.NODE_ENV === 'development'
      ? UserRole.PHYSICIAN // Development default for testing
      : UserRole.GUEST;    // Production default

    const permissions = ROLE_PERMISSIONS[role];

    return {
      userId,
      role,
      permissions,
      organizationId: undefined,
      departmentId: undefined,
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Check if user has a specific permission
 *
 * @param permission - Permission to check
 * @param userId - Optional user ID (defaults to current user)
 * @returns True if user has permission
 */
export async function hasPermission(
  permission: Permission,
  userId?: string
): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  // Check if user ID matches (if specified)
  if (userId && user.userId !== userId) {
    return false;
  }

  // System admins have all permissions
  if (user.permissions.includes(Permission.SYSTEM_ADMIN)) {
    return true;
  }

  // Check specific permission
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 *
 * @param permissions - Array of permissions to check
 * @returns True if user has at least one permission
 */
export async function hasAnyPermission(
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if user has all of the specified permissions
 *
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 */
export async function hasAllPermissions(
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Require specific permission or throw error
 *
 * @param permission - Required permission
 * @param errorMessage - Custom error message
 */
export async function requirePermission(
  permission: Permission,
  errorMessage?: string
): Promise<void> {
  const allowed = await hasPermission(permission);

  if (!allowed) {
    throw new Error(
      errorMessage || `Permission denied: ${permission} required`
    );
  }
}

/**
 * Check if user can access a specific survey
 *
 * @param survey - Survey to check access for
 * @returns True if user can access survey
 */
export async function canAccessSurvey(
  survey: MedicalSurvey
): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  // System admins can access all surveys
  if (user.permissions.includes(Permission.SYSTEM_ADMIN)) {
    return true;
  }

  // Check if user's role is in allowed roles
  if (!survey.allowedRoles.includes(user.role)) {
    return false;
  }

  // Check organization match
  if (survey.organizationId && survey.organizationId !== user.organizationId) {
    return false;
  }

  // Check department match (if specified)
  if (
    survey.departmentId &&
    user.departmentId &&
    survey.departmentId !== user.departmentId
  ) {
    return false;
  }

  // Check if user is in assigned providers list (if specified)
  if (
    survey.assignedProviders &&
    survey.assignedProviders.length > 0 &&
    !survey.assignedProviders.includes(user.userId)
  ) {
    return false;
  }

  return true;
}

/**
 * Check if user can access a specific survey response
 *
 * @param response - Survey response to check access for
 * @param survey - Associated survey
 * @returns True if user can access response
 */
export async function canAccessResponse(
  response: MedicalSurveyResponse,
  survey?: MedicalSurvey
): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  // System admins and compliance officers can access all responses
  if (
    user.permissions.includes(Permission.SYSTEM_ADMIN) ||
    user.permissions.includes(Permission.COMPLIANCE_REVIEW)
  ) {
    return true;
  }

  // Patients can only access their own responses
  if (user.role === UserRole.PATIENT) {
    return (
      response.submittedBy === user.userId ||
      response.patientId === user.userId
    );
  }

  // Check if user is in accessibleBy list
  if (!response.accessibleBy.includes(user.userId)) {
    return false;
  }

  // Check organization match
  if (response.organizationId !== user.organizationId) {
    return false;
  }

  // Check survey access if provided
  if (survey) {
    return canAccessSurvey(survey);
  }

  return true;
}

/**
 * Get accessible survey responses for current user
 * Filters responses based on RBAC and organizational boundaries
 *
 * @param allResponses - All survey responses
 * @returns Filtered responses user can access
 */
export async function filterAccessibleResponses(
  allResponses: MedicalSurveyResponse[]
): Promise<MedicalSurveyResponse[]> {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  // System admins see all
  if (user.permissions.includes(Permission.SYSTEM_ADMIN)) {
    return allResponses;
  }

  // Filter based on access rules
  const accessible: MedicalSurveyResponse[] = [];

  for (const response of allResponses) {
    if (await canAccessResponse(response)) {
      accessible.push(response);
    }
  }

  return accessible;
}

/**
 * Check if current user can perform break-glass access
 * Used for emergency access to PHI
 *
 * @param justification - Required justification for emergency access
 * @returns True if break-glass access is allowed
 */
export async function canBreakGlass(justification: string): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  // Only specific roles can use break-glass
  if (!user.permissions.includes(Permission.BREAK_GLASS)) {
    return false;
  }

  // Justification is required
  if (!justification || justification.trim().length < 10) {
    return false;
  }

  // Log the break-glass access attempt
  console.warn('🚨 BREAK-GLASS ACCESS ATTEMPT:', {
    userId: user.userId,
    role: user.role,
    justification: justification,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send immediate alert to compliance officer
  // TODO: Record in special break-glass audit log

  return true;
}

/**
 * Access PHI with audit logging
 * Wrapper that enforces permission check and audit logging
 *
 * @param resourceType - Type of resource being accessed
 * @param resourceId - ID of resource
 * @param phiFields - List of PHI fields being accessed
 * @param accessFn - Function to execute for access
 * @returns Result of access function
 */
export async function accessPHI<T>(
  resourceType: string,
  resourceId: string,
  phiFields: string[],
  accessFn: () => Promise<T>
): Promise<T> {
  // Check permission
  await requirePermission(Permission.VIEW_PHI);

  // Audit the access
  await auditPHIAccess(resourceType, resourceId, phiFields);

  // Execute the access function
  return await accessFn();
}

/**
 * Get session timeout for current user's role
 *
 * @returns Timeout in minutes
 */
export async function getSessionTimeout(): Promise<number> {
  const user = await getCurrentUser();

  if (!user) {
    return 15; // Default timeout
  }

  return ROLE_TIMEOUT_MINUTES[user.role];
}

// Note: requiresMFA and getPasswordRequirements moved to rbac-config.ts
// They are exported from there and can be imported directly
// This file only contains server actions (async functions)
