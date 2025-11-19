/**
 * HIPAA-Compliant Audit Logging System
 *
 * This module implements comprehensive audit logging for HIPAA compliance.
 * All access to Protected Health Information (PHI) must be logged per §164.312(b).
 *
 * Requirements:
 * - Log all PHI access (view, create, modify, delete)
 * - Record user identity, timestamp, action, and resources
 * - Store logs securely with tamper protection
 * - Retain logs for minimum 6 years
 * - Generate audit reports for compliance reviews
 *
 * PRODUCTION: Store audit logs in a separate, write-only database or service
 * Consider using: AWS CloudWatch, Azure Monitor, Splunk, or dedicated SIEM
 */

'use server';

import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs';
import {
  AuditLog,
  AuditAction,
  UserRole,
  PHIIdentifierType
} from './definitions';
import { hashData } from './encryption';

/**
 * Audit log creation parameters
 */
export interface CreateAuditLogParams {
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  phiAccessed?: boolean;
  phiFields?: string[];
  changes?: {
    before?: any;
    after?: any;
  };
  accessJustification?: string;
  isEmergencyAccess?: boolean;
  success?: boolean;
  errorMessage?: string;
  userId?: string; // Override if not using current user
  userRole?: UserRole; // Override if not using current user role
}

/**
 * Get client information from request headers
 */
function getClientInfo() {
  const headersList = headers();

  return {
    ipAddress: headersList.get('x-forwarded-for')?.split(',')[0] ||
      headersList.get('x-real-ip') ||
      'unknown',
    userAgent: headersList.get('user-agent') || 'unknown'
  };
}

/**
 * Get current user from Clerk auth
 */
async function getCurrentUser() {
  try {
    const { userId, sessionId } = auth();

    return {
      userId: userId || 'anonymous',
      sessionId: sessionId || 'no-session'
    };
  } catch (error) {
    return {
      userId: 'system',
      sessionId: 'no-session'
    };
  }
}

/**
 * Create an audit log entry
 *
 * @param params - Audit log parameters
 * @returns Created audit log (or null if logging fails)
 */
export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<AuditLog | null> {
  try {
    // Get user and client information
    const user = await getCurrentUser();
    const client = getClientInfo();

    // Create audit log entry
    const auditLog: AuditLog = {
      id: generateAuditId(),
      timestamp: new Date(),

      // User information
      userId: params.userId || user.userId,
      userRole: params.userRole || UserRole.GUEST, // TODO: Get from user profile
      userName: undefined, // TODO: Get from user profile

      // Action details
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,

      // PHI tracking
      phiAccessed: params.phiAccessed || false,
      phiFields: params.phiFields,

      // Context
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
      sessionId: user.sessionId,

      // Changes
      changes: params.changes,

      // Break-glass access
      accessJustification: params.accessJustification,
      isEmergencyAccess: params.isEmergencyAccess || false,

      // Organization (TODO: Get from context)
      organizationId: 'org-default', // TODO: Get from user context
      departmentId: undefined,

      // Status
      success: params.success !== undefined ? params.success : true,
      errorMessage: params.errorMessage
    };

    // Store audit log
    await storeAuditLog(auditLog);

    // Alert on suspicious activity
    if (shouldAlertOnActivity(auditLog)) {
      await sendSecurityAlert(auditLog);
    }

    return auditLog;
  } catch (error) {
    // CRITICAL: Never fail the main operation if audit logging fails
    // But DO log the error for investigation
    console.error('❌ CRITICAL: Audit logging failed:', error);

    // In production, send alert to monitoring system
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, DataDog, etc.)
    }

    return null;
  }
}

/**
 * Generate unique audit log ID
 */
function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `audit-${timestamp}-${random}`;
}

/**
 * Store audit log entry
 *
 * PRODUCTION: Replace with database insert or logging service
 * Options:
 * - Separate audit database with append-only permissions
 * - AWS CloudWatch Logs
 * - Azure Monitor
 * - Splunk
 * - Elasticsearch
 */
