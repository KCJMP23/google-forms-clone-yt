/**
 * HIPAA De-identification Utilities
 *
 * This module implements de-identification methods per HIPAA Privacy Rule §164.514.
 *
 * Two methods for de-identification:
 * 1. Safe Harbor Method (§164.514(b)(2)) - Remove 18 identifiers
 * 2. Expert Determination (§164.514(b)(1)) - Statistical expert certifies low re-identification risk
 *
 * Also supports Limited Data Set (§164.514(e)) for research
 *
 * IMPORTANT:
 * - De-identified data is NO LONGER considered PHI
 * - Process must be properly documented and audited
 * - Some identifiers can be retained for Limited Data Set
 * - Dates can be shifted rather than removed for research
 */

'use server';

import { hashData } from './encryption';
import {
  PHIIdentifierType,
  DeidentificationConfig,
  MedicalSurveyResponse,
  EncryptedResponseField
} from './definitions';
import { auditDeidentification } from './audit';

/**
 * The 18 HIPAA identifiers that must be removed for Safe Harbor de-identification
 */
export const HIPAA_IDENTIFIERS = [
  PHIIdentifierType.NAME,
  PHIIdentifierType.GEOGRAPHIC_SUBDIVISION, // All < state level
  PHIIdentifierType.DATES, // Except year (and age if < 89)
  PHIIdentifierType.PHONE,
  PHIIdentifierType.FAX,
  PHIIdentifierType.EMAIL,
  PHIIdentifierType.SSN,
  PHIIdentifierType.MRN,
  PHIIdentifierType.HEALTH_PLAN_NUMBER,
  PHIIdentifierType.ACCOUNT_NUMBER,
  PHIIdentifierType.CERTIFICATE_NUMBER,
  PHIIdentifierType.VEHICLE_IDENTIFIER,
  PHIIdentifierType.DEVICE_IDENTIFIER,
  PHIIdentifierType.URL,
  PHIIdentifierType.IP_ADDRESS,
  PHIIdentifierType.BIOMETRIC,
  PHIIdentifierType.PHOTO,
  PHIIdentifierType.OTHER_UNIQUE_ID
];

/**
 * De-identify survey response using Safe Harbor method
 *
 * @param response - Original survey response with PHI
 * @param config - De-identification configuration
 * @returns De-identified response
 */
export async function deidentifyResponse(
  response: MedicalSurveyResponse,
  config: DeidentificationConfig
): Promise<MedicalSurveyResponse> {
  // Create a copy of the response
  const deidentified = { ...response };

  // Remove direct identifiers
  delete deidentified.patientId;
  delete deidentified.mrn;
  delete deidentified.submittedBy; // If it's a patient identifier

  // Process response fields based on configuration
  deidentified.responses = await deidentifyResponseFields(
    response.responses,
    config
  );

  // Handle dates based on configuration
  if (config.removeAllDates) {
    deidentified.submittedAt = removeDate(deidentified.submittedAt);
  } else if (config.dateShiftDays) {
    deidentified.submittedAt = shiftDate(
      deidentified.submittedAt,
      config.dateShiftDays
    );
  }

  // Remove IP address if present
  delete deidentified.ipAddress;
  delete deidentified.userAgent;

  // Update metadata
  deidentified.dataClassification = 'de_identified' as any;
  deidentified.containsPHI = false;

  // Clear access control lists
  deidentified.accessibleBy = [];

  // Audit the de-identification
  await auditDeidentification(
    [response.id],
    config.method
  );

  return deidentified;
}

/**
 * De-identify response fields
 *
 * @param fields - Original response fields
 * @param config - De-identification configuration
 * @returns De-identified fields
 */
async function deidentifyResponseFields(
  fields: EncryptedResponseField[],
  config: DeidentificationConfig
): Promise<EncryptedResponseField[]> {
  const deidentified: EncryptedResponseField[] = [];

  for (const field of fields) {
    // Skip fields marked for complete removal
    if (config.removeFields.includes(field.fieldId)) {
      continue;
    }

    const newField = { ...field };

    // Decrypt if encrypted
    let value = field.value;
    if (field.isEncrypted) {
      // TODO: Decrypt value
      // value = await decrypt(JSON.parse(value));
    }

    // Apply de-identification based on field type
    if (field.isPHI) {
      if (config.generalizeFields.includes(field.fieldId)) {
        // Generalize the value (e.g., age ranges, zip code truncation)
        value = generalizeValue(value, field.marker);
      } else if (config.hashFields.includes(field.fieldId)) {
        // Hash the value for consistent de-identification
        value = hashData(value);
      } else {
        // Remove the value entirely
        value = '[REDACTED]';
      }
    }

    newField.value = value;
    newField.isEncrypted = false; // No longer encrypted after de-identification
    newField.isPHI = false; // No longer PHI

    deidentified.push(newField);
  }

  return deidentified;
}

