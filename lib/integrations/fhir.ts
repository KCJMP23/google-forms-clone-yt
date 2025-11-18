/**
 * FHIR/EHR Integration
 * HL7 FHIR R4 integration for Electronic Health Record systems
 * Supports Epic, Cerner, and other FHIR-compliant EHR systems
 * HIPAA-compliant with OAuth2 authentication and audit logging
 */

import Client from 'fhir-kit-client';
import { auditLog, auditPHIAccess } from '../audit';

export interface FHIRConfig {
  baseUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string;
  tokenUrl?: string;
  authorizeUrl?: string;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
    type?: {
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
  }>;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{
    system: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
    value: string;
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  }>;
  address?: Array<{
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export interface FHIRQuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  id?: string;
  questionnaire?: string;
  status: 'in-progress' | 'completed' | 'amended' | 'entered-in-error' | 'stopped';
  subject?: {
    reference: string;
    display?: string;
  };
  authored?: string;
  author?: {
    reference: string;
    display?: string;
  };
  item?: FHIRQuestionnaireResponseItem[];
}

export interface FHIRQuestionnaireResponseItem {
  linkId: string;
  text?: string;
  answer?: Array<{
    valueString?: string;
    valueBoolean?: boolean;
    valueInteger?: number;
    valueDecimal?: number;
    valueDate?: string;
    valueDateTime?: string;
    valueTime?: string;
    valueCoding?: {
      system?: string;
      code?: string;
      display?: string;
    };
  }>;
  item?: FHIRQuestionnaireResponseItem[];
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id?: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  code: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueQuantity?: {
    value: number;
    unit?: string;
    system?: string;
    code?: string;
  };
}

/**
 * FHIR Client
 */
export class FHIRClient {
  private client: Client;
  private config: FHIRConfig;
  private userId: string;

  constructor(config: FHIRConfig, userId: string) {
    this.config = config;
    this.userId = userId;

    this.client = new Client({
      baseUrl: config.baseUrl,
    });
  }

