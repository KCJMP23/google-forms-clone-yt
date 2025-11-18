/**
 * Conditional Logic Engine
 * Dynamic form field visibility and calculations
 */

import { FormField, ConditionalLogic } from './form-builder-types';

export interface FormState {
  values: Record<string, any>;
  visibleFields: Set<string>;
  requiredFields: Set<string>;
}

export class ConditionalLogicEngine {
  private state: FormState;

  constructor(initialValues: Record<string, any> = {}) {
    this.state = {
      values: initialValues,
      visibleFields: new Set(),
      requiredFields: new Set(),
    };
  }

  /**
   * Evaluate conditional logic for all fields
   */
  evaluateAll(fields: FormField[]): FormState {
    fields.forEach((field) => {
      // Default: field is visible
      this.state.visibleFields.add(field.id);

      if (field.required) {
        this.state.requiredFields.add(field.id);
      }

      // Evaluate conditional logic
      if (field.conditionalLogic && field.conditionalLogic.length > 0) {
        field.conditionalLogic.forEach((logic) => {
          const conditionMet = this.evaluateCondition(logic);
          this.applyAction(field.id, logic.action, conditionMet, logic);
        });
      }
    });

    return this.state;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(logic: ConditionalLogic): boolean {
    const fieldValue = this.state.values[logic.fieldId];

    switch (logic.operator) {
      case 'equals':
        return fieldValue === logic.value;
      case 'notEquals':
        return fieldValue !== logic.value;
      case 'contains':
        return String(fieldValue).includes(String(logic.value));
      case 'greaterThan':
        return Number(fieldValue) > Number(logic.value);
      case 'lessThan':
        return Number(fieldValue) < Number(logic.value);
      case 'isEmpty':
        return !fieldValue || fieldValue === '';
      case 'isNotEmpty':
        return !!fieldValue && fieldValue !== '';
      default:
        return false;
    }
  }

  /**
   * Apply action based on condition result
   */
  private applyAction(
    fieldId: string,
    action: 'show' | 'hide' | 'require' | 'setValue',
    conditionMet: boolean,
    logic: ConditionalLogic
  ): void {
    const targetId = logic.targetFieldId || fieldId;

    switch (action) {
      case 'show':
        if (conditionMet) {
          this.state.visibleFields.add(targetId);
        }
        break;
      case 'hide':
        if (conditionMet) {
          this.state.visibleFields.delete(targetId);
        }
        break;
      case 'require':
        if (conditionMet) {
          this.state.requiredFields.add(targetId);
        } else {
          this.state.requiredFields.delete(targetId);
        }
        break;
      case 'setValue':
        if (conditionMet && logic.targetValue !== undefined) {
          this.state.values[targetId] = logic.targetValue;
        }
        break;
    }
  }

  /**
   * Update field value and re-evaluate
   */
  updateValue(fieldId: string, value: any, allFields: FormField[]): FormState {
    this.state.values[fieldId] = value;
    return this.evaluateAll(allFields);
  }

  getState(): FormState {
    return this.state;
  }
}

/**
 * Calculate derived field values
 */
export function calculateField(
  formula: string,
  formValues: Record<string, any>
): any {
  try {
    // Simple calculator for common medical calculations
    // BMI = weight (kg) / (height (m))^2
    if (formula.includes('BMI')) {
      const weight = formValues['weight'];
      const height = formValues['height'];
      if (weight && height) {
        const heightInMeters = height / 100; // assuming cm
        return (weight / (heightInMeters * heightInMeters)).toFixed(1);
      }
    }

    // Add more calculations as needed
    return null;
  } catch (error) {
    console.error('Error calculating field:', error);
    return null;
  }
}