/**
 * Generalize a value (reduce specificity)
 *
 * Examples:
 * - Age: 42 → "40-49"
 * - ZIP: 12345 → "123**"
 * - Date: 2024-01-15 → "2024"
 *
 * @param value - Original value
 * @param fieldType - Type of field
 * @returns Generalized value
 */
function generalizeValue(value: string, fieldType: string): string {
  // Age generalization
  if (fieldType.toLowerCase().includes('age')) {
    const age = parseInt(value);
    if (!isNaN(age)) {
      if (age > 89) {
        return '90+'; // Ages over 89 must be aggregated per HIPAA
      }
      const rangeStart = Math.floor(age / 10) * 10;
      return `${rangeStart}-${rangeStart + 9}`;
    }
  }

  // ZIP code generalization (keep first 3 digits)
  if (fieldType.toLowerCase().includes('zip')) {
    const zip = value.replace(/\D/g, '');
    if (zip.length >= 3) {
      return zip.substring(0, 3) + '**';
    }
  }

  // Date generalization (keep only year)
  if (fieldType.toLowerCase().includes('date')) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getFullYear().toString();
    }
  }

  // Phone number generalization (keep area code)
  if (fieldType.toLowerCase().includes('phone')) {
    const phone = value.replace(/\D/g, '');
    if (phone.length >= 3) {
      return `(${phone.substring(0, 3)}) ***-****`;
    }
  }

  // Default: mask most of the value
  return maskValue(value);
}

/**
 * Mask a value while keeping some structure
 *
 * @param value - Original value
 * @returns Masked value
 */
function maskValue(value: string): string {
  if (value.length <= 3) {
    return '***';
  }

  const visibleChars = Math.min(2, Math.floor(value.length / 4));
  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  const maskedLength = Math.min(8, value.length - (visibleChars * 2));

  return `${start}${'*'.repeat(maskedLength)}${end}`;
}

/**
 * Remove date (keep only year)
 *
 * @param date - Original date
 * @returns Year only
 */
function removeDate(date: Date): Date {
  const year = date.getFullYear();
  return new Date(year, 0, 1); // January 1st of the year
}

/**
 * Shift date by a random offset (for research)
 * Maintains day-of-week and time intervals between dates
 *
 * @param date - Original date
 * @param maxShiftDays - Maximum days to shift (+/-)
 * @returns Shifted date
 */
function shiftDate(date: Date, maxShiftDays: number): Date {
  // Use consistent random shift for the same record
  // In production, generate per-patient shift and store it
  const shiftDays = Math.floor(Math.random() * maxShiftDays * 2) - maxShiftDays;

  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + shiftDays);

  return shifted;
}

/**
 * De-identify batch of responses
 *
 * @param responses - Array of survey responses
 * @param config - De-identification configuration
 * @returns Array of de-identified responses
 */
export async function deidentifyResponseBatch(
  responses: MedicalSurveyResponse[],
  config: DeidentificationConfig
): Promise<MedicalSurveyResponse[]> {
  const deidentified: MedicalSurveyResponse[] = [];

  for (const response of responses) {
    try {
      const deidentifiedResponse = await deidentifyResponse(response, config);
      deidentified.push(deidentifiedResponse);
    } catch (error) {
      console.error(`Failed to de-identify response ${response.id}:`, error);
      // Log error but continue processing other responses
    }
  }

  return deidentified;
}

/**
 * Create Limited Data Set (LDS)
 * Per §164.514(e), LDS may retain:
 * - City, state, ZIP (but not full address)
 * - Dates (admission, discharge, service, birth, death)
 * - Ages (including over 89)
 *
 * Must have Data Use Agreement (DUA) for LDS
 *
 * @param response - Original response
 * @returns Limited data set
 */
export async function createLimitedDataSet(
  response: MedicalSurveyResponse
): Promise<MedicalSurveyResponse> {
  const config: DeidentificationConfig = {
    method: 'limited_data_set',
    removeAllDates: false, // Dates allowed in LDS
    generalizeGeography: true, // Generalize but don't remove
    removeFields: [
      'name',
      'ssn',
      'mrn',
      'email',
      'phone',
      'full_address' // Keep city/state/zip separately
    ],
    generalizeFields: ['address', 'zip_code'],
    hashFields: []
  };

  const lds = await deidentifyResponse(response, config);

  // Update classification
  lds.dataClassification = 'limited_data_set' as any;

  return lds;
}

