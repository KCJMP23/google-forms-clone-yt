/**
 * AI-Powered Anomaly Detection
 * Detects unusual patterns, fraudulent responses, and data quality issues
 */

export interface AnomalyResult {
  isAnomaly: boolean;
  anomalyScore: number; // 0 to 1, higher = more anomalous
  reasons: string[];
  recommendedAction: 'review' | 'flag' | 'reject' | 'accept';
  details: {
    duplicateResponse?: boolean;
    inconsistentAnswers?: boolean;
    suspiciousPattern?: boolean;
    tooFast?: boolean;
    tooSlow?: boolean;
    invalidData?: boolean;
    extremeValues?: boolean;
  };
}

export interface AnomalyDetectionConfig {
  checkDuplicates?: boolean;
  checkConsistency?: boolean;
  checkTiming?: boolean;
  checkDataQuality?: boolean;
  checkExtremeValues?: boolean;
  minCompletionTime?: number; // seconds
  maxCompletionTime?: number; // seconds
  duplicateThreshold?: number; // 0 to 1 similarity
}

/**
 * Detect anomalies in a survey response
 */
export async function detectAnomalies(
  response: any,
  config: AnomalyDetectionConfig = {},
  historicalResponses?: any[]
): Promise<AnomalyResult> {
  const {
    checkDuplicates = true,
    checkConsistency = true,
    checkTiming = true,
    checkDataQuality = true,
    checkExtremeValues = true,
    minCompletionTime = 5, // 5 seconds minimum
    maxCompletionTime = 3600, // 1 hour maximum
    duplicateThreshold = 0.95,
  } = config;

  const anomalies: string[] = [];
  const details: AnomalyResult['details'] = {};
  let anomalyScore = 0;

  // Check for duplicate responses
  if (checkDuplicates && historicalResponses) {
    const duplicate = checkForDuplicates(response, historicalResponses, duplicateThreshold);
    if (duplicate) {
      anomalies.push('Potential duplicate response detected');
      details.duplicateResponse = true;
      anomalyScore += 0.3;
    }
  }

  // Check for inconsistent answers
  if (checkConsistency) {
    const inconsistent = checkForInconsistentAnswers(response);
    if (inconsistent.length > 0) {
      anomalies.push(`Inconsistent answers detected: ${inconsistent.join(', ')}`);
      details.inconsistentAnswers = true;
      anomalyScore += 0.2;
    }
  }

  // Check completion time
  if (checkTiming && response.completionTime) {
    if (response.completionTime < minCompletionTime) {
      anomalies.push(`Completed too quickly (${response.completionTime}s)`);
      details.tooFast = true;
      anomalyScore += 0.25;
    } else if (response.completionTime > maxCompletionTime) {
      anomalies.push(`Took too long to complete (${response.completionTime}s)`);
      details.tooSlow = true;
      anomalyScore += 0.1;
    }
  }

  // Check data quality
  if (checkDataQuality) {
    const qualityIssues = checkForDataQualityIssues(response);
    if (qualityIssues.length > 0) {
      anomalies.push(...qualityIssues);
      details.invalidData = true;
      anomalyScore += 0.15 * qualityIssues.length;
    }
  }

  // Check for extreme values
  if (checkExtremeValues) {
    const extremeValues = detectExtremeValues(response, historicalResponses);
    if (extremeValues.length > 0) {
      anomalies.push(...extremeValues);
      details.extremeValues = true;
      anomalyScore += 0.1 * extremeValues.length;
    }
  }

  // Check for suspicious patterns (all same answer, alternating pattern)
  const suspiciousPattern = detectSuspiciousPatterns(response);
  if (suspiciousPattern) {
    anomalies.push(suspiciousPattern);
    details.suspiciousPattern = true;
    anomalyScore += 0.3;
  }

  // Normalize anomaly score
  anomalyScore = Math.min(anomalyScore, 1);

  // Determine recommended action
  let recommendedAction: AnomalyResult['recommendedAction'] = 'accept';
  if (anomalyScore >= 0.7) {
    recommendedAction = 'reject';
  } else if (anomalyScore >= 0.4) {
    recommendedAction = 'flag';
  } else if (anomalyScore >= 0.2) {
    recommendedAction = 'review';
  }

  return {
    isAnomaly: anomalies.length > 0,
    anomalyScore,
    reasons: anomalies,
    recommendedAction,
    details,
  };
}

/**
 * Check for duplicate responses
 */