  /**
   * Authenticate with OAuth2 (for Epic, Cerner, etc.)
   */
  async authenticate(accessToken: string): Promise<void> {
    this.client = new Client({
      baseUrl: this.config.baseUrl,
      customHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthorizationUrl(): string {
    if (!this.config.authorizeUrl) {
      throw new Error('Authorization URL not configured');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri || '',
      scope: this.config.scope || 'patient/*.read',
      state: this.generateState(),
    });

    return `${this.config.authorizeUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    refresh_token?: string;
    patient?: string;
  }> {
    if (!this.config.tokenUrl) {
      throw new Error('Token URL not configured');
    }

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri || '',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Search for patients
   */
  async searchPatients(params: {
    family?: string;
    given?: string;
    birthdate?: string;
    identifier?: string;
    mrn?: string;
  }): Promise<FHIRPatient[]> {
    const searchParams: any = {};

    if (params.family) searchParams.family = params.family;
    if (params.given) searchParams.given = params.given;
    if (params.birthdate) searchParams.birthdate = params.birthdate;
    if (params.identifier) searchParams.identifier = params.identifier;

    if (params.mrn) {
      searchParams.identifier = `http://hospital.org/identifier/mrn|${params.mrn}`;
    }

    const response = await this.client.search({
      resourceType: 'Patient',
      searchParams,
    });

    // Audit PHI access
    await auditPHIAccess(
      'search_patients',
      'fhir_patient',
      ['name', 'identifier', 'birthDate'],
      this.userId,
      { searchParams }
    );

    return this.extractResources(response);
  }

  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<FHIRPatient> {
    const patient = await this.client.read({
      resourceType: 'Patient',
      id: patientId,
    });

    // Audit PHI access
    await auditPHIAccess(
      'read_patient',
      patientId,
      ['name', 'identifier', 'birthDate', 'telecom', 'address'],
      this.userId
    );

    return patient as FHIRPatient;
  }

  /**
   * Create questionnaire response in EHR
   */
  async createQuestionnaireResponse(
    questionnaireResponse: FHIRQuestionnaireResponse
  ): Promise<FHIRQuestionnaireResponse> {
    const response = await this.client.create({
      resourceType: 'QuestionnaireResponse',
      body: questionnaireResponse,
    });

    // Audit log
    await auditLog({
      userId: this.userId,
      action: 'create_questionnaire_response',
      resourceType: 'fhir_questionnaire_response',
      resourceId: response.id || '',
      details: {
        questionnaire: questionnaireResponse.questionnaire,
        status: questionnaireResponse.status,
      },
      containsPHI: true,
      phiFields: [],
      ipAddress: '',
      userAgent: '',
    });

    return response as FHIRQuestionnaireResponse;
  }

  /**
   * Get questionnaire responses for a patient
   */
  async getQuestionnaireResponses(
    patientId: string,
    questionnaireId?: string
  ): Promise<FHIRQuestionnaireResponse[]> {
    const searchParams: any = {
      subject: patientId,
    };

    if (questionnaireId) {
      searchParams.questionnaire = questionnaireId;
    }

    const response = await this.client.search({
      resourceType: 'QuestionnaireResponse',
      searchParams,
    });

    // Audit PHI access
    await auditPHIAccess(
      'read_questionnaire_responses',
      patientId,
      ['questionnaireResponse'],
      this.userId,
      { questionnaireId }
    );

    return this.extractResources(response);
  }

  /**
   * Create observation in EHR
   */
  async createObservation(observation: FHIRObservation): Promise<FHIRObservation> {
    const response = await this.client.create({
      resourceType: 'Observation',
      body: observation,
    });

    // Audit log
    await auditLog({
      userId: this.userId,
      action: 'create_observation',
      resourceType: 'fhir_observation',
      resourceId: response.id || '',
      details: {
        code: observation.code,
        status: observation.status,
      },
      containsPHI: true,
      phiFields: [],
      ipAddress: '',
      userAgent: '',
    });

    return response as FHIRObservation;
  }

  /**
   * Get observations for a patient
   */
  async getObservations(
    patientId: string,
    code?: string
  ): Promise<FHIRObservation[]> {
    const searchParams: any = {
      subject: patientId,
    };

    if (code) {
      searchParams.code = code;
    }

    const response = await this.client.search({
      resourceType: 'Observation',
      searchParams,
    });

    // Audit PHI access
    await auditPHIAccess(
      'read_observations',
      patientId,
      ['observation'],
      this.userId,
      { code }
    );

    return this.extractResources(response);
  }

  /**
   * Convert survey response to FHIR QuestionnaireResponse
   */
  convertSurveyToFHIR(
    surveyResponse: any,
    patientReference: string,
    questionnaireUrl?: string
  ): FHIRQuestionnaireResponse {
    const fhirResponse: FHIRQuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      subject: {
        reference: patientReference,
      },
      authored: new Date().toISOString(),
      item: [],
    };

    if (questionnaireUrl) {
      fhirResponse.questionnaire = questionnaireUrl;
    }

    // Map survey responses to FHIR items
    if (surveyResponse.responses) {
      fhirResponse.item = Object.entries(surveyResponse.responses).map(([fieldId, value]: [string, any]) => ({
        linkId: fieldId,
        answer: [{
          valueString: typeof value === 'string' ? value : JSON.stringify(value),
        }],
      }));
    }

    return fhirResponse;
  }

  /**
   * Convert FHIR QuestionnaireResponse to survey response
   */
  convertFHIRToSurvey(fhirResponse: FHIRQuestionnaireResponse): any {
    const surveyResponse: any = {
      id: fhirResponse.id,
      submittedAt: fhirResponse.authored,
      responses: {},
    };

    if (fhirResponse.item) {
      fhirResponse.item.forEach(item => {
        if (item.answer && item.answer.length > 0) {
          const answer = item.answer[0];
          surveyResponse.responses[item.linkId] =
            answer.valueString ||
            answer.valueBoolean ||
            answer.valueInteger ||
            answer.valueDecimal ||
            answer.valueDate ||
            answer.valueDateTime;
        }
      });
    }

    return surveyResponse;
  }

  /**
   * Extract resources from FHIR Bundle
   */
  private extractResources(bundle: any): any[] {
    if (!bundle || !bundle.entry) {
      return [];
    }

    return bundle.entry
      .filter((entry: any) => entry.resource)
      .map((entry: any) => entry.resource);
  }

  /**
   * Generate random state for OAuth2
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}

/**
 * Create FHIR client
 */
export async function createFHIRClient(
  config: FHIRConfig,
  userId: string
): Promise<FHIRClient> {
  return new FHIRClient(config, userId);
}

/**
 * Test FHIR connection
 */
export async function testFHIRConnection(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/metadata`, {
      method: 'GET',
      headers: {
        'Accept': 'application/fhir+json',
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}
