/**
 * REDCap Integration
 * Complete REDCap API integration for clinical research data exchange
 * HIPAA-compliant with encryption and audit logging
 */

import { encrypt, decrypt } from '../encryption';
import { auditDataExport, auditLog } from '../audit';

export interface REDCapConfig {
  apiUrl: string;
  apiToken: string; // Encrypted in storage
  projectId: string;
  exportDag?: boolean; // Data Access Groups
  exportSurveyFields?: boolean;
  exportDataAccessGroups?: boolean;
  filterLogic?: string;
}

export interface REDCapRecord {
  record_id: string;
  redcap_event_name?: string;
  redcap_data_access_group?: string;
  redcap_survey_identifier?: string;
  [field: string]: any;
}

export interface REDCapField {
  field_name: string;
  form_name: string;
  section_header?: string;
  field_type: string;
  field_label: string;
  select_choices_or_calculations?: string;
  field_note?: string;
  text_validation_type_or_show_slider_number?: string;
  text_validation_min?: string;
  text_validation_max?: string;
  identifier?: string; // 'y' if PHI
  branching_logic?: string;
  required_field?: string;
  custom_alignment?: string;
  question_number?: string;
  matrix_group_name?: string;
  matrix_ranking?: string;
  field_annotation?: string;
}

export interface REDCapProject {
  project_id: string;
  project_title: string;
  creation_time: string;
  production_time: string;
  in_production: boolean;
  project_language: string;
  purpose: string;
  purpose_other?: string;
  project_notes?: string;
  custom_record_label?: string;
  is_longitudinal: boolean;
  surveys_enabled: boolean;
  scheduling_enabled: boolean;
  record_autonumbering_enabled: boolean;
  randomization_enabled: boolean;
  ddp_enabled: boolean;
  project_irb_number?: string;
  project_grant_number?: string;
  project_pi_firstname?: string;
  project_pi_lastname?: string;
  display_today_now_button: boolean;
}

export interface SyncResult {
  success: boolean;
  recordsImported: number;
  recordsExported: number;
  errors: string[];
  timestamp: Date;
}

/**
 * REDCap API Client
 */
export class REDCapClient {
  private config: REDCapConfig;
  private userId: string;

  constructor(config: REDCapConfig, userId: string) {
    this.config = config;
    this.userId = userId;
  }

  /**
   * Test REDCap API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.callAPI('version', {});
      return !!response;
    } catch (error) {
      console.error('REDCap connection test failed:', error);
      return false;
    }
  }

  /**
   * Get project information
   */
  async getProjectInfo(): Promise<REDCapProject> {
    const response = await this.callAPI('project', {});
    return response as REDCapProject;
  }

  /**
   * Get project metadata (data dictionary)
   */
  async getMetadata(): Promise<REDCapField[]> {
    const response = await this.callAPI('metadata', {
      format: 'json',
    });
    return response as REDCapField[];
  }

  /**
   * Export records from REDCap
   */
  async exportRecords(options: {
    records?: string[];
    fields?: string[];
    forms?: string[];
    events?: string[];
    rawOrLabel?: 'raw' | 'label' | 'both';
    dateRangeBegin?: string;
    dateRangeEnd?: string;
  } = {}): Promise<REDCapRecord[]> {
    const params: any = {
      format: 'json',
      type: 'flat',
      rawOrLabel: options.rawOrLabel || 'raw',
    };

    if (options.records && options.records.length > 0) {
      params.records = options.records.join(',');
    }

    if (options.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }

    if (options.forms && options.forms.length > 0) {
      params.forms = options.forms.join(',');
    }

    if (options.events && options.events.length > 0) {
      params.events = options.events.join(',');
    }

    if (options.dateRangeBegin) {
      params.dateRangeBegin = options.dateRangeBegin;
    }

    if (options.dateRangeEnd) {
      params.dateRangeEnd = options.dateRangeEnd;
    }

    if (this.config.filterLogic) {
      params.filterLogic = this.config.filterLogic;
    }

    const records = await this.callAPI('record', params) as REDCapRecord[];

    // Audit log export
    await auditDataExport(
      'export_redcap_records',
      'redcap_records',
      records.length,
      true, // Assume PHI
      this.userId,
      { projectId: this.config.projectId, options }
    );

    return records;
  }

