/**
 * RBAC Configuration
 * Shared configuration for both client and server components
 */

import { UserRole } from './definitions';

/**
 * Session timeout settings based on role (in minutes)
 */
export const ROLE_TIMEOUT_MINUTES: Record<UserRole, number> = {
  [UserRole.SYSTEM_ADMIN]: 10, // Shorter for high-privilege roles
  [UserRole.COMPLIANCE_OFFICER]: 15,
  [UserRole.PHYSICIAN]: 15,
  [UserRole.PROVIDER]: 15,
  [UserRole.RESEARCH_COORDINATOR]: 20,
  [UserRole.CLINICAL_STAFF]: 20,
  [UserRole.PATIENT]: 30, // Longer for patients
  [UserRole.AUDITOR]: 15,
  [UserRole.GUEST]: 30,
};

/**
 * Roles that require MFA
 */
export const MFA_REQUIRED_ROLES: UserRole[] = [
  UserRole.SYSTEM_ADMIN,
  UserRole.COMPLIANCE_OFFICER,
  UserRole.PHYSICIAN,
];

/**
 * Check if role requires MFA
 */
export function requiresMFA(role: UserRole): boolean {
  return MFA_REQUIRED_ROLES.includes(role);
}

/**
 * Get minimum password requirements based on role
 */
export function getPasswordRequirements(role: UserRole): {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
} {
  const isHighPrivilege = [
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
  ].includes(role);

  return {
    minLength: isHighPrivilege ? 12 : 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: isHighPrivilege,
    expirationDays: isHighPrivilege ? 60 : 90,
  };
}
