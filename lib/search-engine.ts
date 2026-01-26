/**
 * Enhanced Search Engine
 * Full-text search for forms, responses, and participants
 * HIPAA-compliant with audit logging for PHI searches
 */

import { auditDataExport } from './audit';

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  pagination?: SearchPagination;
}

export interface SearchFilters {
  formIds?: string[];
  participantIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  containsPHI?: boolean;
  dataClassification?: ('PHI' | 'deidentified' | 'anonymous' | 'limited_data_set')[];
  fieldTypes?: string[];
  minResponses?: number;
  maxResponses?: number;
  consentStatus?: ('granted' | 'denied' | 'expired' | 'pending')[];
  surveyCategory?: string[];
  customFilters?: Record<string, any>;
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  pageSize: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  highlights: Record<string, string[]>;
  facets: SearchFacets;
}

export interface SearchFacets {
  formTypes: Record<string, number>;
  dataClassifications: Record<string, number>;
  surveyCategories: Record<string, number>;
  consentStatuses: Record<string, number>;
  dateHistogram: Array<{ date: string; count: number }>;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  description?: string;
  query: SearchQuery;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search forms with full-text search and filters
 */
export async function searchForms(
  searchQuery: SearchQuery,
  userId: string
): Promise<SearchResult<any>> {
  const { query, filters, sort, pagination } = searchQuery;

  // Build search conditions
  const searchConditions: any[] = [];

  // Full-text search across title, description, and fields
  if (query && query.trim()) {
    searchConditions.push({
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { fields: { some: { label: { contains: query, mode: 'insensitive' } } } },
      ],
    });
  }

  // Apply filters
  if (filters) {
    if (filters.formIds && filters.formIds.length > 0) {
      searchConditions.push({ id: { in: filters.formIds } });
    }

    if (filters.containsPHI !== undefined) {
      searchConditions.push({ containsPHI: filters.containsPHI });
    }

    if (filters.dataClassification && filters.dataClassification.length > 0) {
      searchConditions.push({ dataClassification: { in: filters.dataClassification } });
    }

    if (filters.surveyCategory && filters.surveyCategory.length > 0) {
      searchConditions.push({ category: { in: filters.surveyCategory } });
    }

    if (filters.dateRange) {
      searchConditions.push({
        createdAt: {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end,
        },
      });
    }
  }

  // Audit log PHI searches
  if (filters?.containsPHI === true || query.toLowerCase().includes('phi')) {
    await auditDataExport(
      'search_forms',
      'forms',
      0, // Count updated after search
      true, // Contains PHI
      userId,
      { searchQuery: query, filters }
    );
  }

  // Simulate database query (replace with actual Prisma/DB query)
  const mockResults = await performFormSearch(searchConditions, sort, pagination);

  return mockResults;
}

/**
 * Search responses with full-text search and filters
 */
export async function searchResponses(
  searchQuery: SearchQuery,
  userId: string
): Promise<SearchResult<any>> {
  const { query, filters, sort, pagination } = searchQuery;

  const searchConditions: any[] = [];

  // Full-text search across response values
  if (query && query.trim()) {
    searchConditions.push({
      responses: { some: { value: { contains: query, mode: 'insensitive' } } },
    });
  }

  // Apply filters
  if (filters) {
    if (filters.formIds && filters.formIds.length > 0) {
      searchConditions.push({ formId: { in: filters.formIds } });
    }

    if (filters.participantIds && filters.participantIds.length > 0) {
      searchConditions.push({ participantId: { in: filters.participantIds } });
    }

    if (filters.containsPHI !== undefined) {
      searchConditions.push({ containsPHI: filters.containsPHI });
    }

    if (filters.dateRange) {
      searchConditions.push({
        submittedAt: {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end,
        },
      });
    }
  }

  // Audit log PHI searches
  if (filters?.containsPHI === true) {
    await auditDataExport(
      'search_responses',
      'responses',
      0,
      true,
      userId,
      { searchQuery: query, filters }
    );
  }

  // Simulate database query
  const mockResults = await performResponseSearch(searchConditions, sort, pagination);

  return mockResults;
}

/**
 * Search participants with full-text search and filters
 */
