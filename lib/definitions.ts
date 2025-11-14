import { HTMLInputTypeAttribute } from "react";

export const attributeTypeToInputType: Record<string, HTMLInputTypeAttribute> =
  {
    string: "text",
    text: "text",
    textWithHeader: "text",
    integer: "number",
    real: "number",
    float: "number",
    dateAndTime: "datetime-local",
    date: "date",
    time: "time",
    file: "file",
    image: "file",
    groupOfImages: "file",
    radioButton: "radio",
    list: "radio",
    button: "button",
  };

export type FormDataItem = {
  marker?: string;
  value?: string;
};

export type IndividualResponse = {
  value: string;
  count: number;
  marker: string;
};

export type AttributeCount = {
  [key: string]: number;
};

// ============================================================================
// HIPAA-Compliant Medical Survey System Types
// ============================================================================

/**
 * Survey categories for medical use cases
 */
export enum SurveyCategory {
  PATIENT_SATISFACTION = 'patient_satisfaction',
  CLINICAL_RESEARCH = 'clinical_research',
  PROVIDER_FEEDBACK = 'provider_feedback',
  PATIENT_EDUCATION = 'patient_education',
  SCREENING_ASSESSMENT = 'screening_assessment',
  CONSENT_FORM = 'consent_form',
  INTAKE_FORM = 'intake_form',
  FOLLOW_UP = 'follow_up',
}

/**
 * Data classification per HIPAA requirements
 */
export enum DataClassification {
  PHI = 'phi',                          // Contains Protected Health Information
  DE_IDENTIFIED = 'de_identified',      // De-identified per §164.514
  ANONYMOUS = 'anonymous',               // No identifiers collected
  LIMITED_DATA_SET = 'limited_data_set', // Limited data set per §164.514(e)
}

/**
 * User roles for Role-Based Access Control (RBAC)
 */
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  COMPLIANCE_OFFICER = 'compliance_officer',
  PHYSICIAN = 'physician',
  PROVIDER = 'provider',
  RESEARCH_COORDINATOR = 'research_coordinator',
  CLINICAL_STAFF = 'clinical_staff',
  PATIENT = 'patient',
  AUDITOR = 'auditor',
  GUEST = 'guest',
}

/**
 * Audit action types for logging
 */
export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  VIEW_PHI = 'view_phi',
  CREATE_SURVEY = 'create_survey',
  EDIT_SURVEY = 'edit_survey',
  DELETE_SURVEY = 'delete_survey',
  SUBMIT_RESPONSE = 'submit_response',
  VIEW_RESPONSE = 'view_response',
  EXPORT_DATA = 'export_data',
  GRANT_ACCESS = 'grant_access',
  REVOKE_ACCESS = 'revoke_access',
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_WITHDRAWN = 'consent_withdrawn',
  DATA_DEIDENTIFIED = 'data_deidentified',
  DATA_DELETED = 'data_deleted',
  BREACH_DETECTED = 'breach_detected',
}

/**
 * Survey status
 */
export enum SurveyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
  UNDER_REVIEW = 'under_review',
}

/**
 * Consent types
 */
export enum ConsentType {
  SURVEY_PARTICIPATION = 'survey_participation',
  RESEARCH_PARTICIPATION = 'research_participation',
  DATA_SHARING = 'data_sharing',
  TREATMENT = 'treatment',
  PARENTAL_CONSENT = 'parental_consent',
}

/**
 * Medical survey with HIPAA compliance metadata
 */
export interface MedicalSurvey {
  id: string;
  title: string;
  description?: string;
  category: SurveyCategory;
  dataClassification: DataClassification;
  containsPHI: boolean;
  consentRequired: boolean;
  consentTemplateId?: string;
  retentionPeriodDays: number;
  allowedRoles: UserRole[];
  createdBy: string;
  organizationId: string;
  departmentId?: string;
  irbApprovalNumber?: string; // For clinical research
  version: number;
  status: SurveyStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;

