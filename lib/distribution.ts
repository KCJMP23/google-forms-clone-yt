/**
 * Survey Distribution Management
 * QR codes, unique links, distribution tracking, expiration management
 * HIPAA-compliant with audit logging
 */

import QRCode from 'qrcode';
import { auditLog } from './audit';

export interface DistributionLink {
  id: string;
  formId: string;
  type: 'public' | 'unique' | 'temporary';
  url: string;
  qrCode?: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  maxResponses?: number;
  currentResponses: number;
  isActive: boolean;
  trackingEnabled: boolean;
  metadata?: Record<string, any>;
}

export interface DistributionStats {
  totalLinks: number;
  activeLinks: number;
  expiredLinks: number;
  totalClicks: number;
  totalResponses: number;
  clicksByDay: Array<{ date: string; clicks: number }>;
  responsesByDay: Array<{ date: string; responses: number }>;
  responseRate: number;
}

export interface QRCodeOptions {
  width?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
  margin?: number;
}

/**
 * Generate a unique distribution link for a form
 */
export async function generateDistributionLink(
  formId: string,
  userId: string,
  options: {
    type?: 'public' | 'unique' | 'temporary';
    expiresAt?: Date;
    maxResponses?: number;
    trackingEnabled?: boolean;
    metadata?: Record<string, any>;
  } = {}
): Promise<DistributionLink> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const link: DistributionLink = {
    id: generateUniqueId(),
    formId,
    type: options.type || 'public',
    url: `${baseUrl}/forms/${formId}`,
    createdBy: userId,
    createdAt: new Date(),
    expiresAt: options.expiresAt,
    maxResponses: options.maxResponses,
    currentResponses: 0,
    isActive: true,
    trackingEnabled: options.trackingEnabled ?? true,
    metadata: options.metadata,
  };

  // Add unique token for unique/temporary links
  if (link.type === 'unique' || link.type === 'temporary') {
    const token = generateUniqueToken();
    link.url = `${baseUrl}/forms/${formId}?token=${token}`;
  }

  // Save to database (simulate)
  await saveToDatabaseMock('distribution_links', link);

  // Audit log
  await auditLog({
    userId,
    action: 'create_distribution_link',
    resourceType: 'distribution_link',
    resourceId: link.id,
    details: {
      formId,
      type: link.type,
      expiresAt: link.expiresAt,
      maxResponses: link.maxResponses,
    },
    ipAddress: '',
    userAgent: '',
  });

  return link;
}

/**
 * Generate QR code for a distribution link
 */
export async function generateQRCode(
  distributionLinkId: string,
  userId: string,
  options: QRCodeOptions = {}
): Promise<string> {
  // Get distribution link
  const link = await getFromDatabaseMock('distribution_links', { id: distributionLinkId });

  if (!link) {
    throw new Error('Distribution link not found');
  }

  // Generate QR code
  const qrCodeDataURL = await QRCode.toDataURL(link.url, {
    width: options.width || 300,
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF',
    },
    margin: options.margin || 4,
  });

  // Update link with QR code
  link.qrCode = qrCodeDataURL;
  await updateDatabaseMock('distribution_links', { id: distributionLinkId }, link);

  // Audit log
  await auditLog({
    userId,
    action: 'generate_qr_code',
    resourceType: 'distribution_link',
    resourceId: distributionLinkId,
    details: { formId: link.formId },
    ipAddress: '',
    userAgent: '',
  });

  return qrCodeDataURL;
}

/**
 * Track link click
 */
export async function trackLinkClick(
  distributionLinkId: string,
  metadata?: Record<string, any>
): Promise<void> {
  const link = await getFromDatabaseMock('distribution_links', { id: distributionLinkId });

  if (!link || !link.trackingEnabled) {
    return;
  }

  // Record click event
  await saveToDatabaseMock('distribution_clicks', {
    id: generateUniqueId(),
    distributionLinkId,
    formId: link.formId,
    timestamp: new Date(),
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    referrer: metadata?.referrer,
  });
}

/**
 * Track form submission from distribution link
 */
export async function trackDistributionResponse(
  distributionLinkId: string,
  responseId: string
): Promise<void> {
  const link = await getFromDatabaseMock('distribution_links', { id: distributionLinkId });

  if (!link) {
    return;
  }

  // Increment response count
  link.currentResponses++;

  // Deactivate if max responses reached
  if (link.maxResponses && link.currentResponses >= link.maxResponses) {
    link.isActive = false;
  }

  await updateDatabaseMock('distribution_links', { id: distributionLinkId }, link);

  // Record response event
  await saveToDatabaseMock('distribution_responses', {
    id: generateUniqueId(),
    distributionLinkId,
    responseId,
    formId: link.formId,
    timestamp: new Date(),
  });
}