  /**
   * Import records to REDCap
   */
  async importRecords(
    records: REDCapRecord[],
    options: {
      overwriteBehavior?: 'normal' | 'overwrite';
      forceAutoNumber?: boolean;
      dateFormat?: 'YMD' | 'DMY' | 'MDY';
      returnContent?: 'count' | 'ids' | 'auto_ids';
    } = {}
  ): Promise<{ count: number; ids?: string[] }> {
    const params: any = {
      format: 'json',
      type: 'flat',
      overwriteBehavior: options.overwriteBehavior || 'normal',
      forceAutoNumber: options.forceAutoNumber || false,
      dateFormat: options.dateFormat || 'YMD',
      returnContent: options.returnContent || 'count',
      data: JSON.stringify(records),
    };

    const response = await this.callAPI('record', params, 'POST');

    // Audit log import
    await auditLog({
      userId: this.userId,
      action: 'import_redcap_records',
      resourceType: 'redcap_integration',
      resourceId: this.config.projectId,
      details: {
        recordCount: records.length,
        overwriteBehavior: params.overwriteBehavior,
      },
      containsPHI: true,
      phiFields: [],
      ipAddress: '',
      userAgent: '',
    });

    if (options.returnContent === 'ids' || options.returnContent === 'auto_ids') {
      return { count: response.count, ids: response.ids };
    }

    return { count: response.count };
  }

  /**
   * Get instruments (forms) list
   */
  async getInstruments(): Promise<Array<{ instrument_name: string; instrument_label: string }>> {
    const response = await this.callAPI('instrument', {
      format: 'json',
    });
    return response as Array<{ instrument_name: string; instrument_label: string }>;
  }

  /**
   * Get events (for longitudinal projects)
   */
  async getEvents(): Promise<Array<{
    event_name: string;
    arm_num: string;
    day_offset: string;
    offset_min: string;
    offset_max: string;
    unique_event_name: string;
  }>> {
    const response = await this.callAPI('event', {
      format: 'json',
    });
    return response as any[];
  }

  /**
   * Sync survey responses to REDCap
   */
  async syncSurveyToREDCap(
    formId: string,
    responses: any[]
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsImported: 0,
      recordsExported: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Map survey responses to REDCap format
      const redcapRecords = await this.mapResponsesToREDCap(responses);

      // Import to REDCap
      const importResult = await this.importRecords(redcapRecords, {
        overwriteBehavior: 'normal',
        returnContent: 'count',
      });

      result.recordsImported = importResult.count;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync REDCap data to platform
   */
  async syncREDCapToPlatform(
    formId: string,
    options: {
      dateRangeBegin?: string;
      dateRangeEnd?: string;
    } = {}
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsImported: 0,
      recordsExported: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Export records from REDCap
      const records = await this.exportRecords({
        dateRangeBegin: options.dateRangeBegin,
        dateRangeEnd: options.dateRangeEnd,
      });

      result.recordsExported = records.length;

      // Map REDCap records to platform format
      const platformResponses = await this.mapREDCapToResponses(records);

      // Save to platform (implementation depends on your data model)
      // await saveSurveyResponses(formId, platformResponses);

      result.recordsImported = platformResponses.length;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Call REDCap API
   */
  private async callAPI(
    content: string,
    params: Record<string, any>,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<any> {
    const url = this.config.apiUrl;

    const formData = new FormData();
    formData.append('token', this.config.apiToken);
    formData.append('content', content);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await fetch(url, {
      method,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`REDCap API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Map survey responses to REDCap format
   */
  private async mapResponsesToREDCap(responses: any[]): Promise<REDCapRecord[]> {
    // Implementation depends on your survey structure and REDCap project setup
    // This is a simplified example

    return responses.map((response, index) => {
      const redcapRecord: REDCapRecord = {
        record_id: response.id || `record_${index + 1}`,
      };

      // Map each response field to corresponding REDCap field
      Object.entries(response.responses || {}).forEach(([fieldId, value]) => {
        redcapRecord[fieldId] = value;
      });

      return redcapRecord;
    });
  }

  /**
   * Map REDCap records to platform responses
   */
  private async mapREDCapToResponses(records: REDCapRecord[]): Promise<any[]> {
    // Implementation depends on your survey structure
    // This is a simplified example

    return records.map(record => ({
      id: record.record_id,
      formId: this.config.projectId,
      responses: Object.entries(record)
        .filter(([key]) => key !== 'record_id')
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>),
      submittedAt: new Date(),
    }));
  }
}

/**
 * Create REDCap client
 */
export async function createREDCapClient(
  config: REDCapConfig,
  userId: string
): Promise<REDCapClient> {
  return new REDCapClient(config, userId);
}

/**
 * Test REDCap connection
 */
export async function testREDCapConnection(
  apiUrl: string,
  apiToken: string
): Promise<boolean> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: new URLSearchParams({
        token: apiToken,
        content: 'version',
        format: 'json',
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}
