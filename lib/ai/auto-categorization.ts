/**
 * AI-Powered Auto-Categorization
 * Automatically categorizes survey responses into predefined or learned categories
 */

export interface Category {
  id: string;
  name: string;
  description?: string;
  keywords: string[];
  examples?: string[];
}

export interface CategorizationResult {
  text: string;
  categories: Array<{
    category: Category;
    confidence: number;
    reasoning?: string;
  }>;
  primaryCategory?: Category;
}

/**
 * Categorize text using predefined categories
 */
export async function categorizeText(
  text: string,
  categories: Category[]
): Promise<CategorizationResult> {
  if (process.env.OPENAI_API_KEY) {
    return await categorizeWithOpenAI(text, categories);
  }

  return categorizeRuleBased(text, categories);
}

/**
 * Categorize using OpenAI
 */
async function categorizeWithOpenAI(
  text: string,
  categories: Category[]
): Promise<CategorizationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const categoriesDescription = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    keywords: cat.keywords,
  }));

  const prompt = `Categorize the following text into one or more of these categories. Return a JSON object with an array of matching categories, each with the category ID, name, and confidence (0 to 1). Also include a brief reasoning.

Categories:
${JSON.stringify(categoriesDescription, null, 2)}

Text: "${text}"

Return JSON with format: { "matches": [{ "categoryId": "id", "confidence": 0.9, "reasoning": "..." }] }`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert text classifier. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  const matchedCategories = result.matches.map((match: any) => {
    const category = categories.find((c) => c.id === match.categoryId);
    return {
      category: category!,
      confidence: match.confidence,
      reasoning: match.reasoning,
    };
  });

  return {
    text,
    categories: matchedCategories,
    primaryCategory: matchedCategories[0]?.category,
  };
}

/**
 * Rule-based categorization (fallback)
 */
function categorizeRuleBased(
  text: string,
  categories: Category[]
): CategorizationResult {
  const lowerText = text.toLowerCase();
  const textWords = new Set(lowerText.split(/\W+/));

  const matches = categories.map((category) => {
    let matchCount = 0;
    let totalKeywords = category.keywords.length;

    category.keywords.forEach((keyword) => {
      const keywordLower = keyword.toLowerCase();
      if (lowerText.includes(keywordLower)) {
        matchCount++;
      }
    });

    const confidence = totalKeywords > 0 ? matchCount / totalKeywords : 0;

    return {
      category,
      confidence,
    };
  }).filter((match) => match.confidence > 0.1); // Min 10% confidence

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  return {
    text,
    categories: matches,
    primaryCategory: matches[0]?.category,
  };
}

/**
 * Batch categorize multiple texts
 */
export async function categorizeTextBatch(
  texts: string[],
  categories: Category[]
): Promise<CategorizationResult[]> {
  return await Promise.all(
    texts.map((text) => categorizeText(text, categories))
  );
}

/**
 * Suggest new categories based on response patterns
 */
export async function suggestCategories(
  responses: string[],
  maxCategories: number = 5
): Promise<Category[]> {
  // Use clustering to find natural groupings
  const keywords = responses.flatMap((response) =>
    extractImportantWords(response)
  );

  // Count keyword frequency
  const keywordFreq: Record<string, number> = {};
  keywords.forEach((word) => {
    keywordFreq[word] = (keywordFreq[word] || 0) + 1;
  });

  // Find most common keywords
  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCategories * 3)
    .map(([word]) => word);

  // Group related keywords
  const categories: Category[] = [];
  const usedKeywords = new Set<string>();

  for (let i = 0; i < Math.min(maxCategories, topKeywords.length); i++) {
    const mainKeyword = topKeywords[i];
    if (usedKeywords.has(mainKeyword)) continue;

    const relatedKeywords = findRelatedKeywords(mainKeyword, topKeywords);
    relatedKeywords.forEach((k) => usedKeywords.add(k));

    categories.push({
      id: `cat_${i + 1}`,
      name: capitalizeName(mainKeyword),
      keywords: relatedKeywords,
    });
  }

  return categories;
}

/**
 * Extract important words from text
 */
function extractImportantWords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  ]);

  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));
}

/**
 * Find related keywords
 */
function findRelatedKeywords(mainKeyword: string, allKeywords: string[]): string[] {
  // Simple similarity: check if words share common prefix/suffix
  const related = [mainKeyword];

  allKeywords.forEach((keyword) => {
    if (keyword !== mainKeyword) {
      if (
        keyword.startsWith(mainKeyword.slice(0, 3)) ||
        mainKeyword.startsWith(keyword.slice(0, 3))
      ) {
        related.push(keyword);
      }
    }
  });

  return related.slice(0, 5);
}

/**
 * Capitalize category name
 */
function capitalizeName(word: string): string {
  return word
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Pre-defined healthcare survey categories
 */
export const HEALTHCARE_CATEGORIES: Category[] = [
  {
    id: 'care_quality',
    name: 'Care Quality',
    description: 'Comments about quality of medical care received',
    keywords: ['treatment', 'care', 'doctor', 'nurse', 'quality', 'medical', 'physician'],
  },
  {
    id: 'facility',
    name: 'Facility & Environment',
    description: 'Comments about physical facility and environment',
    keywords: ['facility', 'building', 'room', 'clean', 'environment', 'equipment'],
  },
  {
    id: 'staff',
    name: 'Staff Interaction',
    description: 'Comments about staff interactions and service',
    keywords: ['staff', 'friendly', 'helpful', 'rude', 'service', 'interaction'],
  },
  {
    id: 'wait_time',
    name: 'Wait Times',
    description: 'Comments about waiting times and scheduling',
    keywords: ['wait', 'time', 'delay', 'appointment', 'schedule', 'late', 'prompt'],
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Comments about communication and information sharing',
    keywords: ['communication', 'explain', 'information', 'understand', 'told', 'asked'],
  },
  {
    id: 'billing',
    name: 'Billing & Insurance',
    description: 'Comments about billing and insurance issues',
    keywords: ['bill', 'cost', 'insurance', 'pay', 'charge', 'expensive', 'affordable'],
  },
  {
    id: 'recommendation',
    name: 'Recommendations',
    description: 'Comments about recommendations and suggestions',
    keywords: ['recommend', 'suggest', 'improve', 'should', 'could', 'better'],
  },
];
