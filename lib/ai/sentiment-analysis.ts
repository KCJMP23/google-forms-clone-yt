/**
 * AI-Powered Sentiment Analysis
 * Analyzes text responses for sentiment and emotional tone
 * Uses OpenAI GPT-4 or local NLP models
 */

export interface SentimentResult {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  emotions?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
  };
  keywords?: string[];
}

export interface SentimentBatchResult {
  results: SentimentResult[];
  summary: {
    averageSentiment: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    mixedCount: number;
    totalProcessed: number;
  };
}

/**
 * Analyze sentiment of a single text
 */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  // Check if using OpenAI API
  if (process.env.OPENAI_API_KEY) {
    return await analyzeSentimentWithOpenAI(text);
  }

  // Otherwise use rule-based analysis (faster, but less accurate)
  return analyzeSentimentRuleBased(text);
}

/**
 * Analyze sentiment using OpenAI GPT-4
 */
async function analyzeSentimentWithOpenAI(text: string): Promise<SentimentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const prompt = `Analyze the sentiment of the following text. Return a JSON object with:
- sentiment: "positive", "negative", "neutral", or "mixed"
- score: number from -1 (very negative) to 1 (very positive)
- confidence: number from 0 to 1
- emotions: object with joy, sadness, anger, fear, surprise (each 0 to 1)
- keywords: array of important keywords

Text: "${text}"

Return only the JSON object, no other text.`;

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
          content: 'You are a sentiment analysis expert. Always return valid JSON.',
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

  return {
    text,
    ...result,
  };
}

/**
 * Rule-based sentiment analysis (fallback)
 */
function analyzeSentimentRuleBased(text: string): SentimentResult {
  const positiveWords = [
    'good', 'great', 'excellent', 'happy', 'satisfied', 'love', 'wonderful',
    'amazing', 'fantastic', 'perfect', 'best', 'awesome', 'brilliant',
  ];

  const negativeWords = [
    'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor',
    'disappointing', 'frustrated', 'angry', 'sad', 'upset', 'fail',
  ];

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\W+/);

  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });

  const totalSentimentWords = positiveCount + negativeCount;
  const score = totalSentimentWords > 0
    ? (positiveCount - negativeCount) / totalSentimentWords
    : 0;

  let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';

  if (Math.abs(score) < 0.2) {
    sentiment = 'neutral';
  } else if (score > 0.5) {
    sentiment = 'positive';
  } else if (score < -0.5) {
    sentiment = 'negative';
  } else {
    sentiment = 'mixed';
  }

  return {
    text,
    sentiment,
    score,
    confidence: Math.min(totalSentimentWords / words.length, 1),
    keywords: extractKeywords(text),
  };
}

/**
 * Batch analyze multiple texts
 */
export async function analyzeSentimentBatch(texts: string[]): Promise<SentimentBatchResult> {
  const results = await Promise.all(
    texts.map(text => analyzeSentiment(text))
  );

  const summary = {
    averageSentiment: results.reduce((sum, r) => sum + r.score, 0) / results.length,
    positiveCount: results.filter(r => r.sentiment === 'positive').length,
    negativeCount: results.filter(r => r.sentiment === 'negative').length,
    neutralCount: results.filter(r => r.sentiment === 'neutral').length,
    mixedCount: results.filter(r => r.sentiment === 'mixed').length,
    totalProcessed: results.length,
  };

  return { results, summary };
}

/**
 * Analyze sentiment trends over time
 */
export async function analyzeSentimentTrends(
  responses: Array<{ text: string; date: Date }>
): Promise<{
  daily: Array<{ date: string; averageSentiment: number; count: number }>;
  overall: {
    trend: 'improving' | 'declining' | 'stable';
    changeRate: number;
  };
}> {
  // Group by date
  const grouped = responses.reduce((acc, response) => {
    const dateKey = response.date.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(response.text);
    return acc;
  }, {} as Record<string, string[]>);

  // Analyze each day
  const daily = await Promise.all(
    Object.entries(grouped).map(async ([date, texts]) => {
      const batch = await analyzeSentimentBatch(texts);
      return {
        date,
        averageSentiment: batch.summary.averageSentiment,
        count: texts.length,
      };
    })
  );

  // Sort by date
  daily.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate trend
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  let changeRate = 0;

  if (daily.length >= 2) {
    const firstHalf = daily.slice(0, Math.floor(daily.length / 2));
    const secondHalf = daily.slice(Math.floor(daily.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.averageSentiment, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.averageSentiment, 0) / secondHalf.length;

    changeRate = secondAvg - firstAvg;

    if (changeRate > 0.1) trend = 'improving';
    else if (changeRate < -0.1) trend = 'declining';
  }

  return { daily, overall: { trend, changeRate } };
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string, limit: number = 5): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ]);

  const words = text
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count frequency
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and return top N
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}