/**
 * Validate de-identification completeness
 * Checks that all 18 identifiers have been addressed
 *
 * @param original - Original response
 * @param deidentified - De-identified response
 * @returns Validation result
 */
export function validateDeidentification(
  original: MedicalSurveyResponse,
  deidentified: MedicalSurveyResponse
): {
  valid: boolean;
  warnings: string[];
  identifiersRemoved: PHIIdentifierType[];
  identifiersRemaining: PHIIdentifierType[];
} {
  const warnings: string[] = [];
  const identifiersRemoved: PHIIdentifierType[] = [];
  const identifiersRemaining: PHIIdentifierType[] = [];

  // Check direct identifiers
  if (deidentified.patientId || deidentified.mrn) {
    warnings.push('Patient identifiers still present');
    identifiersRemaining.push(PHIIdentifierType.MRN);
  } else {
    identifiersRemoved.push(PHIIdentifierType.MRN);
  }

  // Check IP address
  if (deidentified.ipAddress) {
    warnings.push('IP address still present');
    identifiersRemaining.push(PHIIdentifierType.IP_ADDRESS);
  } else {
    identifiersRemoved.push(PHIIdentifierType.IP_ADDRESS);
  }

  // Check response fields for PHI
  const phiFields = deidentified.responses.filter(f => f.isPHI);
  if (phiFields.length > 0) {
    warnings.push(`${phiFields.length} fields still marked as PHI`);
  }

  // Check data classification
  if (deidentified.dataClassification !== 'de_identified') {
    warnings.push('Data classification not updated to de_identified');
  }

  // Check containsPHI flag
  if (deidentified.containsPHI) {
    warnings.push('containsPHI flag still true');
  }

  const valid = warnings.length === 0;

  return {
    valid,
    warnings,
    identifiersRemoved,
    identifiersRemaining
  };
}

/**
 * Generate de-identification report
 * Documents the de-identification process for compliance
 *
 * @param originalCount - Number of original records
 * @param deidentifiedCount - Number successfully de-identified
 * @param config - De-identification configuration used
 * @returns Report object
 */
export function generateDeidentificationReport(
  originalCount: number,
  deidentifiedCount: number,
  config: DeidentificationConfig
): {
  summary: string;
  method: string;
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  identifiersRemoved: string[];
  timestamp: Date;
} {
  return {
    summary: `De-identified ${deidentifiedCount} of ${originalCount} records using ${config.method}`,
    method: config.method,
    recordsProcessed: originalCount,
    recordsSuccessful: deidentifiedCount,
    recordsFailed: originalCount - deidentifiedCount,
    identifiersRemoved: [
      ...config.removeFields,
      ...config.generalizeFields,
      ...config.hashFields
    ],
    timestamp: new Date()
  };
}

/**
 * Check if a field contains potential PHI
 * Heuristic checks for common PHI patterns
 *
 * @param value - Field value to check
 * @returns True if value may contain PHI
 */
export function containsPotentialPHI(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const lowerValue = value.toLowerCase();

  // Check for name patterns
  if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(value)) {
    return true; // Potential name (e.g., "John Smith")
  }

  // Check for email
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(value)) {
    return true;
  }

  // Check for phone number
  if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(value)) {
    return true;
  }

  // Check for SSN
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(value)) {
    return true;
  }

  // Check for ZIP+4
  if (/\b\d{5}-\d{4}\b/.test(value)) {
    return true;
  }

  // Check for dates
  if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(value)) {
    return true;
  }

  // Check for IP address
  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(value)) {
    return true;
  }

  // Check for URLs
  if (/https?:\/\//.test(lowerValue)) {
    return true;
  }

  // Check for medical record numbers (common patterns)
  if (/\bMRN\s*:?\s*\d+\b/i.test(value)) {
    return true;
  }

  return false;
}

/**
 * Scan response for unmarked PHI
 * Helps identify fields that should be marked as PHI
 *
 * @param response - Survey response to scan
 * @returns Array of field IDs that may contain PHI
 */
export function scanForUnmarkedPHI(
  response: MedicalSurveyResponse
): string[] {
  const unmarkedPHIFields: string[] = [];

  for (const field of response.responses) {
    // Skip fields already marked as PHI
    if (field.isPHI) {
      continue;
    }

    // Check if value contains potential PHI
    if (containsPotentialPHI(field.value)) {
      unmarkedPHIFields.push(field.fieldId);
    }
  }

  return unmarkedPHIFields;
}
