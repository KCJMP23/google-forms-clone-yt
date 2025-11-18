/**
 * Automated Notification System
 * HIPAA-compliant email notifications using SendGrid/Mailgun
 */

import { auditNotificationSent } from './audit';

export enum NotificationType {
  FORM_SUBMISSION = 'form_submission',
  CONSENT_EXPIRING = 'consent_expiring',
  CONSENT_EXPIRED = 'consent_expired',
  SURVEY_REMINDER = 'survey_reminder',
  AUDIT_ALERT = 'audit_alert',
  BREAK_GLASS_ALERT = 'break_glass_alert',
  WEEKLY_SUMMARY = 'weekly_summary',
  MONTHLY_SUMMARY = 'monthly_summary',
}

export interface NotificationConfig {
  type: NotificationType;
  recipients: string[];
  subject: string;
  templateId?: string;
  data: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  sendAt?: Date; // For scheduled notifications
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
}

// Email templates
export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  [NotificationType.FORM_SUBMISSION]: {
    id: 'form-submission',
    type: NotificationType.FORM_SUBMISSION,
    subject: 'New Survey Response Received',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Survey Response</h2>
        <p>A new response has been submitted for:</p>
        <p><strong>{{formTitle}}</strong></p>
        <p>Response ID: {{responseId}}</p>
        <p>Submitted at: {{submittedAt}}</p>
        <p>
          <a href="{{dashboardUrl}}" style="background: #6B46C1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Response
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `,
    textTemplate: `
      New Survey Response

      A new response has been submitted for: {{formTitle}}
      Response ID: {{responseId}}
      Submitted at: {{submittedAt}}

      View response: {{dashboardUrl}}
    `,
    variables: ['formTitle', 'responseId', 'submittedAt', 'dashboardUrl'],
  },

  [NotificationType.CONSENT_EXPIRING]: {
    id: 'consent-expiring',
    type: NotificationType.CONSENT_EXPIRING,
    subject: 'Consent Expiring Soon - Action Required',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #D97706;">⚠️ Consent Expiring Soon</h2>
        <p>The following consent will expire in <strong>{{daysUntilExpiration}} days</strong>:</p>
        <p><strong>Participant:</strong> {{participantName}}</p>
        <p><strong>Consent Type:</strong> {{consentType}}</p>
        <p><strong>Expires on:</strong> {{expirationDate}}</p>
        <p>
          <a href="{{renewalUrl}}" style="background: #D97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Renew Consent
          </a>
        </p>
      </div>
    `,
    textTemplate: `
      Consent Expiring Soon

      The following consent will expire in {{daysUntilExpiration}} days:
      Participant: {{participantName}}
      Consent Type: {{consentType}}
      Expires on: {{expirationDate}}

      Renew consent: {{renewalUrl}}
    `,
    variables: ['participantName', 'consentType', 'expirationDate', 'daysUntilExpiration', 'renewalUrl'],
  },

  [NotificationType.CONSENT_EXPIRED]: {
    id: 'consent-expired',
    type: NotificationType.CONSENT_EXPIRED,
    subject: 'Consent Expired - Immediate Action Required',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #DC2626;">🚨 Consent Expired</h2>
        <p><strong>Participant:</strong> {{participantName}}</p>
        <p><strong>Consent Type:</strong> {{consentType}}</p>
        <p><strong>Expired on:</strong> {{expirationDate}}</p>
        <p style="color: #DC2626;">
          This participant's data should no longer be used until consent is renewed.
        </p>
        <p>
          <a href="{{consentManagementUrl}}" style="background: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Manage Consent
          </a>
        </p>
      </div>
    `,
    textTemplate: `
      Consent Expired - Immediate Action Required

      Participant: {{participantName}}
      Consent Type: {{consentType}}
      Expired on: {{expirationDate}}

      This participant's data should no longer be used until consent is renewed.

      Manage consent: {{consentManagementUrl}}
    `,
    variables: ['participantName', 'consentType', 'expirationDate', 'consentManagementUrl'],
  },

  [NotificationType.SURVEY_REMINDER]: {
    id: 'survey-reminder',
    type: NotificationType.SURVEY_REMINDER,
    subject: 'Reminder: Complete Your Survey',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Survey Reminder</h2>
        <p>This is a friendly reminder to complete your survey:</p>
        <p><strong>{{surveyTitle}}</strong></p>
        <p>{{surveyDescription}}</p>
        <p>
          <a href="{{surveyUrl}}" style="background: #6B46C1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Take Survey
          </a>
        </p>
        <p style="color: #666; font-size: 12px;">
          Estimated time: {{estimatedTime}} minutes
        </p>
      </div>
    `,
    textTemplate: `
      Survey Reminder

      This is a friendly reminder to complete your survey:
      {{surveyTitle}}

      {{surveyDescription}}

      Take survey: {{surveyUrl}}

      Estimated time: {{estimatedTime}} minutes
    `,
    variables: ['surveyTitle', 'surveyDescription', 'surveyUrl', 'estimatedTime'],
  },

  [NotificationType.AUDIT_ALERT]: {
    id: 'audit-alert',
    type: NotificationType.AUDIT_ALERT,
    subject: 'Security Alert: Unusual Activity Detected',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #DC2626;">🔒 Security Alert</h2>
        <p>Unusual activity has been detected:</p>
        <p><strong>Activity Type:</strong> {{activityType}}</p>
        <p><strong>User:</strong> {{userName}} ({{userEmail}})</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <p><strong>Details:</strong> {{details}}</p>
        <p>
          <a href="{{auditLogUrl}}" style="background: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Audit Log
          </a>
        </p>
      </div>
    `,
    textTemplate: `
      Security Alert: Unusual Activity Detected

      Activity Type: {{activityType}}
      User: {{userName}} ({{userEmail}})
      Time: {{timestamp}}
      Details: {{details}}

      View audit log: {{auditLogUrl}}
    `,
    variables: ['activityType', 'userName', 'userEmail', 'timestamp', 'details', 'auditLogUrl'],
  },

  [NotificationType.BREAK_GLASS_ALERT]: {
    id: 'break-glass-alert',
    type: NotificationType.BREAK_GLASS_ALERT,
    subject: 'URGENT: Break-Glass Access Used',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #DC2626;">🚨 URGENT: Break-Glass Access</h2>
        <p>Emergency PHI access has been granted:</p>
        <p><strong>User:</strong> {{userName}} ({{userEmail}})</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <p><strong>Justification:</strong> {{justification}}</p>
        <p><strong>Resources Accessed:</strong> {{resources}}</p>
        <p style="color: #DC2626; font-weight: bold;">
          This access has been logged and will be reviewed.
        </p>
        <p>
          <a href="{{auditLogUrl}}" style="background: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Immediately
          </a>
        </p>
      </div>
    `,
    textTemplate: `
      URGENT: Break-Glass Access Used

      Emergency PHI access has been granted:
      User: {{userName}} ({{userEmail}})
      Time: {{timestamp}}
      Justification: {{justification}}
      Resources Accessed: {{resources}}

      This access has been logged and will be reviewed.

      Review immediately: {{auditLogUrl}}
    `,
    variables: ['userName', 'userEmail', 'timestamp', 'justification', 'resources', 'auditLogUrl'],
  },

  [NotificationType.WEEKLY_SUMMARY]: {
    id: 'weekly-summary',
    type: NotificationType.WEEKLY_SUMMARY,
    subject: 'Weekly Survey Summary Report',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Weekly Summary</h2>
        <p>Here's your survey activity for the week of {{weekStart}} to {{weekEnd}}:</p>

        <div style="background: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>📊 Statistics</h3>
          <p><strong>Total Responses:</strong> {{totalResponses}}</p>
          <p><strong>Active Surveys:</strong> {{activeSurveys}}</p>
          <p><strong>Completion Rate:</strong> {{completionRate}}%</p>
          <p><strong>New Participants:</strong> {{newParticipants}}</p>
        </div>

        <h3>Top Surveys</h3>
        <ul>
          {{#each topSurveys}}
          <li><strong>{{this.title}}</strong> - {{this.responses}} responses</li>
          {{/each}}
        </ul>

        <p>
          <a href="{{dashboardUrl}}" style="background: #6B46C1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Full Report
          </a>
        </p>
      </div>
    `,
    textTemplate: `
      Weekly Summary

      Here's your survey activity for the week of {{weekStart}} to {{weekEnd}}:

      Statistics:
      - Total Responses: {{totalResponses}}
      - Active Surveys: {{activeSurveys}}
      - Completion Rate: {{completionRate}}%
      - New Participants: {{newParticipants}}

      View full report: {{dashboardUrl}}
    `,
    variables: ['weekStart', 'weekEnd', 'totalResponses', 'activeSurveys', 'completionRate', 'newParticipants', 'topSurveys', 'dashboardUrl'],
  },

  [NotificationType.MONTHLY_SUMMARY]: {
    id: 'monthly-summary',
    type: NotificationType.MONTHLY_SUMMARY,
    subject: 'Monthly Survey Summary Report',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Monthly Summary - {{month}}</h2>
        <p>Comprehensive overview of your survey activity:</p>

        <div style="background: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>📊 Monthly Statistics</h3>
          <p><strong>Total Responses:</strong> {{totalResponses}}</p>
          <p><strong>Active Surveys:</strong> {{activeSurveys}}</p>
          <p><strong>Average Completion Rate:</strong> {{avgCompletionRate}}%</p>
          <p><strong>Total Participants:</strong> {{totalParticipants}}</p>
        </div>

        <h3>Compliance Metrics</h3>
        <ul>
          <li>PHI Access Events: {{phiAccessCount}}</li>
          <li>Consents Renewed: {{consentsRenewed}}</li>
          <li>Consents Expired: {{consentsExpired}}</li>
        </ul>

        <p>
          <a href="{{reportUrl}}" style="background: #6B46C1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Download Full Report (PDF)
          </a>
        </p>
      </div>
    `,
    textTemplate: `
      Monthly Summary - {{month}}

      Monthly Statistics:
      - Total Responses: {{totalResponses}}
      - Active Surveys: {{activeSurveys}}
      - Average Completion Rate: {{avgCompletionRate}}%
      - Total Participants: {{totalParticipants}}

      Compliance Metrics:
      - PHI Access Events: {{phiAccessCount}}
      - Consents Renewed: {{consentsRenewed}}
      - Consents Expired: {{consentsExpired}}

      Download full report: {{reportUrl}}
    `,
    variables: ['month', 'totalResponses', 'activeSurveys', 'avgCompletionRate', 'totalParticipants', 'phiAccessCount', 'consentsRenewed', 'consentsExpired', 'reportUrl'],
  },
};

/**
 * Send notification email
 */
export async function sendNotification(config: NotificationConfig): Promise<boolean> {
  try {
    const template = config.templateId
      ? NOTIFICATION_TEMPLATES[config.type]
      : null;

    if (!template) {
      throw new Error(`Template not found for type: ${config.type}`);
    }

    // Replace variables in template
    let htmlBody = template.htmlTemplate;
    let textBody = template.textTemplate;

    Object.entries(config.data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlBody = htmlBody.replace(regex, String(value));
      textBody = textBody.replace(regex, String(value));
    });

    // Send email using configured provider (SendGrid/Mailgun)
    // Note: Actual implementation depends on which email service is used
    const emailProvider = process.env.EMAIL_PROVIDER || 'sendgrid';

    if (emailProvider === 'sendgrid') {
      await sendViaSendGrid({
        to: config.recipients,
        subject: config.subject,
        html: htmlBody,
        text: textBody,
      });
    } else if (emailProvider === 'mailgun') {
      await sendViaMailgun({
        to: config.recipients,
        subject: config.subject,
        html: htmlBody,
        text: textBody,
      });
    }

    // Audit log
    await auditNotificationSent(
      config.type,
      config.recipients,
      config.subject
    );

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Send email via SendGrid (requires BAA)
 */
async function sendViaSendGrid(emailData: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  // Implementation using @sendgrid/mail
  // Requires: SENDGRID_API_KEY in environment variables
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: emailData.to,
    from: process.env.FROM_EMAIL || 'noreply@example.com',
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
  };

  await sgMail.send(msg);
}

/**
 * Send email via Mailgun (requires BAA)
 */
async function sendViaMailgun(emailData: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  // Implementation using Mailgun API
  // Requires: MAILGUN_API_KEY and MAILGUN_DOMAIN in environment variables
  const formData = require('form-data');
  const Mailgun = require('mailgun.js');
  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
  });

  await mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: process.env.FROM_EMAIL || 'noreply@example.com',
    to: emailData.to,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
  });
}

/**
 * Schedule notification for later sending
 */
export async function scheduleNotification(
  config: NotificationConfig
): Promise<string> {
  // Store in notification queue (database or Redis)
  // Return notification ID for tracking
  const notificationId = `notif-${Date.now()}`;

  // TODO: Implement queue storage

  return notificationId;
}

/**
 * Cancel scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<boolean> {
  // Remove from queue
  // TODO: Implement
  return true;
}

/**
 * Get notification history
 */
export async function getNotificationHistory(
  filters?: {
    type?: NotificationType;
    startDate?: Date;
    endDate?: Date;
    recipient?: string;
  }
): Promise<any[]> {
  // TODO: Implement fetching from audit logs
  return [];
}
