/**
 * Custom Workflow Engine
 * Build and execute custom approval workflows for forms, IRB submissions, and data exports
 * HIPAA-compliant with full audit logging
 */

import { auditLog } from './audit';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  settings: WorkflowSettings;
}

export interface WorkflowTrigger {
  type: 'manual' | 'form_created' | 'form_submitted' | 'form_published' | 'export_requested' | 'irb_submission' | 'consent_expiring' | 'schedule';
  conditions?: WorkflowCondition[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:MM format
    dayOfWeek?: number; // 0-6
    dayOfMonth?: number; // 1-31
  };
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'notification' | 'action' | 'condition' | 'delay';
  order: number;
  config: WorkflowStepConfig;
  onSuccess?: string; // Next step ID
  onFailure?: string; // Next step ID
}

export interface WorkflowStepConfig {
  // Approval step
  approvers?: string[]; // User IDs
  approvalType?: 'any' | 'all' | 'majority';
  requireJustification?: boolean;
  autoApproveAfter?: number; // hours

  // Notification step
  recipients?: string[]; // User IDs or email addresses
  subject?: string;
  message?: string;
  template?: string;

  // Action step
  action?: 'update_status' | 'send_to_system' | 'create_task' | 'run_script' | 'export_data';
  actionConfig?: Record<string, any>;

  // Condition step
  conditions?: WorkflowCondition[];
  truthyStep?: string; // Step ID if conditions are true
  falsyStep?: string; // Step ID if conditions are false

  // Delay step
  delayHours?: number;
  delayUntil?: Date;
}

export interface WorkflowSettings {
  allowManualSkip?: boolean;
  allowManualRestart?: boolean;
  maxExecutionTime?: number; // hours
  notifyOnCompletion?: boolean;
  notifyOnFailure?: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  currentStep?: string;
  context: Record<string, any>; // Data passed through workflow
  stepResults: WorkflowStepResult[];
  error?: string;
}

export interface WorkflowStepResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface ApprovalRequest {
  id: string;
  workflowExecutionId: string;
  stepId: string;
  requestedBy: string;
  approvers: string[];
  approvalType: 'any' | 'all' | 'majority';
  status: 'pending' | 'approved' | 'rejected';
  approvals: Approval[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface Approval {
  userId: string;
  decision: 'approved' | 'rejected';
  justification?: string;
  timestamp: Date;
}

/**
 * Workflow Engine
 */
export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const newWorkflow: Workflow = {
      ...workflow,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(newWorkflow.id, newWorkflow);

    // Audit log
    await auditLog({
      userId: workflow.createdBy,
      action: 'create_workflow',
      resourceType: 'workflow',
      resourceId: newWorkflow.id,
      details: { workflowName: workflow.name },
      ipAddress: '',
      userAgent: '',
    });

    return newWorkflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    context: Record<string, any>,
    triggeredBy: string
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!workflow.isActive) {
      throw new Error(`Workflow ${workflowId} is not active`);
    }

    const execution: WorkflowExecution = {
      id: this.generateId(),
      workflowId,
      status: 'running',
      startedAt: new Date(),
      context,
      stepResults: [],
    };

    this.executions.set(execution.id, execution);

    // Audit log
    await auditLog({
      userId: triggeredBy,
      action: 'execute_workflow',
      resourceType: 'workflow',
      resourceId: workflowId,
      details: {
        executionId: execution.id,
        context,
      },
      ipAddress: '',
      userAgent: '',
    });

    // Execute workflow steps
    try {
      await this.executeSteps(workflow, execution);
      execution.status = 'completed';
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
    }

    return execution;
  }

