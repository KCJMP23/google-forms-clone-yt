/**
 * Secure File Storage with HIPAA Compliance
 * GCP Cloud Storage with Customer-Managed Encryption Keys (CMEK)
 */

import { auditFileUpload, auditFileAccess, auditFileDelete } from './audit';

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  encrypted: boolean;
  encryptionKeyId?: string;
  isPHI: boolean;
  surveyId?: string;
  responseId?: string;
  virusScanStatus: 'pending' | 'clean' | 'infected';
  virusScanDate?: Date;
  storageUrl: string; // GCP Cloud Storage URL
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Upload file to secure storage
 */
export async function uploadFile(
  file: File,
  userId: string,
  metadata: Partial<FileMetadata>
): Promise<FileMetadata> {
  // Validate file
  validateFile(file);

  // Generate unique filename
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const filename = `${fileId}-${file.name}`;

  // Upload to GCP Cloud Storage with CMEK
  const storageUrl = await uploadToGCS(file, filename, metadata.isPHI || false);

  // Scan for viruses
  const virusScanStatus = await scanFileForViruses(storageUrl);

  const fileMetadata: FileMetadata = {
    id: fileId,
    filename,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedBy: userId,
    uploadedAt: new Date(),
    encrypted: metadata.isPHI || false,
    encryptionKeyId: metadata.isPHI ? process.env.GCP_KMS_KEY_ID : undefined,
    isPHI: metadata.isPHI || false,
    surveyId: metadata.surveyId,
    responseId: metadata.responseId,
    virusScanStatus,
    storageUrl,
  };

  // Save metadata to database
  // TODO: Implement database storage

  // Audit log
  await auditFileUpload(fileId, filename, userId, metadata.isPHI || false);

  return fileMetadata;
}

/**
 * Validate file before upload
 */
function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }
}

/**
 * Upload to Google Cloud Storage
 */
async function uploadToGCS(
  file: File,
  filename: string,
  isPHI: boolean
): Promise<string> {
  // Using @google-cloud/storage
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();

  const bucketName = isPHI
    ? process.env.GCP_PHI_BUCKET
    : process.env.GCP_FILES_BUCKET;

  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(filename);

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload with encryption
  await blob.save(buffer, {
    metadata: {
      contentType: file.type,
      metadata: {
        isPHI: String(isPHI),
        uploadedAt: new Date().toISOString(),
      },
    },
    // Customer-managed encryption key for PHI
    ...(isPHI && {
      kmsKeyName: process.env.GCP_KMS_KEY_NAME,
    }),
  });

  return `gs://${bucketName}/${filename}`;
}

/**
 * Scan file for viruses using Cloud Security Scanner or ClamAV
 */
async function scanFileForViruses(fileUrl: string): Promise<'pending' | 'clean' | 'infected'> {
  // TODO: Implement virus scanning
  // Options:
  // 1. GCP Security Command Center
  // 2. ClamAV integration
  // 3. Third-party service with BAA

  return 'clean'; // Placeholder
}

/**
 * Download file (with audit logging)
 */
export async function downloadFile(
  fileId: string,
  userId: string
): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
  // Get file metadata
  const metadata = await getFileMetadata(fileId);

  if (!metadata) {
    throw new Error('File not found');
  }

  // Check if virus scan passed
  if (metadata.virusScanStatus === 'infected') {
    throw new Error('File is infected and cannot be downloaded');
  }

  // Download from GCS
  const buffer = await downloadFromGCS(metadata.storageUrl);

  // Audit log
  await auditFileAccess(fileId, userId, metadata.isPHI);

  return { buffer, metadata };
}

async function downloadFromGCS(storageUrl: string): Promise<Buffer> {
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();

  // Parse GCS URL: gs://bucket/filename
  const matches = storageUrl.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) {
    throw new Error('Invalid storage URL');
  }

  const [, bucketName, filename] = matches;
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filename);

  const [buffer] = await file.download();
  return buffer;
}

/**
 * Delete file (with audit logging)
 */
export async function deleteFile(fileId: string, userId: string): Promise<void> {
  const metadata = await getFileMetadata(fileId);

  if (!metadata) {
    throw new Error('File not found');
  }

  // Delete from GCS
  await deleteFromGCS(metadata.storageUrl);

  // Delete metadata from database
  // TODO: Implement

  // Audit log
  await auditFileDelete(fileId, userId, metadata.isPHI);
}

async function deleteFromGCS(storageUrl: string): Promise<void> {
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();

  const matches = storageUrl.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) {
    throw new Error('Invalid storage URL');
  }

  const [, bucketName, filename] = matches;
  await storage.bucket(bucketName).file(filename).delete();
}

async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  // TODO: Fetch from database
  return null;
}
