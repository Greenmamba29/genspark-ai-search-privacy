import { useState, useEffect, useCallback, useMemo } from 'react';

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

interface SearchAnalytics {
  totalSearches: number;
  averageProcessingTime: number;
  mostPopularQueries: Array<{ query: string; count: number; lastUsed: number }>;
  searchTrends: Array<{ date: string; count: number }>;
  categoryUsage: Record<string, number>;
}

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<SearchEntry[]>([]);
  const [analytics, setAnalytics] = useState<SearchAnalytics>({
    totalSearches: 0,
    averageProcessingTime: 0,
    mostPopularQueries: [],
    searchTrends: [],
    categoryUsage: {}
  });

  // Load search history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('genspark-search-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory) as SearchEntry[];
        setSearchHistory(parsed);
        updateAnalytics(parsed);
      } catch (error) {
        console.error('Failed to load search history:', error);
        setSearchHistory([]);
      }
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem('genspark-search-history', JSON.stringify(searchHistory));
      updateAnalytics(searchHistory);
    }
  }, [searchHistory]);

  // Update analytics based on search history
  const updateAnalytics = useCallback((history: SearchEntry[]) => {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(entry => entry.timestamp > thirtyDaysAgo);

    // Calculate query popularity
    const queryCount = new Map<string, { count: number; lastUsed: number }>();
    recentHistory.forEach(entry => {
      const existing = queryCount.get(entry.query.toLowerCase());
      if (existing) {
        existing.count++;
        existing.lastUsed = Math.max(existing.lastUsed, entry.timestamp);
      } else {
        queryCount.set(entry.query.toLowerCase(), {
          count: 1,
          lastUsed: entry.timestamp
        });
      }
    });

    const mostPopularQueries = Array.from(queryCount.entries())
      .map(([query, data]) => ({ query, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate search trends (last 30 days)
    const searchTrends: Array<{ date: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = date.setHours(0, 0, 0, 0);
      const dayEnd = date.setHours(23, 59, 59, 999);
      
      const count = recentHistory.filter(
        entry => entry.timestamp >= dayStart && entry.timestamp <= dayEnd
      ).length;
      
      searchTrends.push({ date: dateStr, count });
    }

    // Category usage
    const categoryUsage: Record<string, number> = {};
    recentHistory.forEach(entry => {
      if (entry.category) {
        categoryUsage[entry.category] = (categoryUsage[entry.category] || 0) + 1;
      }
    });

    // Average processing time
    const entriesWithProcessingTime = recentHistory.filter(entry => entry.processingTime);
    const averageProcessingTime = entriesWithProcessingTime.length > 0
      ? entriesWithProcessingTime.reduce((sum, entry) => sum + (entry.processingTime || 0), 0) / entriesWithProcessingTime.length
      : 0;

    setAnalytics({
      totalSearches: history.length,
      averageProcessingTime,
      mostPopularQueries,
      searchTrends,
      categoryUsage
    });
  }, []);

  // Save a new search to history
  const saveSearch = useCallback((
    query: string,
    options?: {
      category?: string;
      resultsCount?: number;
      processingTime?: number;
      filters?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ) => {
    const searchEntry: SearchEntry = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      timestamp: Date.now(),
      ...options
    };

    setSearchHistory(prev => {
      // Remove duplicate queries from recent history (last 50 searches)
      const recentUniqueHistory = prev
        .slice(0, 50)
        .filter(entry => entry.query.toLowerCase() !== query.toLowerCase());
      
      // Keep only the most recent 1000 searches to prevent unlimited growth
      const newHistory = [searchEntry, ...recentUniqueHistory].slice(0, 1000);
      
      return newHistory;
    });

    return searchEntry.id;
  }, []);

  // Get popular searches
  const getPopularSearches = useCallback((limit = 5) => {
    return analytics.mostPopularQueries.slice(0, limit);
  }, [analytics.mostPopularQueries]);

  // Get recent searches
  const getRecentSearches = useCallback((limit = 10) => {
    return searchHistory.slice(0, limit);
  }, [searchHistory]);

  // Search suggestions based on history
  const getSearchSuggestions = useCallback((partialQuery: string, limit = 5) => {
    if (!partialQuery || partialQuery.length < 2) {
      return getPopularSearches(limit);
    }

    const query = partialQuery.toLowerCase();
    const suggestions = searchHistory
      .filter(entry => entry.query.toLowerCase().includes(query))
      .reduce((unique, entry) => {
        const existing = unique.find(u => u.query.toLowerCase() === entry.query.toLowerCase());
        if (!existing) {
          unique.push(entry);
        }
        return unique;
      }, [] as SearchEntry[])
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return suggestions;
  }, [searchHistory, getPopularSearches]);

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('genspark-search-history');
    setAnalytics({
      totalSearches: 0,
      averageProcessingTime: 0,
      mostPopularQueries: [],
      searchTrends: [],
      categoryUsage: {}
    });
  }, []);

  // Clear old entries (older than specified days)
  const clearOldHistory = useCallback((daysToKeep = 90) => {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    setSearchHistory(prev => prev.filter(entry => entry.timestamp > cutoffTime));
  }, []);

  // Export search history
  const exportHistory = useCallback(() => {
    const exportData = {
      searchHistory,
      analytics,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genspark-search-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [searchHistory, analytics]);

  // Import search history
  const importHistory = useCallback((file: File) => {
    return new Promise<boolean>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.searchHistory && Array.isArray(data.searchHistory)) {
            setSearchHistory(data.searchHistory);
            resolve(true);
          } else {
            reject(new Error('Invalid history file format'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  // Memoized computed values
  const recentQueries = useMemo(() => {
    return searchHistory
      .slice(0, 20)
      .map(entry => entry.query)
      .filter((query, index, array) => array.indexOf(query) === index);
  }, [searchHistory]);

  const hasHistory = useMemo(() => searchHistory.length > 0, [searchHistory]);

  const searchStats = useMemo(() => {
    const last7Days = searchHistory.filter(
      entry => entry.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000)
    ).length;
    
    const last30Days = searchHistory.filter(
      entry => entry.timestamp > Date.now() - (30 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      total: searchHistory.length,
      last7Days,
      last30Days,
      todayCount: searchHistory.filter(
        entry => entry.timestamp > Date.now() - (24 * 60 * 60 * 1000)
      ).length
    };
  }, [searchHistory]);

  return {
    // Core data
    searchHistory,
    analytics,
    
    // Actions
    saveSearch,
    clearHistory,
    clearOldHistory,
    exportHistory,
    importHistory,
    
    // Computed values
    getPopularSearches,
    getRecentSearches,
    getSearchSuggestions,
    recentQueries,
    hasHistory,
    searchStats
  };
}