  // Form structure (from OneEntry or custom)
  fields: SurveyField[];

  // Access control
  assignedProviders?: string[]; // User IDs who can access responses
  assignedPatients?: string[]; // Patient IDs who can complete survey
}

/**
 * Survey field with PHI marking capability
 */
export interface SurveyField {
  id: string;
  marker: string;
  label: string;
  type: string; // Maps to attributeTypeToInputType
  required: boolean;
  isPHI: boolean; // Mark if this field contains PHI
  phiType?: PHIIdentifierType; // Type of PHI if applicable
  options?: string[]; // For radio, select, etc.
  validation?: FieldValidation;
  helpText?: string;
  order: number;
}

/**
 * 18 HIPAA identifiers that must be removed for de-identification
 */
export enum PHIIdentifierType {
  NAME = 'name',
  GEOGRAPHIC_SUBDIVISION = 'geographic_subdivision', // Smaller than state
  DATES = 'dates', // Birth, admission, discharge, death, age > 89
  PHONE = 'phone',
  FAX = 'fax',
  EMAIL = 'email',
  SSN = 'ssn',
  MRN = 'mrn', // Medical record number
  HEALTH_PLAN_NUMBER = 'health_plan_number',
  ACCOUNT_NUMBER = 'account_number',
  CERTIFICATE_NUMBER = 'certificate_number',
  VEHICLE_IDENTIFIER = 'vehicle_identifier',
  DEVICE_IDENTIFIER = 'device_identifier',
  URL = 'url',
  IP_ADDRESS = 'ip_address',
  BIOMETRIC = 'biometric',
  PHOTO = 'photo',
  OTHER_UNIQUE_ID = 'other_unique_id',
}

/**
 * Field validation rules
 */
export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string; // Regex pattern
  minLength?: number;
  maxLength?: number;
  customValidator?: string; // Reference to custom validation function
}

/**
 * Encrypted survey response
 */
export interface MedicalSurveyResponse {
  id: string;
  surveyId: string;
  surveyVersion: number;

  // Patient information (encrypted if PHI)
  patientId?: string; // Encrypted reference
  mrn?: string; // Encrypted

  // Response data (encrypted if contains PHI)
  responses: EncryptedResponseField[];

  // Consent tracking
  consentId?: string;
  consentVerified: boolean;

  // Metadata
  submittedAt: Date;
  submittedBy: string; // User ID who submitted (may be patient or staff)
  submittedByRole: UserRole;
  ipAddress?: string; // Optional, configurable
  userAgent?: string;

  // Data classification
  dataClassification: DataClassification;
  containsPHI: boolean;

  // Access control
  accessibleBy: string[]; // User IDs who can access this response
  organizationId: string;
  departmentId?: string;

  // Status
  status: 'draft' | 'submitted' | 'verified' | 'amended' | 'deleted';
  deletedAt?: Date;
  deletionReason?: string;
}

/**
 * Individual response field (may be encrypted)
 */
export interface EncryptedResponseField {
  fieldId: string;
  marker: string;
  value: string; // Encrypted if isPHI=true
  isEncrypted: boolean;
  isPHI: boolean;
  encryptionKeyId?: string; // Reference to encryption key used
}

/**
 * Audit log entry for HIPAA compliance
 */
export interface AuditLog {
  id: string;
  timestamp: Date;

  // User information
  userId: string;
  userRole: UserRole;
  userName?: string; // Cached for reporting

  // Action details
  action: AuditAction;
  resourceType: string; // 'survey', 'response', 'user', etc.
  resourceId: string;

  // PHI tracking
  phiAccessed: boolean;
  phiFields?: string[]; // List of PHI fields accessed

  // Context
  ipAddress: string;
  userAgent: string;
  sessionId: string;

  // Change tracking
  changes?: {
    before?: any;
    after?: any;
  };

  // Break-glass access
  accessJustification?: string; // Required for emergency access
  isEmergencyAccess: boolean;