async function storeAuditLog(auditLog: AuditLog): Promise<void> {
  try {
    // Development: Log to console with structured format
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 AUDIT LOG:', JSON.stringify(auditLog, null, 2));
    }

    // TODO: Production implementation
    // Examples:
    //
    // 1. Database insert:
    // await prisma.auditLog.create({ data: auditLog });
    //
    // 2. AWS CloudWatch:
    // await cloudwatch.putLogEvents({
    //   logGroupName: '/hipaa/audit-logs',
    //   logStreamName: `org-${auditLog.organizationId}`,
    //   logEvents: [{
    //     message: JSON.stringify(auditLog),
    //     timestamp: auditLog.timestamp.getTime()
    //   }]
    // });
    //
    // 3. Azure Monitor:
    // await monitorClient.logAuditEvent(auditLog);
    //
    // 4. File-based (development only):
    // await fs.appendFile(
    //   `logs/audit-${new Date().toISOString().split('T')[0]}.jsonl`,
    //   JSON.stringify(auditLog) + '\n'
    // );

    // Placeholder for production implementation
    console.warn('⚠️  TODO: Implement production audit log storage');

  } catch (error) {
    console.error('Failed to store audit log:', error);
    throw error;
  }
}

/**
 * Determine if activity should trigger security alert
 */
function shouldAlertOnActivity(auditLog: AuditLog): boolean {
  // Alert on failed login attempts (potential brute force)
  if (
    auditLog.action === AuditAction.LOGIN_FAILED &&
    !auditLog.success
  ) {
    return true;
  }

  // Alert on emergency/break-glass access
  if (auditLog.isEmergencyAccess) {
    return true;
  }

  // Alert on data exports
  if (auditLog.action === AuditAction.EXPORT_DATA) {
    return true;
  }

  // Alert on bulk PHI access (potential data breach)
  if (
    auditLog.phiAccessed &&
    auditLog.action === AuditAction.VIEW_PHI
  ) {
    // TODO: Implement rate limiting check
    // If user accessed more than X records in Y minutes, alert
  }

  // Alert on breach detection
  if (auditLog.action === AuditAction.BREACH_DETECTED) {
    return true;
  }

  return false;
}

/**
 * Send security alert for suspicious activity
 *
 * PRODUCTION: Integrate with alerting system
 */
async function sendSecurityAlert(auditLog: AuditLog): Promise<void> {
  console.warn('🚨 SECURITY ALERT:', {
    action: auditLog.action,
    user: auditLog.userId,
    resource: `${auditLog.resourceType}:${auditLog.resourceId}`,
    timestamp: auditLog.timestamp,
    ip: auditLog.ipAddress
  });

  // TODO: Production implementation
  // - Send email to security officer
  // - Send to SIEM system
  // - Trigger incident response workflow
  // - Send Slack/Teams notification

  // Example:
  // await sendEmail({
  //   to: process.env.HIPAA_SECURITY_OFFICER_EMAIL,
  //   subject: `Security Alert: ${auditLog.action}`,
  //   body: formatAlertEmail(auditLog)
  // });
}

// ============================================================================
// Helper Functions for Common Audit Scenarios
// ============================================================================

/**
 * Log PHI access (view)
 */
export async function auditPHIAccess(
  resourceType: string,
  resourceId: string,
  phiFields: string[],
  userId?: string,
  details?: any
): Promise<void> {
  await createAuditLog({
    userId,
    action: AuditAction.VIEW_PHI,
    resourceType,
    resourceId,
    phiAccessed: true,
    phiFields
  });
}

/**
 * Log survey response submission
 */
export async function auditResponseSubmission(
  surveyId: string,
  responseId: string,
  containsPHI: boolean
): Promise<void> {
  await createAuditLog({
    action: AuditAction.SUBMIT_RESPONSE,
    resourceType: 'survey_response',
    resourceId: responseId,
    phiAccessed: containsPHI
  });
}

/**
 * Log survey response viewing
 */
export async function auditResponseView(
  responseId: string,
  phiFields?: string[]
): Promise<void> {
  await createAuditLog({
    action: AuditAction.VIEW_RESPONSE,
    resourceType: 'survey_response',
    resourceId: responseId,
    phiAccessed: (phiFields && phiFields.length > 0) || false,
    phiFields
  });
}

/**
 * Log data export
 */
