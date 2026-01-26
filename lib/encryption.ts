/**
 * HIPAA-Compliant Encryption Utilities
 *
 * This module provides AES-256-GCM encryption for Protected Health Information (PHI).
 *
 * IMPORTANT PRODUCTION REQUIREMENTS:
 * - Use AWS KMS, Azure Key Vault, or similar for key management
 * - Never store encryption keys in code or environment variables in production
 * - Implement key rotation policies
 * - Use Hardware Security Modules (HSM) for key storage
 * - Audit all encryption/decryption operations
 *
 * For development, this uses environment-based keys with proper warnings.
 */

import crypto from 'crypto';

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded authentication tag
  keyId: string; // Reference to the encryption key used
  algorithm: string; // Encryption algorithm used
  version: number; // Encryption version for future migrations
}

/**
 * Get encryption key from environment or KMS
 *
 * PRODUCTION: Replace this with KMS/Key Vault integration
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY_BASE64;

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: ENCRYPTION_KEY not configured in production. ' +
        'PHI encryption requires a properly configured key management system.'
      );
    }

    // Development fallback - NOT FOR PRODUCTION
    console.warn(
      '⚠️  WARNING: Using default encryption key for development. ' +
      'DO NOT use in production with real PHI data!'
    );

    // Generate a consistent key for development
    return crypto.createHash('sha256')
      .update('dev-key-do-not-use-in-production')
      .digest();
  }

  // Support base64-encoded keys
  if (key.length === 44 && /^[A-Za-z0-9+/]+=*$/.test(key)) {
    return Buffer.from(key, 'base64');
  }

  // Support hex-encoded keys
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // Hash the key if it's a passphrase
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Get current encryption key ID
 * Used for key rotation tracking
 */
function getEncryptionKeyId(): string {
  return process.env.ENCRYPTION_KEY_ID || 'default-key-v1';
}

/**
 * Encrypt sensitive data (PHI)
 *
 * @param plaintext - The data to encrypt
 * @param keyId - Optional specific key ID to use
 * @returns Encrypted data with metadata
 */
export async function encrypt(
  plaintext: string,
  keyId?: string
): Promise<EncryptedData> {
  try {
    // Validate input
    if (!plaintext) {
      throw new Error('Cannot encrypt empty data');
    }

    // Get encryption key
    const key = getEncryptionKey();
    const actualKeyId = keyId || getEncryptionKeyId();

    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return encrypted data structure
    return {
      data: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: actualKeyId,
      algorithm: ALGORITHM,
      version: 1
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data (PHI)
 *
 * @param encryptedData - The encrypted data structure
 * @returns Decrypted plaintext
 */
export async function decrypt(encryptedData: EncryptedData): Promise<string> {
  try {
    // Validate input
    if (!encryptedData || !encryptedData.data) {
      throw new Error('Invalid encrypted data');
    }

    // Get encryption key (should match the keyId in production)
    const key = getEncryptionKey();

    // Decode base64 values
    const encryptedBuffer = Buffer.from(encryptedData.data, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or key mismatch');
  }
}

/**
 * Encrypt multiple fields in an object
 * Useful for encrypting survey responses
 *
 * @param data - Object with string values to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export async function encryptFields<T extends Record<string, any>>(
  data: T,
  fieldsToEncrypt: (keyof T)[]
): Promise<T> {
  const result = { ...data };

  for (const field of fieldsToEncrypt) {
    if (data[field] && typeof data[field] === 'string') {
      const encrypted = await encrypt(data[field] as string);
      result[field] = JSON.stringify(encrypted) as any;
    }
  }

  return result;
}

/**
 * Decrypt multiple fields in an object
 *
 * @param data - Object with encrypted string values
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export async function decryptFields<T extends Record<string, any>>(
  data: T,
  fieldsToDecrypt: (keyof T)[]
): Promise<T> {
  const result = { ...data };

  for (const field of fieldsToDecrypt) {
    if (data[field] && typeof data[field] === 'string') {
      try {
        const encryptedData: EncryptedData = JSON.parse(data[field] as string);
        result[field] = await decrypt(encryptedData) as any;
      } catch (error) {
        console.error(`Failed to decrypt field ${String(field)}:`, error);
        // Keep encrypted value if decryption fails
      }
    }
  }

  return result;
}

/**
 * Hash data for one-way encryption (useful for de-identification)
 * Uses HMAC-SHA256 for consistent hashing
 *
 * @param data - Data to hash
 * @param salt - Optional salt (uses key if not provided)
 * @returns Hashed value (hex string)
 */
export function hashData(data: string, salt?: string): string {
  const key = salt || getEncryptionKey().toString('hex');
  return crypto.createHmac('sha256', key)
    .update(data)
    .digest('hex');
}

/**
 * Generate a random token (for consent IDs, etc.)
 *
 * @param length - Length in bytes (default 32)
 * @returns Random token as hex string
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Securely compare two strings (constant-time)
 * Prevents timing attacks
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings match
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate encryption key for development/setup
 * USE ONLY for initial setup, not in production
 *
 * @returns Base64-encoded 256-bit key
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  const base64Key = key.toString('base64');

  console.log('\n🔐 Generated Encryption Key (Base64):');
  console.log(base64Key);
  console.log('\n⚠️  IMPORTANT: Store this securely!');
  console.log('Add to .env.local:');
  console.log(`ENCRYPTION_KEY_BASE64=${base64Key}`);
  console.log(`ENCRYPTION_KEY_ID=key-${Date.now()}\n`);
  console.log('❌ NEVER commit this key to version control!');
  console.log('✅ In production, use AWS KMS, Azure Key Vault, or similar.\n');

  return base64Key;
}

/**
 * Mask sensitive data for logging (shows first/last characters)
 *
 * @param data - Sensitive string to mask
 * @param visible - Number of characters to show on each end (default 2)
 * @returns Masked string
 */
export function maskForLogging(data: string, visible: number = 2): string {
  if (!data || data.length <= visible * 2) {
    return '***';
  }

  const start = data.substring(0, visible);
  const end = data.substring(data.length - visible);
  const masked = '*'.repeat(Math.min(8, data.length - visible * 2));

  return `${start}${masked}${end}`;
}

/**
 * Check if data is encrypted (has EncryptedData structure)
 *
 * @param data - Data to check
 * @returns True if data appears to be encrypted
 */
export function isEncrypted(data: any): data is EncryptedData {
  return (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    'iv' in data &&
    'authTag' in data &&
    'keyId' in data &&
    'algorithm' in data
  );
}

/**
 * Safely encrypt data if it's not already encrypted
 *
 * @param data - Data to encrypt (string or EncryptedData)
 * @returns EncryptedData
 */
export async function ensureEncrypted(
  data: string | EncryptedData
): Promise<EncryptedData> {
  if (isEncrypted(data)) {
    return data;
  }

  if (typeof data === 'string') {
    return encrypt(data);
  }

  throw new Error('Invalid data type for encryption');
}

/**
 * Safely decrypt data if it's encrypted, otherwise return as-is
 *
 * @param data - Data to decrypt (string or EncryptedData)
 * @returns Decrypted string
 */
export async function ensureDecrypted(
  data: string | EncryptedData
): Promise<string> {
  if (isEncrypted(data)) {
    return decrypt(data);
  }

  if (typeof data === 'string') {
    return data;
  }

  throw new Error('Invalid data type for decryption');
}

// Export for CLI usage
if (require.main === module) {
  // Generate a new encryption key
  generateEncryptionKey();
}
