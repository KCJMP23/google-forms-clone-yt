/**
 * Survey Distribution Management
 * QR codes, unique links, distribution tracking, expiration management
 * HIPAA-compliant with audit logging
 */

import QRCode from 'qrcode';
import { auditLog } from './audit';
import prisma from './prisma';

export interface DistributionLink {
  id: string;
  formId: string;
  type: 'public' | 'unique' | 'temporary';
  url: string;
  qrCode?: string | null;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date | null;
  maxResponses?: number | null;
  currentResponses: number;
  isActive: boolean;
  trackingEnabled: boolean;
  metadata?: Record<string, any> | null;
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
  const type = options.type || 'public';

  // Generate URL with token for unique/temporary links
  let url = `${baseUrl}/forms/${formId}`;
  let token: string | undefined;

  if (type === 'unique' || type === 'temporary') {
    token = generateUniqueToken();
    url = `${baseUrl}/forms/${formId}?token=${token}`;
  }

  // Save to database using Prisma
  const link = await prisma.distributionLink.create({
    data: {
      formId,
      type,
      url,
      token,
      createdBy: userId,
      expiresAt: options.expiresAt,
      maxResponses: options.maxResponses,
      currentResponses: 0,
      isActive: true,
      trackingEnabled: options.trackingEnabled ?? true,
      metadata: options.metadata as any,
    }
  });

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

  return link as DistributionLink;
}

/**
 * Generate QR code for a distribution link
 */
export async function generateQRCode(
  distributionLinkId: string,
  userId: string,
  options: QRCodeOptions = {}
): Promise<string> {
  // Get distribution link from database
  const link = await prisma.distributionLink.findUnique({
    where: { id: distributionLinkId }
  });

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
  await prisma.distributionLink.update({
    where: { id: distributionLinkId },
    data: { qrCode: qrCodeDataURL }
  });

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
  const link = await prisma.distributionLink.findUnique({
    where: { id: distributionLinkId }
  });

  if (!link || !link.trackingEnabled) {
    return;
  }

  // Record click event
  await prisma.distributionClick.create({
    data: {
      distributionLinkId,
      formId: link.formId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      referrer: metadata?.referrer,
    }
  });
}

/**
 * Track form submission from distribution link
 */
export async function trackDistributionResponse(
  distributionLinkId: string,
  responseId: string
): Promise<void> {
  const link = await prisma.distributionLink.findUnique({
    where: { id: distributionLinkId }
  });

  if (!link) {
    return;
  }

  // Increment response count and deactivate if max reached
  const updatedLink = await prisma.distributionLink.update({
    where: { id: distributionLinkId },
    data: {
      currentResponses: { increment: 1 },
      isActive: link.maxResponses && link.currentResponses + 1 >= link.maxResponses
        ? false
        : link.isActive
    }
  });

  // Note: Response tracking is now handled by the Response model's distributionLinkId field
  // No need for separate distribution_responses table
}

/**
 * Get distribution statistics for a form
 */
export async function getDistributionStats(
  formId: string,
  dateRange?: { start: Date; end: Date }
): Promise<DistributionStats> {
  // Build date filter
  const dateFilter = dateRange ? {
    timestamp: {
      gte: dateRange.start,
      lte: dateRange.end
    }
  } : {};

  // Get all links for form
  const links = await prisma.distributionLink.findMany({
    where: { formId }
  });

  // Get click events
  const clicks = await prisma.distributionClick.findMany({
    where: {
      formId,
      ...dateFilter
    }
  });

  // Get response events (from Response model)
  const responses = await prisma.response.findMany({
    where: {
      formId,
      distributionLinkId: { not: null },
      ...(dateRange ? {
        submittedAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      } : {})
    }
  });

  // Calculate stats
  const clicksByDay = aggregateByDay(clicks.map(c => ({ timestamp: c.timestamp })))
    .map(item => ({ date: item.date, clicks: item.count }));

  const responsesByDay = aggregateByDay(responses.map(r => ({ timestamp: r.submittedAt })))
    .map(item => ({ date: item.date, responses: item.count }));

  const stats: DistributionStats = {
    totalLinks: links.length,
    activeLinks: links.filter(l => l.isActive).length,
    expiredLinks: links.filter(l => !l.isActive).length,
    totalClicks: clicks.length,
    totalResponses: responses.length,
    clicksByDay,
    responsesByDay,
    responseRate: clicks.length > 0 ? (responses.length / clicks.length) * 100 : 0,
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
  const link = await prisma.distributionLink.findUnique({
    where: { id: distributionLinkId }
  });

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
    await prisma.distributionLink.update({
      where: { id: distributionLinkId },
      data: { isActive: false }
    });
    return { valid: false, reason: 'Link has expired' };
  }

  // Check max responses
  if (link.maxResponses && link.currentResponses >= link.maxResponses) {
    return { valid: false, reason: 'Maximum responses reached' };
  }

  // Validate token for unique/temporary links
  if ((link.type === 'unique' || link.type === 'temporary')) {
    if (!token || token !== link.token) {
      return { valid: false, reason: 'Invalid or missing token' };
    }
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
  const link = await prisma.distributionLink.findUnique({
    where: { id: distributionLinkId }
  });

  if (!link) {
    return false;
  }

  await prisma.distributionLink.update({
    where: { id: distributionLinkId },
    data: { isActive: false }
  });

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
  const links = await prisma.distributionLink.findMany({
    where: { formId },
    orderBy: { createdAt: 'desc' }
  });

  return links as DistributionLink[];
}

/**
 * Delete distribution link
 */
export async function deleteDistributionLink(
  distributionLinkId: string,
  userId: string
): Promise<boolean> {
  const link = await prisma.distributionLink.findUnique({
    where: { id: distributionLinkId }
  });

  if (!link) {
    return false;
  }

  await prisma.distributionLink.delete({
    where: { id: distributionLinkId }
  });

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

function generateUniqueToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function aggregateByDay(events: Array<{ timestamp: Date }>): Array<{ date: string; count: number }> {
  if (!events || events.length === 0) return [];

  const grouped = events.reduce((acc: Record<string, number>, event) => {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([date, count]) => ({
    date,
    count,
  }));
}