  // Organization
  organizationId: string;
  departmentId?: string;

  // Status
  success: boolean;
  errorMessage?: string;
}

/**
 * Consent record for patient agreements
 */
export interface ConsentRecord {
  id: string;

  // Patient information
  patientId: string; // Encrypted
  patientName?: string; // Encrypted, for verification

  // Consent details
  consentType: ConsentType;
  surveyId?: string; // If consent is for a specific survey
  researchStudyId?: string; // If consent is for research

  // Status
  granted: boolean;
  grantedAt?: Date;
  withdrawnAt?: Date;

  // Signature
  signature: string; // Digital signature or typed name
  signatureMethod: 'typed' | 'drawn' | 'electronic';
  ipAddress: string;

  // Document
  consentDocumentUrl?: string; // Link to signed PDF
  consentVersion: number; // Track version of consent form

  // Witness (if required)
  witnessName?: string;
  witnessSignature?: string;
  witnessedAt?: Date;

  // Parental consent for minors
  isMinor?: boolean;
  parentGuardianName?: string;
  parentGuardianRelationship?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
}

/**
 * User profile with HIPAA roles and permissions
 */
export interface UserProfile {
  id: string;
  email: string;

  // Identity
  firstName: string;
  lastName: string;
  fullName: string;

  // Role and permissions
  role: UserRole;
  permissions: string[]; // Granular permissions

  // Medical credentials (for providers)
  npi?: string; // National Provider Identifier
  licenseNumber?: string;
  specialty?: string;
  credentials?: string; // MD, RN, PA, etc.

  // Organization
  organizationId: string;
  departmentId?: string;

  // Security
  mfaEnabled: boolean;
  lastLogin?: Date;
  lastPasswordChange?: Date;
  mustChangePassword: boolean;
  accountLocked: boolean;
  lockoutReason?: string;

  // Training
  hipaaTrainingCompletedAt?: Date;
  hipaaTrainingExpiresAt?: Date;

  // Status
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session information for timeout tracking
 */
export interface UserSession {
  id: string;
  userId: string;
  userRole: UserRole;

  // Session timing
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;

  // Security
  ipAddress: string;
  userAgent: string;

  // Timeout settings (based on role)
  timeoutMinutes: number;
  warningMinutes: number;
}

/**
 * De-identification configuration
 */
export interface DeidentificationConfig {
  method: 'safe_harbor' | 'expert_determination' | 'limited_data_set';
  removeAllDates: boolean;
  dateShiftDays?: number; // Random date shifting for research
  generalizeGeography: boolean; // Zip to first 3 digits, etc.
  removeFields: string[]; // Field IDs to completely remove
  generalizeFields: string[]; // Field IDs to generalize (e.g., age ranges)
  hashFields: string[]; // Field IDs to hash for consistent de-identification
  expertCertificationId?: string; // If using expert determination
}

/**
 * Data retention policy
 */
export interface RetentionPolicy {
  id: string;
  surveyCategory: SurveyCategory;
  retentionPeriodDays: number;
  archiveAfterDays?: number;
  deleteAfterDays?: number;
  notifyBeforeDeletionDays: number;
  requiresApproval: boolean;
  approvalRole: UserRole;
  organizationId: string;
}

/**
 * Breach notification record
 */
export interface BreachNotification {
  id: string;

  // Incident details
  detectedAt: Date;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Affected data
  affectedRecordCount: number;
  affectedPatientIds: string[];
  phiExposed: PHIIdentifierType[];

  // Response
  containedAt?: Date;
  mitigationSteps: string[];

  // Notification
  securityOfficerNotifiedAt?: Date;
  patientsNotifiedAt?: Date;
  hhs_NotifiedAt?: Date; // If breach affects 500+ individuals

  // Investigation
  rootCause?: string;
  investigationNotes: string;
  status: 'detected' | 'investigating' | 'contained' | 'resolved';

  organizationId: string;
}
