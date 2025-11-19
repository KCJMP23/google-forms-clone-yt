/**
 * Form Builder Type Definitions
 * Supports drag-and-drop visual form creation with HIPAA compliance
 */

import { PHIIdentifierType } from './definitions';

export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'file'
  | 'signature'
  | 'rating'
  | 'slider'
  | 'matrix';

export interface ConditionalLogic {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
  value: string | number | boolean;
  action: 'show' | 'hide' | 'require' | 'setValue';
  targetFieldId?: string;
  targetValue?: any;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'url' | 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength';
  value?: string | number;
  message?: string;
}

export interface FormFieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;

  // PHI Detection
  isPHI: boolean;
  phiType?: PHIIdentifierType;
  autoDetectedPHI?: boolean;

  // Options for select/radio/checkbox
  options?: FormFieldOption[];

  // Validation
  validation?: ValidationRule[];

  // Conditional Logic
  conditionalLogic?: ConditionalLogic[];

  // Field-specific settings
  minValue?: number;
  maxValue?: number;
  step?: number;
  maxLength?: number;
  accept?: string; // For file uploads
  multiple?: boolean;

  // Layout
  width?: 'full' | 'half' | 'third';
  order: number;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  order: number;
  conditionalLogic?: ConditionalLogic[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'patient-intake' | 'satisfaction' | 'consent' | 'screening' | 'research' | 'feedback';
  sections: FormSection[];
  isPHI: boolean;
  previewImage?: string;
}

export interface FormBuilderState {
  formId?: string;
  title: string;
  description: string;
  sections: FormSection[];
  settings: FormSettings;
  isDirty: boolean;
  lastSaved?: Date;
}

export interface FormSettings {
  // General
  allowAnonymous: boolean;
  requireConsent: boolean;
  consentText?: string;

  // Distribution
  isPublic: boolean;
  expiresAt?: Date;
  maxResponses?: number;
  allowMultipleSubmissions: boolean;

  // Notifications
  notifyOnSubmission: boolean;
  notificationEmails: string[];

  // HIPAA
  containsPHI: boolean;
  dataClassification: 'PHI' | 'De-identified' | 'Anonymous' | 'Limited Data Set';
  retentionPeriodDays: number;
  allowedRoles: string[];

  // Design
  theme?: 'default' | 'medical' | 'research';
  logo?: string;
  primaryColor?: string;

  // Advanced
  enableAutoSave: boolean;
  showProgressBar: boolean;
  redirectUrl?: string;
  customSuccessMessage?: string;
}

// Pre-built templates
export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'patient-intake',
    name: 'Patient Intake Form',
    description: 'Comprehensive new patient intake with demographics and medical history',
    category: 'patient-intake',
    isPHI: true,
    sections: [
      {
        id: 'demographics',
        title: 'Patient Demographics',
        description: 'Basic patient information',
        order: 0,
        fields: [
          {
            id: 'full-name',
            type: 'text',
            label: 'Full Name',
            required: true,
            isPHI: true,
            phiType: PHIIdentifierType.NAME,
            autoDetectedPHI: true,
            order: 0,
          },
          {
            id: 'dob',
            type: 'date',
            label: 'Date of Birth',
            required: true,
            isPHI: true,
            phiType: PHIIdentifierType.DATE_OF_BIRTH,
            autoDetectedPHI: true,
            order: 1,
          },
          {
            id: 'mrn',
            type: 'text',
            label: 'Medical Record Number',
            required: false,
            isPHI: true,
            phiType: PHIIdentifierType.MEDICAL_RECORD,
            autoDetectedPHI: true,
            order: 2,
          },
        ],
      },
    ],
  },
  {
    id: 'satisfaction-survey',
    name: 'Patient Satisfaction Survey',
    description: 'Anonymous patient feedback on care quality',
    category: 'satisfaction',
    isPHI: false,
    sections: [
      {
        id: 'experience',
        title: 'Your Experience',
        description: 'Please rate your recent visit',
        order: 0,
        fields: [
          {
            id: 'overall-rating',
            type: 'rating',
            label: 'Overall satisfaction with your visit',
            required: true,
            isPHI: false,
            minValue: 1,
            maxValue: 5,
            order: 0,
          },
          {
            id: 'recommend',
            type: 'radio',
            label: 'How likely are you to recommend our facility?',
            required: true,
            isPHI: false,
            options: [
              { id: '1', label: 'Very Unlikely', value: '1' },
              { id: '2', label: 'Unlikely', value: '2' },
              { id: '3', label: 'Neutral', value: '3' },
              { id: '4', label: 'Likely', value: '4' },
              { id: '5', label: 'Very Likely', value: '5' },
            ],
            order: 1,
          },
        ],
      },
    ],
  },
];
