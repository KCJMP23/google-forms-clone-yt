/**
 * Participant Management System
 * Track participants across surveys with consent management
 */

import { DataClassification } from './definitions';

export interface Participant {
  id: string;
  mrn?: string; // Medical Record Number (PHI)
  email?: string;
  phone?: string;
  enrolledAt: Date;
  cohortIds: string[];
  consentStatus: ConsentStatus[];
  surveyHistory: SurveyResponse[];
  communicationPreferences: {
    emailReminders: boolean;
    smsReminders: boolean;
    preferredLanguage: string;
  };
  optedOut: boolean;
  withdrawalDate?: Date;
}

export interface ConsentStatus {
  id: string;
  surveyId: string;
  consentType: string;
  grantedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'expired' | 'withdrawn';
  documentUrl?: string;
}

export interface SurveyResponse {
  surveyId: string;
  responseId: string;
  submittedAt: Date;
  completionStatus: 'completed' | 'partial' | 'abandoned';
}

export interface Cohort {
  id: string;
  name: string;
  description: string;
  participantIds: string[];
  createdAt: Date;
  criteria?: Record<string, any>;
}

export async function getParticipant(participantId: string): Promise<Participant | null> {
  // TODO: Fetch from database
  return null;
}

export async function linkResponseToParticipant(
  participantId: string,
  responseId: string
): Promise<void> {
  // TODO: Implement
}

export async function getParticipantsByCohort(cohortId: string): Promise<Participant[]> {
  // TODO: Fetch from database
  return [];
}

export async function withdrawParticipant(
  participantId: string,
  reason?: string
): Promise<void> {
  // TODO: Implement withdrawal with audit logging
}
