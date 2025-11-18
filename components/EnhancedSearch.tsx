'use client';

import { useState } from 'react';
import { Search, Filter, Save, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  searchForms,
  searchResponses,
  searchParticipants,
  saveSearch,
  getSavedSearches,
  type SearchQuery,
  type SearchFilters,
  type SearchResult,
  type SavedSearch,
} from '@/lib/search-engine';
import { toast } from 'sonner';

interface EnhancedSearchProps {
  searchType: 'forms' | 'responses' | 'participants';
  userId: string;
  onResults: (results: SearchResult<any>) => void;
}

/**
 * Enhanced Search Component
 * Full-text search with advanced filters and saved searches
 */
export function EnhancedSearch({ searchType, userId, onResults }: EnhancedSearchProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load saved searches
  const loadSavedSearches = async () => {
    const searches = await getSavedSearches(userId);
    setSavedSearches(searches);
  };

  // Perform search
  const handleSearch = async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      toast.error('Please enter a search query or apply filters');
      return;
    }

    setIsSearching(true);

    try {
      const searchQuery: SearchQuery = {
        query,
        filters,
        pagination: { page: 1, pageSize: 20 },
      };

      let results: SearchResult<any>;

      switch (searchType) {
        case 'forms':
          results = await searchForms(searchQuery, userId);
          break;
        case 'responses':
          results = await searchResponses(searchQuery, userId);
          break;
        case 'participants':
          results = await searchParticipants(searchQuery, userId);
          break;
        default:
          throw new Error('Invalid search type');
      }

      onResults(results);
      toast.success(`Found ${results.total} results`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Save current search
  const handleSaveSearch = async (name: string, description?: string) => {
    try {
      const searchQuery: SearchQuery = { query, filters };
      await saveSearch(userId, name, searchQuery, description);
      toast.success('Search saved successfully');
      setShowSaveDialog(false);
      loadSavedSearches();
    } catch (error) {
      console.error('Save search error:', error);
      toast.error('Failed to save search');
    }
  };

  // Update filters
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setQuery('');
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={`Search ${searchType}...`}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Advanced Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    start: new Date(e.target.value)
                  })}
                />
                <Input
                  type="date"
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    end: new Date(e.target.value)
                  })}
                />
              </div>
            </div>

            {/* Data Classification */}
            <div className="space-y-2">
              <Label>Data Classification</Label>
              <Select
                onValueChange={(value) => updateFilter('dataClassification', [value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHI">PHI</SelectItem>
                  <SelectItem value="deidentified">De-identified</SelectItem>
                  <SelectItem value="anonymous">Anonymous</SelectItem>
                  <SelectItem value="limited_data_set">Limited Data Set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contains PHI */}
            <div className="space-y-2">
              <Label>Contains PHI</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="containsPHI"
                  checked={filters.containsPHI}
                  onCheckedChange={(checked) => updateFilter('containsPHI', checked)}
                />
                <label
                  htmlFor="containsPHI"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show only PHI data
                </label>
              </div>
            </div>

            {/* Survey Category (Forms only) */}
            {searchType === 'forms' && (
              <div className="space-y-2">
                <Label>Survey Category</Label>
                <Select
                  onValueChange={(value) => updateFilter('surveyCategory', [value])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient_satisfaction">Patient Satisfaction</SelectItem>
                    <SelectItem value="clinical_research">Clinical Research</SelectItem>
                    <SelectItem value="provider_feedback">Provider Feedback</SelectItem>
                    <SelectItem value="consent">Consent Forms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Consent Status (Participants only) */}
            {searchType === 'participants' && (
              <div className="space-y-2">
                <Label>Consent Status</Label>
                <Select
                  onValueChange={(value) => updateFilter('consentStatus', [value])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="granted">Granted</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save this search for quick access later
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSaveSearch(
                formData.get('name') as string,
                formData.get('description') as string
              );
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Search Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Active Patient Forms"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Describe what this search finds..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Search</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