function checkForDuplicates(
  response: any,
  historicalResponses: any[],
  threshold: number
): boolean {
  for (const historical of historicalResponses) {
    const similarity = calculateResponseSimilarity(response, historical);
    if (similarity >= threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate similarity between two responses
 */
function calculateResponseSimilarity(response1: any, response2: any): number {
  const fields1 = response1.responses || {};
  const fields2 = response2.responses || {};

  const allFields = new Set([...Object.keys(fields1), ...Object.keys(fields2)]);
  let matchCount = 0;

  allFields.forEach((field) => {
    if (fields1[field] === fields2[field]) {
      matchCount++;
    }
  });

  return matchCount / allFields.size;
}

/**
 * Check for inconsistent answers
 */
function checkForInconsistentAnswers(response: any): string[] {
  const inconsistencies: string[] = [];
  const responses = response.responses || {};

  // Example: Check if age-related questions are consistent
  if (responses.age && responses.birthdate) {
    const calculatedAge = calculateAge(new Date(responses.birthdate));
    const providedAge = parseInt(responses.age);

    if (Math.abs(calculatedAge - providedAge) > 1) {
      inconsistencies.push('Age and birthdate do not match');
    }
  }

  // Example: Check if satisfaction scores are internally consistent
  const satisfactionFields = Object.keys(responses).filter(key =>
    key.toLowerCase().includes('satisfaction') ||
    key.toLowerCase().includes('rating')
  );

  if (satisfactionFields.length >= 3) {
    const scores = satisfactionFields.map(field => parseFloat(responses[field])).filter(n => !isNaN(n));
    const variance = calculateVariance(scores);

    // If all scores are identical (very low variance), might be suspicious
    if (variance < 0.01 && scores.length >= 3) {
      inconsistencies.push('All satisfaction ratings are identical');
    }
  }

  return inconsistencies;
}

/**
 * Check data quality
 */
function checkForDataQualityIssues(response: any): string[] {
  const issues: string[] = [];
  const responses = response.responses || {};

  Object.entries(responses).forEach(([field, value]) => {
    // Check for gibberish text
    if (typeof value === 'string') {
      if (value.length > 10 && isGibberish(value)) {
        issues.push(`Field "${field}" contains gibberish text`);
      }

      // Check for repeated characters
      if (/(.)\1{5,}/.test(value)) {
        issues.push(`Field "${field}" contains repeated characters`);
      }

      // Check for all caps (might be shouting/spam)
      if (value.length > 20 && value === value.toUpperCase()) {
        issues.push(`Field "${field}" is all caps`);
      }
    }

    // Check for invalid email format
    if (field.toLowerCase().includes('email') && typeof value === 'string') {
      if (!isValidEmail(value)) {
        issues.push(`Invalid email format in "${field}"`);
      }
    }

    // Check for invalid phone number
    if (field.toLowerCase().includes('phone') && typeof value === 'string') {
      if (!isValidPhone(value)) {
        issues.push(`Invalid phone number in "${field}"`);
      }
    }
  });

  return issues;
}

/**
 * Detect extreme values
 */
function detectExtremeValues(response: any, historicalResponses?: any[]): string[] {
  const extremes: string[] = [];

  if (!historicalResponses || historicalResponses.length < 10) {
    return extremes;
  }

  const responses = response.responses || {};

  Object.entries(responses).forEach(([field, value]) => {
    if (typeof value === 'number') {
      // Calculate statistics from historical data
      const historicalValues = historicalResponses
        .map(r => r.responses?.[field])
        .filter(v => typeof v === 'number');

      if (historicalValues.length >= 10) {
        const mean = historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length;
        const stdDev = Math.sqrt(
          historicalValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / historicalValues.length
        );

        // Check if value is more than 3 standard deviations from mean
        if (Math.abs(value - mean) > 3 * stdDev) {
          extremes.push(`Field "${field}" has extreme value (${value} vs mean ${mean.toFixed(2)})`);
        }
      }
    }
  });

  return extremes;
}

/**
 * Detect suspicious answer patterns
 */
function detectSuspiciousPatterns(response: any): string | null {
  const responses = response.responses || {};
  const values = Object.values(responses);

  // Check if all answers are the same
  if (values.length >= 5) {
    const uniqueValues = new Set(values);
    if (uniqueValues.size === 1) {
      return 'All answers are identical';
    }

    // Check for alternating pattern (e.g., 1, 2, 1, 2, 1, 2)
    if (uniqueValues.size === 2 && isAlternatingPattern(values)) {
      return 'Answers follow an alternating pattern';
    }

    // Check for sequential pattern (e.g., 1, 2, 3, 4, 5)
    if (isSequentialPattern(values)) {
      return 'Answers follow a sequential pattern';
    }
  }

  return null;
}

/**
 * Check if values follow an alternating pattern
 */
function isAlternatingPattern(values: any[]): boolean {
  if (values.length < 4) return false;

  for (let i = 0; i < values.length - 2; i++) {
    if (values[i] !== values[i + 2]) {
      return false;
    }
  }
  return true;
}

/**
 * Check if values follow a sequential pattern
 */
function isSequentialPattern(values: any[]): boolean {
  if (values.length < 4) return false;

  const numericValues = values.filter(v => typeof v === 'number').map(v => parseFloat(v as any));
  if (numericValues.length < 4) return false;

  const differences = [];
  for (let i = 1; i < numericValues.length; i++) {
    differences.push(numericValues[i] - numericValues[i - 1]);
  }

  // Check if all differences are the same
  const uniqueDifferences = new Set(differences);
  return uniqueDifferences.size === 1 && !differences.includes(0);
}

/**
 * Check if text is gibberish
 */
function isGibberish(text: string): boolean {
  // Check vowel ratio (gibberish usually has low vowel ratio)
  const vowels = (text.match(/[aeiou]/gi) || []).length;
  const consonants = (text.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;

  if (consonants > 0 && vowels / consonants < 0.2) {
    return true;
  }

  // Check for common words
  const commonWords = ['the', 'and', 'is', 'to', 'a', 'of', 'in', 'that', 'for'];
  const hasCommonWord = commonWords.some(word => text.toLowerCase().includes(word));

  if (!hasCommonWord && text.length > 20) {
    return true;
  }

  return false;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number
 */
function isValidPhone(phone: string): boolean {
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

  // Check if it's a valid length (10-15 digits)
  return /^\d{10,15}$/.test(cleaned);
}

/**
 * Calculate age from birthdate
 */
function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Calculate variance
 */
function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
}

/**
 * Batch detect anomalies
 */
export async function detectAnomaliesBatch(
  responses: any[],
  config?: AnomalyDetectionConfig
): Promise<Array<{ response: any; anomaly: AnomalyResult }>> {
  return await Promise.all(
    responses.map(async (response, index) => {
      // Use all other responses as historical context
      const historicalResponses = responses.filter((_, i) => i !== index);

      const anomaly = await detectAnomalies(response, config, historicalResponses);

      return { response, anomaly };
    })
  );
}