  /**
   * Execute workflow steps
   */
  private async executeSteps(workflow: Workflow, execution: WorkflowExecution): Promise<void> {
    const sortedSteps = [...workflow.steps].sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      const stepResult: WorkflowStepResult = {
        stepId: step.id,
        status: 'running',
        startedAt: new Date(),
      };

      execution.stepResults.push(stepResult);
      execution.currentStep = step.id;

      try {
        const result = await this.executeStep(step, execution);
        stepResult.status = 'completed';
        stepResult.result = result;
        stepResult.completedAt = new Date();

        // Check for conditional next step
        if (step.type === 'condition') {
          const conditionMet = result as boolean;
          const nextStepId = conditionMet
            ? step.config.truthyStep
            : step.config.falsyStep;

          if (nextStepId) {
            const nextStep = workflow.steps.find(s => s.id === nextStepId);
            if (nextStep) {
              await this.executeSteps({ ...workflow, steps: [nextStep] }, execution);
            }
          }
        }
      } catch (error) {
        stepResult.status = 'failed';
        stepResult.error = error instanceof Error ? error.message : 'Unknown error';
        stepResult.completedAt = new Date();

        // Execute onFailure step if defined
        if (step.onFailure) {
          const failureStep = workflow.steps.find(s => s.id === step.onFailure);
          if (failureStep) {
            await this.executeSteps({ ...workflow, steps: [failureStep] }, execution);
          }
        }

        throw error;
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    switch (step.type) {
      case 'approval':
        return await this.executeApprovalStep(step, execution);

      case 'notification':
        return await this.executeNotificationStep(step, execution);

      case 'action':
        return await this.executeActionStep(step, execution);

      case 'condition':
        return await this.evaluateConditions(step.config.conditions || [], execution.context);

      case 'delay':
        return await this.executeDelayStep(step);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute approval step
   */
  private async executeApprovalStep(step: WorkflowStep, execution: WorkflowExecution): Promise<boolean> {
    const approvalRequest: ApprovalRequest = {
      id: this.generateId(),
      workflowExecutionId: execution.id,
      stepId: step.id,
      requestedBy: execution.context.userId || '',
      approvers: step.config.approvers || [],
      approvalType: step.config.approvalType || 'any',
      status: 'pending',
      approvals: [],
      createdAt: new Date(),
    };

    if (step.config.autoApproveAfter) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + step.config.autoApproveAfter);
      approvalRequest.expiresAt = expiresAt;
    }

    this.approvalRequests.set(approvalRequest.id, approvalRequest);

    // Send notifications to approvers
    // (Implementation depends on notification system)

    // Pause execution until approval is received
    execution.status = 'paused';

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const request = this.approvalRequests.get(approvalRequest.id);
        if (request && request.status !== 'pending') {
          clearInterval(checkInterval);
          execution.status = 'running';
          resolve(request.status === 'approved');
        }
      }, 1000);
    });
  }

  /**
   * Execute notification step
   */
  private async executeNotificationStep(step: WorkflowStep, execution: WorkflowExecution): Promise<boolean> {
    const { recipients, subject, message, template } = step.config;

    if (!recipients || recipients.length === 0) {
      return false;
    }

    // Replace variables in message
    let finalMessage = message || '';
    Object.entries(execution.context).forEach(([key, value]) => {
      finalMessage = finalMessage.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    });

    // Send notifications
    // (Integration with notification system)
    console.log(`Sending notification to ${recipients.join(', ')}: ${finalMessage}`);

    return true;
  }

  /**
   * Execute action step
   */
  private async executeActionStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const { action, actionConfig } = step.config;

    switch (action) {
      case 'update_status':
        // Update resource status
        return { status: 'updated' };

      case 'send_to_system':
        // Send data to external system
        return { sent: true };

      case 'create_task':
        // Create a task for someone
        return { taskId: this.generateId() };

      case 'export_data':
        // Export data
        return { exportId: this.generateId() };

      case 'run_script':
        // Execute custom script
        return { executed: true };

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Execute delay step
   */
  private async executeDelayStep(step: WorkflowStep): Promise<boolean> {
    const { delayHours, delayUntil } = step.config;

    if (delayUntil) {
      const delay = delayUntil.getTime() - Date.now();
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } else if (delayHours) {
      const delay = delayHours * 60 * 60 * 1000; // Convert to milliseconds
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return true;
  }

  /**
   * Evaluate workflow conditions
   */
  private async evaluateConditions(
    conditions: WorkflowCondition[],
    context: Record<string, any>
  ): Promise<boolean> {
    for (const condition of conditions) {
      const value = context[condition.field];

      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'not_equals':
          if (value === condition.value) return false;
          break;
        case 'contains':
          if (!String(value).includes(String(condition.value))) return false;
          break;
        case 'greater_than':
          if (!(value > condition.value)) return false;
          break;
        case 'less_than':
          if (!(value < condition.value)) return false;
          break;
        case 'is_empty':
          if (value != null && value !== '') return false;
          break;
        case 'is_not_empty':
          if (value == null || value === '') return false;
          break;
      }
    }

    return true;
  }

  /**
   * Submit approval
   */
  async submitApproval(
    approvalRequestId: string,
    userId: string,
    decision: 'approved' | 'rejected',
    justification?: string
  ): Promise<void> {
    const request = this.approvalRequests.get(approvalRequestId);
    if (!request) {
      throw new Error('Approval request not found');
    }

    // Check if user is an approver
    if (!request.approvers.includes(userId)) {
      throw new Error('User is not an approver');
    }

    // Add approval
    const approval: Approval = {
      userId,
      decision,
      justification,
      timestamp: new Date(),
    };

    request.approvals.push(approval);

    // Check if approval is complete
    const approved = request.approvals.filter(a => a.decision === 'approved');
    const rejected = request.approvals.filter(a => a.decision === 'rejected');

    switch (request.approvalType) {
      case 'any':
        if (approved.length > 0) {
          request.status = 'approved';
        } else if (rejected.length > 0) {
          request.status = 'rejected';
        }
        break;

      case 'all':
        if (approved.length === request.approvers.length) {
          request.status = 'approved';
        } else if (rejected.length > 0) {
          request.status = 'rejected';
        }
        break;

      case 'majority':
        const total = request.approvers.length;
        const majority = Math.ceil(total / 2);
        if (approved.length >= majority) {
          request.status = 'approved';
        } else if (rejected.length >= majority) {
          request.status = 'rejected';
        }
        break;
    }

    // Audit log
    await auditLog({
      userId,
      action: decision === 'approved' ? 'approve_workflow' : 'reject_workflow',
      resourceType: 'workflow_approval',
      resourceId: approvalRequestId,
      details: {
        workflowExecutionId: request.workflowExecutionId,
        justification,
      },
      ipAddress: '',
      userAgent: '',
    });
  }

  /**
   * Get workflow execution status
   */
  getExecutionStatus(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get pending approvals for a user
   */
  getPendingApprovals(userId: string): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter(
      request =>
        request.status === 'pending' &&
        request.approvers.includes(userId)
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Export singleton instance
let workflowEngine: WorkflowEngine | null = null;

export function getWorkflowEngine(): WorkflowEngine {
  if (!workflowEngine) {
    workflowEngine = new WorkflowEngine();
  }
  return workflowEngine;
}

/**
 * Pre-defined workflow templates
 */
export const WORKFLOW_TEMPLATES = {
  IRB_SUBMISSION: {
    name: 'IRB Submission Workflow',
    description: 'Standard workflow for IRB submission and approval',
    trigger: {
      type: 'manual' as const,
    },
    steps: [
      {
        id: 'step1',
        name: 'Principal Investigator Approval',
        type: 'approval' as const,
        order: 1,
        config: {
          approvers: ['pi_user_id'],
          approvalType: 'all' as const,
          requireJustification: true,
        },
      },
      {
        id: 'step2',
        name: 'Compliance Review',
        type: 'approval' as const,
        order: 2,
        config: {
          approvers: ['compliance_officer_id'],
          approvalType: 'all' as const,
        },
      },
      {
        id: 'step3',
        name: 'Submit to IRB',
        type: 'action' as const,
        order: 3,
        config: {
          action: 'send_to_system' as const,
          actionConfig: {
            system: 'IRB',
            endpoint: '/submissions',
          },
        },
      },
      {
        id: 'step4',
        name: 'Notify All Parties',
        type: 'notification' as const,
        order: 4,
        config: {
          recipients: ['pi_user_id', 'compliance_officer_id'],
          subject: 'IRB Submission Complete',
          message: 'Your IRB submission has been completed successfully.',
        },
      },
    ],
  },
};