export async function auditDataExport(
  action: string,
  resourceType: string,
  recordCount: number,
  containsPHI: boolean,
  userId?: string,
  details?: any,
  isDeidentified: boolean = false
): Promise<void> {
  await createAuditLog({
    action: (action as AuditAction) || AuditAction.EXPORT_DATA,
    resourceType,
    resourceId: `export-${Date.now()}`,
    phiAccessed: containsPHI && !isDeidentified,
    userId,
    changes: {
      after: {
        recordCount,
        containsPHI,
        isDeidentified
      }
    }
  });
}

/**
 * Log login attempt
 */
export async function auditLogin(
  userId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await createAuditLog({
    action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
    resourceType: 'user',
    resourceId: userId,
    success,
    errorMessage,
    userId
  });
}

/**
 * Log logout
 */
export async function auditLogout(userId: string): Promise<void> {
  await createAuditLog({
    action: AuditAction.LOGOUT,
    resourceType: 'user',
    resourceId: userId,
    userId
  });
}

/**
 * Log consent granted
 */
export async function auditConsentGranted(
  consentId: string,
  patientId: string,
  consentType: string
): Promise<void> {
  await createAuditLog({
    action: AuditAction.CONSENT_GRANTED,
    resourceType: 'consent',
    resourceId: consentId,
    phiAccessed: true, // Consent contains patient info
    changes: {
      after: {
        patientId: hashData(patientId), // Hash for audit log
        consentType
      }
    }
  });
}

/**
 * Log consent withdrawal
 */
export async function auditConsentWithdrawn(
  consentId: string,
  patientId: string
): Promise<void> {
  await createAuditLog({
    action: AuditAction.CONSENT_WITHDRAWN,
    resourceType: 'consent',
    resourceId: consentId,
    phiAccessed: true,
    changes: {
      after: {
        patientId: hashData(patientId)
      }
    }
  });
}

/**
 * Log access granted to user
 */
export async function auditAccessGranted(
  targetUserId: string,
  grantedBy: string,
  role: UserRole,
  permissions: string[]
): Promise<void> {
  await createAuditLog({
    action: AuditAction.GRANT_ACCESS,
    resourceType: 'user',
    resourceId: targetUserId,
    userId: grantedBy,
    changes: {
      after: {
        role,
        permissions
      }
    }
  });
}

/**
 * Log access revoked from user
 */
export async function auditAccessRevoked(
  targetUserId: string,
  revokedBy: string,
  reason: string
): Promise<void> {
  await createAuditLog({
    action: AuditAction.REVOKE_ACCESS,
    resourceType: 'user',
    resourceId: targetUserId,
    userId: revokedBy,
    changes: {
      after: { reason }
    }
  });
}

/**
 * Log data de-identification
 */
export async function auditDeidentification(
  originalRecordIds: string[],
  method: string
): Promise<void> {
  await createAuditLog({
    action: AuditAction.DATA_DEIDENTIFIED,
    resourceType: 'survey_responses',
    resourceId: `batch-${Date.now()}`,
    phiAccessed: true, // Accessed PHI to de-identify
    changes: {
      before: {
        recordCount: originalRecordIds.length
      },
      after: {
        method,
        deidentified: true
      }
    }
  });
}

/**
 * Log secure data deletion
 */
export async function auditDataDeletion(
  resourceType: string,
  resourceId: string,
  reason: string,
  containedPHI: boolean
): Promise<void> {
  await createAuditLog({
    action: AuditAction.DATA_DELETED,
    resourceType,
    resourceId,
    phiAccessed: containedPHI,
    changes: {
      before: {
        deleted: false
      },
      after: {
        deleted: true,
        reason,
        deletedAt: new Date().toISOString()
      }
    }
  });
}

/**
 * Log potential breach detection
 */
export async function auditBreachDetection(
  incidentType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  affectedRecords: number,
  details: any
): Promise<void> {
  await createAuditLog({
    action: AuditAction.BREACH_DETECTED,
    resourceType: 'security_incident',
    resourceId: `incident-${Date.now()}`,
    phiAccessed: true,
    changes: {
      after: {
        incidentType,
        severity,
        affectedRecords,
        details
      }
    }
  });

  // CRITICAL: Send immediate alert
  console.error('🚨🚨🚨 BREACH DETECTED:', {
    incidentType,
    severity,
    affectedRecords,
    timestamp: new Date().toISOString()
  });

  // TODO: Trigger breach response workflow
  // - Notify HIPAA Security Officer immediately
  // - Lock affected accounts if necessary
  // - Start breach investigation process
  // - Prepare for potential HHS notification (if 500+ records)
}

