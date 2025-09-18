import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchHistory } from './useSearchHistory';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'ai' | 'contextual' | 'semantic' | 'command' | 'completion';
  description?: string;
  frequency?: number;
  category: string;
  metadata?: Record<string, any>;
}

interface SearchEntry {
  id: string;
  query: string;
  timestamp: number;
  category?: string;
  resultsCount?: number;
  processingTime?: number;
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface PopularQuery {
  query: string;
  count: number;
  lastUsed: number;
}

export interface SuggestionGroup {
  title: string;
  suggestions: SearchSuggestion[];
  icon: string;
  priority: number;
}

const SEMANTIC_SUGGESTIONS = [
  // AI & Machine Learning
  { keywords: ['ai', 'artificial intelligence', 'machine learning'], suggestions: ['neural networks', 'deep learning', 'tensorflow', 'pytorch', 'data science', 'algorithms'] },
  { keywords: ['code', 'programming', 'development'], suggestions: ['javascript', 'typescript', 'python', 'react', 'api', 'database'] },
  { keywords: ['data', 'analysis', 'analytics'], suggestions: ['visualization', 'statistics', 'dataset', 'csv', 'json', 'database queries'] },
  { keywords: ['document', 'pdf', 'text'], suggestions: ['markdown', 'documentation', 'notes', 'reports', 'presentations'] },
  { keywords: ['search', 'find', 'query'], suggestions: ['advanced search', 'filters', 'semantic search', 'full text search'] }
];

const SEARCH_COMMANDS = [
  { command: 'type:', description: 'Filter by file type (e.g., type:pdf, type:code)' },
  { command: 'size:', description: 'Filter by file size (e.g., size:>1MB, size:<500KB)' },
  { command: 'date:', description: 'Filter by date (e.g., date:today, date:last-week)' },
  { command: 'path:', description: 'Search in specific path (e.g., path:/documents)' },
  { command: 'ext:', description: 'Filter by extension (e.g., ext:js, ext:pdf)' },
  { command: 'content:', description: 'Search file content (e.g., content:"function name")' },
  { command: 'modified:', description: 'Filter by modification date' },
  { command: 'author:', description: 'Filter by author/creator' },
];

const QUICK_SUGGESTIONS = [
  'Find recent documents',
  'Show all PDF files',
  'Search code files',
  'Find large files',
  'Recent presentations',
  'All images',
  'Configuration files',
  'Database files',
  'Documentation',
  'Project files'
];

export function useRealTimeSearchSuggestions() {
  const [currentQuery, setCurrentQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [groupedSuggestions, setGroupedSuggestions] = useState<SuggestionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const { getRecentSearches, getPopularSearches } = useSearchHistory();

  // Get base suggestions from history
  const recentSearches = useMemo(() => getRecentSearches(5), [getRecentSearches]);
  const popularSearches = useMemo(() => getPopularSearches(5), [getPopularSearches]);

  // Generate semantic suggestions based on query
  const generateSemanticSuggestions = useCallback((query: string): SearchSuggestion[] => {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const semanticSugs: SearchSuggestion[] = [];

    // Find relevant semantic suggestions
    SEMANTIC_SUGGESTIONS.forEach(({ keywords, suggestions }) => {
      const isRelevant = keywords.some(keyword => 
        queryLower.includes(keyword) || keyword.includes(queryLower)
      );
      
      if (isRelevant) {
        suggestions.forEach((suggestion, index) => {
          if (suggestion.toLowerCase().includes(queryLower) || 
              queryLower.includes(suggestion.toLowerCase())) {
            semanticSugs.push({
              id: `semantic-${suggestion}-${index}`,
              text: suggestion,
              type: 'semantic',
              description: `Related to "${query}"`,
              category: keywords[0]
            });
          }
        });
      }
    });

    return semanticSugs.slice(0, 4);
  }, []);

  // Generate auto-complete suggestions
  const generateCompletions = useCallback((query: string): SearchSuggestion[] => {
    if (!query || query.length < 1) return [];

    const queryLower = query.toLowerCase();
    const completions: SearchSuggestion[] = [];

    // Check for command completions
    SEARCH_COMMANDS.forEach(({ command, description }) => {
      if (command.startsWith(queryLower) || queryLower === command.substring(0, queryLower.length)) {
        completions.push({
          id: `command-${command}`,
          text: command,
          type: 'command',
          description,
          category: 'commands'
        });
      }
    });

    // Quick suggestion completions
    QUICK_SUGGESTIONS.forEach((suggestion, index) => {
      if (suggestion.toLowerCase().includes(queryLower)) {
        completions.push({
          id: `quick-${index}`,
          text: suggestion,
          type: 'completion',
          description: 'Quick suggestion',
          category: 'quick'
        });
      }
    });

    // Historical completions from recent searches (SearchEntry[])
    recentSearches.forEach((search: SearchEntry, index) => {
      if (search.query.toLowerCase().includes(queryLower) && search.query !== query) {
        completions.push({
          id: `recent-historical-${index}`,
          text: search.query,
          type: 'recent',
          description: `Recent search`,
          frequency: 1,
          category: 'history'
        });
      }
    });
    
    // Historical completions from popular searches (PopularQuery[])
    popularSearches.forEach((search: PopularQuery, index) => {
      if (search.query.toLowerCase().includes(queryLower) && search.query !== query) {
        completions.push({
          id: `popular-historical-${index}`,
          text: search.query,
          type: 'popular',
          description: `${search.count} searches`,
          frequency: search.count,
          category: 'history'
        });
      }
    });

    return completions.slice(0, 6);
  }, [recentSearches, popularSearches]);

  // Generate suggestions based on current query
  const generateSuggestions = useCallback(async (query: string) => {
    setIsLoading(true);
    
    try {
      const allSuggestions: SearchSuggestion[] = [];

      if (!query.trim()) {
        // Show recent and popular when no query
        recentSearches.slice(0, 3).forEach((search: SearchEntry, index) => {
          allSuggestions.push({
            id: `recent-${index}`,
            text: search.query,
            type: 'recent',
            description: `Last searched: ${new Date(search.timestamp).toLocaleDateString()}`,
            category: 'recent'
          });
        });

        popularSearches.slice(0, 3).forEach((search: PopularQuery, index) => {
          allSuggestions.push({
            id: `popular-${index}`,
            text: search.query,
            type: 'popular',
            description: `${search.count} searches`,
            frequency: search.count,
            category: 'popular'
          });
        });

        // Add quick suggestions
        QUICK_SUGGESTIONS.slice(0, 4).forEach((suggestion, index) => {
          allSuggestions.push({
            id: `quick-empty-${index}`,
            text: suggestion,
            type: 'completion',
            description: 'Suggested search',
            category: 'quick'
          });
        });
      } else {
        // Generate contextual suggestions
        const completions = generateCompletions(query);
        const semanticSugs = generateSemanticSuggestions(query);

        allSuggestions.push(...completions, ...semanticSugs);
      }

      // Remove duplicates and sort by relevance
      const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text === suggestion.text)
      );

      // Sort by type priority and frequency
      const sortedSuggestions = uniqueSuggestions.sort((a, b) => {
        const typePriority: Record<string, number> = {
          command: 0,
          completion: 1,
          popular: 2,
          recent: 3,
          semantic: 4,
          ai: 5,
          contextual: 6
        };
        const aPriority = typePriority[a.type] || 7;
        const bPriority = typePriority[b.type] || 7;
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        return (b.frequency || 0) - (a.frequency || 0);
      });

      setSuggestions(sortedSuggestions.slice(0, 8));
      
      // Group suggestions
      const groups: SuggestionGroup[] = [
        {
          title: 'Commands',
          suggestions: sortedSuggestions.filter(s => s.type === 'command'),
          icon: '⌘',
          priority: 0
        },
        {
          title: 'Completions',
          suggestions: sortedSuggestions.filter(s => s.type === 'completion'),
          icon: '✨',
          priority: 1
        },
        {
          title: 'Popular',
          suggestions: sortedSuggestions.filter(s => s.type === 'popular'),
          icon: '🔥',
          priority: 2
        },
        {
          title: 'Recent',
          suggestions: sortedSuggestions.filter(s => s.type === 'recent'),
          icon: '⏰',
          priority: 3
        },
        {
          title: 'Related',
          suggestions: sortedSuggestions.filter(s => s.type === 'semantic'),
          icon: '🧠',
          priority: 4
        }
      ].filter(group => group.suggestions.length > 0);

      setGroupedSuggestions(groups);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [recentSearches, popularSearches, generateCompletions, generateSemanticSuggestions]);

  // Debounced suggestion generation
  const updateSuggestions = useCallback((query: string) => {
    setCurrentQuery(query);
    setSelectedIndex(-1);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      generateSuggestions(query);
    }, query.length > 0 ? 150 : 0);

    setDebounceTimer(timer);
  }, [debounceTimer, generateSuggestions]);