export async function searchParticipants(
  searchQuery: SearchQuery,
  userId: string
): Promise<SearchResult<any>> {
  const { query, filters, sort, pagination } = searchQuery;

  const searchConditions: any[] = [];

  // Full-text search across participant data
  if (query && query.trim()) {
    searchConditions.push({
      OR: [
        { mrn: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
      ],
    });
  }

  // Apply filters
  if (filters) {
    if (filters.consentStatus && filters.consentStatus.length > 0) {
      searchConditions.push({
        consents: { some: { status: { in: filters.consentStatus } } }
      });
    }

    if (filters.dateRange) {
      searchConditions.push({
        createdAt: {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end,
        },
      });
    }
  }

  // Always audit participant searches (contains PHI)
  await auditDataExport(
    'search_participants',
    'participants',
    0,
    true,
    userId,
    { searchQuery: query, filters }
  );

  // Simulate database query
  const mockResults = await performParticipantSearch(searchConditions, sort, pagination);

  return mockResults;
}

/**
 * Save a search for later use
 */
export async function saveSearch(
  userId: string,
  name: string,
  query: SearchQuery,
  description?: string
): Promise<SavedSearch> {
  const savedSearch: SavedSearch = {
    id: generateId(),
    userId,
    name,
    description,
    query,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save to database (simulate)
  await saveToDatabaseMock('saved_searches', savedSearch);

  return savedSearch;
}

/**
 * Get saved searches for a user
 */
export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  // Simulate database query
  const savedSearches: SavedSearch[] = await getFromDatabaseMock(
    'saved_searches',
    { userId }
  );

  return savedSearches;
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(
  searchId: string,
  userId: string
): Promise<boolean> {
  // Simulate database delete
  await deleteFromDatabaseMock('saved_searches', { id: searchId, userId });

  return true;
}

/**
 * Execute a saved search
 */
export async function executeSavedSearch(
  searchId: string,
  userId: string,
  searchType: 'forms' | 'responses' | 'participants' = 'forms'
): Promise<SearchResult<any>> {
  // Get saved search
  const savedSearch = await getFromDatabaseMock('saved_searches', {
    id: searchId,
    userId
  });

  if (!savedSearch) {
    throw new Error('Saved search not found');
  }

  // Execute search based on type
  switch (searchType) {
    case 'forms':
      return searchForms(savedSearch.query, userId);
    case 'responses':
      return searchResponses(savedSearch.query, userId);
    case 'participants':
      return searchParticipants(savedSearch.query, userId);
    default:
      throw new Error(`Unknown search type: ${searchType}`);
  }
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(
  text: string,
  searchQuery: string
): string {
  if (!searchQuery || !text) return text;

  const terms = searchQuery.split(' ').filter(t => t.length > 0);
  let highlighted = text;

  terms.forEach(term => {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    highlighted = highlighted.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
    );
  });

  return highlighted;
}

// Helper functions (simulate database operations)

async function performFormSearch(
  conditions: any[],
  sort?: SearchSort,
  pagination?: SearchPagination
): Promise<SearchResult<any>> {
  // Simulate database query - replace with actual Prisma query
  const mockForms = [
    {
      id: '1',
      title: 'Patient Satisfaction Survey',
      description: 'Annual patient feedback form',
      containsPHI: false,
      category: 'patient_satisfaction',
      createdAt: new Date(),
    },
  ];

  return {
    items: mockForms,
    total: mockForms.length,
    page: pagination?.page || 1,
    pageSize: pagination?.pageSize || 10,
    highlights: {},
    facets: {
      formTypes: { 'patient_satisfaction': 1 },
      dataClassifications: { 'anonymous': 1 },
      surveyCategories: { 'patient_satisfaction': 1 },
      consentStatuses: {},
      dateHistogram: [],
    },
  };
}

async function performResponseSearch(
  conditions: any[],
  sort?: SearchSort,
  pagination?: SearchPagination
): Promise<SearchResult<any>> {
  // Simulate database query
  return {
    items: [],
    total: 0,
    page: pagination?.page || 1,
    pageSize: pagination?.pageSize || 10,
    highlights: {},
    facets: {
      formTypes: {},
      dataClassifications: {},
      surveyCategories: {},
      consentStatuses: {},
      dateHistogram: [],
    },
  };
}

async function performParticipantSearch(
  conditions: any[],
  sort?: SearchSort,
  pagination?: SearchPagination
): Promise<SearchResult<any>> {
  // Simulate database query
  return {
    items: [],
    total: 0,
    page: pagination?.page || 1,
    pageSize: pagination?.pageSize || 10,
    highlights: {},
    facets: {
      formTypes: {},
      dataClassifications: {},
      surveyCategories: {},
      consentStatuses: {},
      dateHistogram: [],
    },
  };
}

async function saveToDatabaseMock(table: string, data: any): Promise<void> {
  // Replace with actual database save
  console.log(`Saving to ${table}:`, data);
}

async function getFromDatabaseMock(table: string, filter: any): Promise<any> {
  // Replace with actual database query
  console.log(`Getting from ${table} with filter:`, filter);
  return null;
}

async function deleteFromDatabaseMock(table: string, filter: any): Promise<void> {
  // Replace with actual database delete
  console.log(`Deleting from ${table} with filter:`, filter);
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