// ============================================================================
// Query Functions (for audit reports)
// ============================================================================

/**
 * Get audit logs for a specific resource
 *
 * @param resourceType - Type of resource
 * @param resourceId - Resource ID
 * @param limit - Maximum number of logs to return
 * @returns Array of audit logs
 */
export async function getAuditLogsForResource(
  resourceType: string,
  resourceId: string,
  limit: number = 100
): Promise<AuditLog[]> {
  // TODO: Implement database query
  // return await prisma.auditLog.findMany({
  //   where: {
  //     resourceType,
  //     resourceId
  //   },
  //   orderBy: {
  //     timestamp: 'desc'
  //   },
  //   take: limit
  // });

  console.warn('⚠️  TODO: Implement audit log retrieval');
  return [];
}

/**
 * Get audit logs for a specific user
 *
 * @param userId - User ID
 * @param startDate - Start date for logs
 * @param endDate - End date for logs
 * @returns Array of audit logs
 */
export async function getAuditLogsForUser(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AuditLog[]> {
  // TODO: Implement database query
  console.warn('⚠️  TODO: Implement user audit log retrieval');
  return [];
}

/**
 * Get PHI access audit trail
 * Critical for HIPAA compliance reviews
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of PHI access logs
 */
export async function getPHIAccessAuditTrail(
  startDate: Date,
  endDate: Date
): Promise<AuditLog[]> {
  // TODO: Implement database query
  // return await prisma.auditLog.findMany({
  //   where: {
  //     phiAccessed: true,
  //     timestamp: {
  //       gte: startDate,
  //       lte: endDate
  //     }
  //   },
  //   orderBy: {
  //     timestamp: 'desc'
  //   }
  // });

  console.warn('⚠️  TODO: Implement PHI access audit trail');
  return [];
}

/**
 * Generic audit log function (wrapper for createAuditLog)
 */
export async function auditLog(params: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
  containsPHI?: boolean;
  phiFields?: string[];
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await createAuditLog({
    action: params.action as AuditAction,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    phiAccessed: params.containsPHI,
    phiFields: params.phiFields,
    userId: params.userId,
  });
}

/**
 * Audit form creation
 */
export async function auditFormCreation(
  formId: string,
  formTitle: string,
  containsPHI: boolean,
  userId: string
): Promise<void> {
  await createAuditLog({
    action: 'create' as AuditAction,
    resourceType: 'form',
    resourceId: formId,
    phiAccessed: containsPHI,
    userId,
  });
}

/**
 * Audit file upload
 */
export async function auditFileUpload(
  fileId: string,
  filename: string,
  userId: string,
  isPHI: boolean
): Promise<void> {
  await createAuditLog({
    action: 'create' as AuditAction,
    resourceType: 'file',
    resourceId: fileId,
    phiAccessed: isPHI,
    userId,
  });
}

/**
 * Audit file access
 */
export async function auditFileAccess(
  fileId: string,
  userId: string,
  isPHI: boolean
): Promise<void> {
  await createAuditLog({
    action: 'view' as AuditAction,
    resourceType: 'file',
    resourceId: fileId,
    phiAccessed: isPHI,
    userId,
  });
}

/**
 * Audit file deletion
 */
export async function auditFileDelete(
  fileId: string,
  userId: string,
  isPHI: boolean
): Promise<void> {
  await createAuditLog({
    action: 'delete' as AuditAction,
    resourceType: 'file',
    resourceId: fileId,
    phiAccessed: isPHI,
    userId,
  });
}

/**
 * Audit notification sent
 */
export async function auditNotificationSent(
  notificationType: string,
  recipientId: string,
  containsPHI: boolean
): Promise<void> {
  await createAuditLog({
    action: 'export' as AuditAction,
    resourceType: 'notification',
    resourceId: recipientId,
    phiAccessed: containsPHI,
  });
}