  // Keyboard navigation
  const navigateSuggestions = useCallback((direction: 'up' | 'down') => {
    setSuggestions(prev => {
      const maxIndex = prev.length - 1;
      setSelectedIndex(current => {
        if (direction === 'down') {
          return current >= maxIndex ? -1 : current + 1;
        } else {
          return current <= -1 ? maxIndex : current - 1;
        }
      });
      return prev;
    });
  }, []);

  // Get currently selected suggestion
  const getSelectedSuggestion = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      return suggestions[selectedIndex];
    }
    return null;
  }, [selectedIndex, suggestions]);

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setGroupedSuggestions([]);
    setSelectedIndex(-1);
    setCurrentQuery('');
  }, []);

  // Get suggestion analytics
  const getSuggestionAnalytics = useCallback(() => {
    return {
      totalSuggestions: suggestions.length,
      groupCount: groupedSuggestions.length,
      recentCount: suggestions.filter(s => s.type === 'recent').length,
      popularCount: suggestions.filter(s => s.type === 'popular').length,
      semanticCount: suggestions.filter(s => s.type === 'semantic').length,
      commandCount: suggestions.filter(s => s.type === 'command').length,
      isLoading
    };
  }, [suggestions, groupedSuggestions, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    suggestions,
    groupedSuggestions,
    isLoading,
    selectedIndex,
    currentQuery,
    updateSuggestions,
    navigateSuggestions,
    getSelectedSuggestion,
    clearSuggestions,
    getSuggestionAnalytics
  };
}

export default useRealTimeSearchSuggestions;