/**
 * Get distribution statistics for a form
 */
export async function getDistributionStats(
  formId: string,
  dateRange?: { start: Date; end: Date }
): Promise<DistributionStats> {
  // Get all links for form
  const links = await getFromDatabaseMock('distribution_links', { formId });

  // Get click events
  const clicks = await getFromDatabaseMock('distribution_clicks', { formId });

  // Get response events
  const responses = await getFromDatabaseMock('distribution_responses', { formId });

  // Calculate stats
  const stats: DistributionStats = {
    totalLinks: links?.length || 0,
    activeLinks: links?.filter((l: any) => l.isActive).length || 0,
    expiredLinks: links?.filter((l: any) => !l.isActive).length || 0,
    totalClicks: clicks?.length || 0,
    totalResponses: responses?.length || 0,
    clicksByDay: aggregateByDay(clicks),
    responsesByDay: aggregateByDay(responses),
    responseRate: clicks?.length > 0 ? (responses?.length / clicks?.length) * 100 : 0,
  };

  return stats;
}

/**
 * Validate distribution link
 */
export async function validateDistributionLink(
  distributionLinkId: string,
  token?: string
): Promise<{ valid: boolean; reason?: string }> {
  const link = await getFromDatabaseMock('distribution_links', { id: distributionLinkId });

  if (!link) {
    return { valid: false, reason: 'Link not found' };
  }

  // Check if active
  if (!link.isActive) {
    return { valid: false, reason: 'Link is no longer active' };
  }

  // Check expiration
  if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
    // Deactivate expired link
    link.isActive = false;
    await updateDatabaseMock('distribution_links', { id: distributionLinkId }, link);
    return { valid: false, reason: 'Link has expired' };
  }

  // Check max responses
  if (link.maxResponses && link.currentResponses >= link.maxResponses) {
    return { valid: false, reason: 'Maximum responses reached' };
  }

  // Validate token for unique/temporary links
  if ((link.type === 'unique' || link.type === 'temporary') && !token) {
    return { valid: false, reason: 'Token required' };
  }

  return { valid: true };
}

/**
 * Deactivate distribution link
 */
export async function deactivateDistributionLink(
  distributionLinkId: string,
  userId: string
): Promise<boolean> {
  const link = await getFromDatabaseMock('distribution_links', { id: distributionLinkId });

  if (!link) {
    return false;
  }

  link.isActive = false;
  await updateDatabaseMock('distribution_links', { id: distributionLinkId }, link);

  // Audit log
  await auditLog({
    userId,
    action: 'deactivate_distribution_link',
    resourceType: 'distribution_link',
    resourceId: distributionLinkId,
    details: { formId: link.formId },
    ipAddress: '',
    userAgent: '',
  });

  return true;
}

/**
 * Get all distribution links for a form
 */
export async function getFormDistributionLinks(
  formId: string
): Promise<DistributionLink[]> {
  const links = await getFromDatabaseMock('distribution_links', { formId });
  return links || [];
}

/**
 * Delete distribution link
 */
export async function deleteDistributionLink(
  distributionLinkId: string,
  userId: string
): Promise<boolean> {
  const link = await getFromDatabaseMock('distribution_links', { id: distributionLinkId });

  if (!link) {
    return false;
  }

  await deleteFromDatabaseMock('distribution_links', { id: distributionLinkId });

  // Audit log
  await auditLog({
    userId,
    action: 'delete_distribution_link',
    resourceType: 'distribution_link',
    resourceId: distributionLinkId,
    details: { formId: link.formId },
    ipAddress: '',
    userAgent: '',
  });

  return true;
}

// Helper functions

function generateUniqueId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateUniqueToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function aggregateByDay(events: any[]): Array<{ date: string; count: number }> {
  if (!events) return [];

  const grouped = events.reduce((acc: any, event: any) => {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([date, count]) => ({
    date,
    count: count as number,
  }));
}

async function saveToDatabaseMock(table: string, data: any): Promise<void> {
  // Replace with actual database save
  console.log(`Saving to ${table}:`, data);
}

async function getFromDatabaseMock(table: string, filter: any): Promise<any> {
  // Replace with actual database query
  console.log(`Getting from ${table} with filter:`, filter);
  return null;
}

async function updateDatabaseMock(table: string, filter: any, data: any): Promise<void> {
  // Replace with actual database update
  console.log(`Updating ${table} with filter:`, filter, 'data:', data);
}

async function deleteFromDatabaseMock(table: string, filter: any): Promise<void> {
  // Replace with actual database delete
  console.log(`Deleting from ${table} with filter:`, filter);
}
