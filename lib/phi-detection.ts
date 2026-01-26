/**
 * PHI Field Detection Utilities
 *
 * Provides utilities to detect if a form field likely contains PHI
 * based on field names, markers, and labels.
 *
 * This is a heuristic approach for detecting PHI fields from
 * external CMS systems that don't have built-in PHI marking.
 */

import { PHIIdentifierType } from './definitions';

/**
 * Common PHI field patterns based on HIPAA identifiers
 */
const PHI_PATTERNS: Array<{
  pattern: RegExp;
  phiType: PHIIdentifierType;
  description: string;
}> = [
  {
    pattern: /name|patient.*name|full.*name|first.*name|last.*name|middle.*name/i,
    phiType: PHIIdentifierType.NAME,
    description: 'Name',
  },
  {
    pattern: /address|street|city|state|zip|postal.*code|location/i,
    phiType: PHIIdentifierType.ADDRESS,
    description: 'Geographic Location',
  },
  {
    pattern: /phone|telephone|mobile|cell/i,
    phiType: PHIIdentifierType.PHONE,
    description: 'Phone Number',
  },
  {
    pattern: /fax/i,
    phiType: PHIIdentifierType.FAX,
    description: 'Fax Number',
  },
  {
    pattern: /email|e-mail/i,
    phiType: PHIIdentifierType.EMAIL,
    description: 'Email Address',
  },
  {
    pattern: /ssn|social.*security/i,
    phiType: PHIIdentifierType.SSN,
    description: 'Social Security Number',
  },
  {
    pattern: /mrn|medical.*record.*number|patient.*id|chart.*number/i,
    phiType: PHIIdentifierType.MEDICAL_RECORD,
    description: 'Medical Record Number',
  },
  {
    pattern: /dob|date.*of.*birth|birth.*date|birthday/i,
    phiType: PHIIdentifierType.DATE_OF_BIRTH,
    description: 'Date of Birth',
  },
  {
    pattern: /insurance|policy.*number|subscriber.*id|member.*id/i,
    phiType: PHIIdentifierType.HEALTH_PLAN,
    description: 'Health Plan Number',
  },
  {
    pattern: /account.*number|patient.*account/i,
    phiType: PHIIdentifierType.ACCOUNT_NUMBER,
    description: 'Account Number',
  },
  {
    pattern: /certificate|license.*number|vehicle/i,
    phiType: PHIIdentifierType.CERTIFICATE_LICENSE,
    description: 'Certificate/License Number',
  },
  {
    pattern: /ip.*address/i,
    phiType: PHIIdentifierType.IP_ADDRESS,
    description: 'IP Address',
  },
  {
    pattern: /photo|image|picture|biometric|fingerprint|retina|voice/i,
    phiType: PHIIdentifierType.BIOMETRIC,
    description: 'Biometric Identifier',
  },
];

/**
 * Check if a field marker or label suggests it contains PHI
 *
 * @param marker - Field marker/ID from CMS
 * @param label - Field label text
 * @returns PHI detection result with type and description
 */
export function detectPHI(
  marker: string,
  label: string
): {
  isPHI: boolean;
  phiType?: PHIIdentifierType;
  description?: string;
} | null {
  const combinedText = `${marker} ${label}`.toLowerCase();

  for (const { pattern, phiType, description } of PHI_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        isPHI: true,
        phiType,
        description,
      };
    }
  }

  return null;
}

/**
 * Check if a field is likely to contain PHI
 *
 * @param marker - Field marker/ID
 * @param label - Field label
 * @returns True if field likely contains PHI
 */
export function isPHIField(marker: string, label: string): boolean {
  const detection = detectPHI(marker, label);
  return detection?.isPHI ?? false;
}

/**
 * Get PHI type for a field
 *
 * @param marker - Field marker/ID
 * @param label - Field label
 * @returns PHI identifier type if detected
 */
export function getPHIType(
  marker: string,
  label: string
): PHIIdentifierType | undefined {
  const detection = detectPHI(marker, label);
  return detection?.phiType;
}

/**
 * Get human-readable PHI description for a field
 *
 * @param marker - Field marker/ID
 * @param label - Field label
 * @returns PHI type description if detected
 */
export function getPHIDescription(
  marker: string,
  label: string
): string | undefined {
  const detection = detectPHI(marker, label);
  return detection?.description;
}
