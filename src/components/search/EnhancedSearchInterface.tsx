import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  Cpu,
  Menu,
  MapPin,
  Upload,
  X,
  Lightbulb,
  Zap,
  Brain,
  FileText,
  Code,
  Database,
  Image as ImageIcon
} from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { useRealTimeSearchSuggestions } from '../../hooks/useRealTimeSearchSuggestions';
import { useAdvancedFilters } from '../../hooks/useAdvancedFilters';
import SearchResults from './SearchResults';
import LeftPanel from '../panels/LeftPanel';
import RightPanel from '../panels/RightPanel';
import FileUploadComponent from '../ui/FileUploadComponent';
import AdvancedFilterPanel from '../filters/AdvancedFilterPanel';

// Enhanced interfaces for better TypeScript support
interface SearchState {
  query: string;
  isSearching: boolean;
  showSuggestions: boolean;
  enhancedQuery?: string;
  searchIntent?: string;
  confidence?: number;
}

interface FilterState {
  type: string[];
  dateRange?: { start?: Date; end?: Date };
  sizeRange?: { min: number; max: number };
  tags: string[];
  sortBy: 'relevance' | 'date' | 'size' | 'name';
  sortOrder: 'asc' | 'desc';
}

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All Files', icon: FileText, color: 'text-blue-500' },
  { id: 'document', label: 'Documents', icon: FileText, color: 'text-green-500' },
  { id: 'code', label: 'Code', icon: Code, color: 'text-purple-500' },
  { id: 'data', label: 'Data', icon: Database, color: 'text-orange-500' },
  { id: 'image', label: 'Images', icon: ImageIcon, color: 'text-pink-500' }
];


export default function EnhancedSearchInterface() {
  // State management with better organization
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    isSearching: false,
    showSuggestions: false
  });

  const [uiState, setUiState] = useState({
    viewMode: 'grid' as 'grid' | 'list',
    showFilters: false,
    leftPanelOpen: false,
    rightPanelOpen: false,
    showUpload: false,
    activeCategory: 'all'
  });

  const [_filterState] = useState<FilterState>({
    type: [],
    tags: [],
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  // Enhanced hooks
  const {
    results,
    isSearching,
    error,
    totalResults,
    processingTime,
    model,
    query: currentQuery,
    isBackendConnected,
    search
  } = useSearch();

  const {
    saveSearch
  } = useSearchHistory();

  const {
    suggestions,
    groupedSuggestions,
    isLoading: suggestionsLoading,
    selectedIndex,
    updateSuggestions,
    navigateSuggestions,
    getSelectedSuggestion,
    clearSuggestions
  } = useRealTimeSearchSuggestions();

  // Advanced filters
  const {
    filters,
    isFilterPanelOpen,
    hasActiveFilters,
    updateFilters,
    toggleFilterPanel,
    getSearchQuery,
    getBackendFilters,
    getFilterSummary
  } = useAdvancedFilters({
    onFiltersChange: (_newFilters) => {
      // Automatically re-run search when filters change
      if (searchState.query.trim()) {
        handleSearch(searchState.query)
      }
    }
  });


  // Enhanced search handler with debouncing and analytics
  const handleSearch = useCallback(async (queryOverride?: string) => {
    const searchQuery = queryOverride || searchState.query;
    if (!searchQuery.trim()) return;

    setSearchState(prev => ({ ...prev, isSearching: true, showSuggestions: false }));

    try {
      // Save search to history
      saveSearch(searchQuery);

      // Generate enhanced query with filters
      const enhancedQuery = getSearchQuery(searchQuery);
      const backendFilters = getBackendFilters();

      // Perform enhanced search with advanced filters
      const searchFilters = {
        ...backendFilters,
        type: uiState.activeCategory === 'all' ? filters.fileTypes : [uiState.activeCategory],
        dateRange: backendFilters.dateRange ? {
          start: backendFilters.dateRange.start || undefined,
          end: backendFilters.dateRange.end || undefined
        } : undefined,
        sizeRange: backendFilters.sizeRange || undefined
      };
      await search(enhancedQuery, searchFilters);

      // TODO: Integrate with Gemini for query enhancement
      // const enhancement = await geminiService.enhanceQuery(enhancedQuery, { recentSearches });
      // setSearchState(prev => ({ 
      //   ...prev, 
      //   enhancedQuery: enhancement.enhancedQuery,
      //   searchIntent: enhancement.intent,
      //   confidence: enhancement.confidence
      // }));

    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchState(prev => ({ ...prev, isSearching: false }));
    }
  }, [searchState.query, filters, uiState.activeCategory, search, saveSearch, getSearchQuery, getBackendFilters]);



  // Enhanced keyboard handling with suggestions navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle suggestions navigation when suggestions are visible
      if (searchState.showSuggestions && suggestions.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            navigateSuggestions('down');
            break;
          case 'ArrowUp':
            e.preventDefault();
            navigateSuggestions('up');
            break;
          case 'Enter':
            e.preventDefault();
            const selectedSuggestion = getSelectedSuggestion();
            if (selectedSuggestion) {
              setSearchState(prev => ({ ...prev, query: selectedSuggestion.text, showSuggestions: false }));
              handleSearch(selectedSuggestion.text);
            } else if (searchState.query.trim()) {
              handleSearch();
            }
            break;
          case 'Escape':
            e.preventDefault();
            setSearchState(prev => ({ ...prev, showSuggestions: false }));
            clearSuggestions();
            break;
        }
        return;
      }

      // Global shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
          case 'u':
            e.preventDefault();
            setUiState(prev => ({ ...prev, showUpload: true }));
            break;
          case '/':
            e.preventDefault();
            toggleFilterPanel();
            break;
        }
      }
      
      if (e.key === 'Escape') {
        setSearchState(prev => ({ ...prev, showSuggestions: false }));
        setUiState(prev => ({ ...prev, showUpload: false, showFilters: false }));
        clearSuggestions();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchState.showSuggestions, suggestions, navigateSuggestions, getSelectedSuggestion, clearSuggestions, handleSearch, searchState.query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      {/* Enhanced Side Panels */}
      <AnimatePresence>
        {uiState.leftPanelOpen && (
          <LeftPanel 
            isOpen={uiState.leftPanelOpen} 
            onClose={() => setUiState(prev => ({ ...prev, leftPanelOpen: false }))} 
          />
        )}
        {uiState.rightPanelOpen && (
          <RightPanel 
            isOpen={uiState.rightPanelOpen} 
            onClose={() => setUiState(prev => ({ ...prev, rightPanelOpen: false }))} 
          />
        )}
      </AnimatePresence>

      {/* Enhanced Upload Modal */}
      <AnimatePresence>
        {uiState.showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setUiState(prev => ({ ...prev, showUpload: false }))}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Files</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Add documents to your AI-powered search index
                    </p>
                  </div>
                  <button
                    onClick={() => setUiState(prev => ({ ...prev, showUpload: false }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <FileUploadComponent />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area - Console Layout */}
      <div className={`min-h-screen flex flex-col transition-all duration-300 ease-out ${
        uiState.leftPanelOpen ? 'lg:ml-96' : ''
      } ${
        uiState.rightPanelOpen ? 'lg:mr-96' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
          
          {/* Enhanced Header with Categories */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 flex-shrink-0"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6">
              Grahmos AI Search
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Discover, analyze, and understand your documents with the power of AI
            </p>
          </motion.div>

          {/* Search Categories */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-3 mb-8 flex-shrink-0"
          >
            {SEARCH_CATEGORIES.map((category) => {
              const IconComponent = category.icon;
              const isActive = uiState.activeCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setUiState(prev => ({ ...prev, activeCategory: category.id }))}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 shadow-lg text-slate-900 dark:text-white border-2 border-blue-200 dark:border-blue-800'
                      : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 ${isActive ? category.color : ''}`} />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </motion.div>

          {/* Results Area - Takes remaining space, grows to fill */}
          <div className="flex-1 flex flex-col justify-end min-h-0">
            {/* Search Results - Positioned above search bar */}
            <AnimatePresence>
              {(currentQuery || results.length > 0 || isSearching) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mb-6 flex-1 overflow-auto"
                >
                  <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6">
                    <SearchResults
                      results={results}
                      totalResults={totalResults}
                      processingTime={processingTime}
                      model={model}
                      query={currentQuery}
                      isSearching={isSearching}
                      viewMode={uiState.viewMode}
                      isBackendConnected={isBackendConnected}
                    />
                    
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                      >
                        <p className="text-red-800 dark:text-red-200 text-sm">
                          <span className="font-medium">Search Error:</span> {error}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fixed Search Console at Bottom */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative max-w-4xl mx-auto flex-shrink-0"
            >
              <div className="flex items-center space-x-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-4">
                {/* Control Panel Toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setUiState(prev => ({ ...prev, leftPanelOpen: !prev.leftPanelOpen }))}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                    uiState.leftPanelOpen 
                      ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                  title="Control Center (⌘+K)"
                >
                  <Menu className="w-5 h-5" />
                </motion.button>

                {/* Main Search Input */}
                <div className="flex-1 relative">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                    <input
                      id="search-input"
                      type="text"
                      value={searchState.query}
                    onChange={(e) => {
                      const newQuery = e.target.value;
                      setSearchState(prev => ({ 
                        ...prev, 
                        query: newQuery,
                        showSuggestions: true
                      }));
                      updateSuggestions(newQuery);
                    }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    onFocus={() => {
                      setSearchState(prev => ({ ...prev, showSuggestions: true }));
                      updateSuggestions(searchState.query);
                    }}
                      placeholder="Ask AI to find anything... (⌘+K)"
                      className="w-full pl-12 pr-32 py-4 text-lg bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 placeholder-slate-400"
                    />
                    
                    {/* Search Status Indicators */}
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-3">
                      <AnimatePresence>
                        {searchState.enhancedQuery && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center space-x-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full"
                            title={`Enhanced by AI (${Math.round((searchState.confidence || 0) * 100)}% confidence)`}
                          >
                            <Brain className="w-3 h-3" />
                            <span>AI</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Connection Status */}
                      <div title={isBackendConnected ? 'Local AI Connected' : 'Demo Mode'}>
                        {isBackendConnected ? (
                          <Cpu className="w-5 h-5 text-green-500" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>

                      {/* Search Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSearch()}
                        disabled={!searchState.query.trim() || isSearching}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {isSearching ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Zap className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          'Search'
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Enhanced Real-time Suggestions Dropdown */}
                  <AnimatePresence>
                    {searchState.showSuggestions && !isSearching && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-20 overflow-hidden"
                      >
                        {/* AI Suggestions Header */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                              <Lightbulb className="w-4 h-4" />
                              <span>Smart suggestions with {model.split('/').pop() || 'AI'}</span>
                            </div>
                            {suggestionsLoading && (
                              <div className="w-4 h-4 animate-spin border-2 border-blue-500 border-t-transparent rounded-full" />
                            )}
                          </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                          {/* Grouped Suggestions */}
                          {groupedSuggestions.length > 0 ? (
                            groupedSuggestions.map((group) => (
                              <div key={group.title}>
                                <div className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">{group.icon}</span>
                                    <span>{group.title}</span>
                                    <span className="text-xs bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded">
                                      {group.suggestions.length}
                                    </span>
                                  </div>
                                </div>
                                {group.suggestions.map((suggestion, index) => {
                                  const isSelected = suggestions.findIndex(s => s.id === suggestion.id) === selectedIndex;
                                  return (
                                    <motion.button
                                      key={suggestion.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      onClick={() => {
                                        setSearchState(prev => ({ ...prev, query: suggestion.text, showSuggestions: false }));
                                        handleSearch(suggestion.text);
                                      }}
                                      className={`w-full p-3 transition-colors duration-150 flex items-center space-x-3 text-left ${
                                        isSelected 
                                          ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      <div className={`p-2 rounded-lg ${
                                        suggestion.type === 'command' ? 'bg-purple-100 dark:bg-purple-900/20' :
                                        suggestion.type === 'popular' ? 'bg-red-100 dark:bg-red-900/20' :
                                        suggestion.type === 'recent' ? 'bg-blue-100 dark:bg-blue-900/20' :
                                        suggestion.type === 'semantic' ? 'bg-green-100 dark:bg-green-900/20' :
                                        'bg-yellow-100 dark:bg-yellow-900/20'
                                      }`}>
                                        <span className="text-sm">
                                          {suggestion.type === 'command' ? '⌘' :
                                           suggestion.type === 'popular' ? '🔥' :
                                           suggestion.type === 'recent' ? '⏰' :
                                           suggestion.type === 'semantic' ? '🧠' : '✨'}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <p className={`font-medium text-sm ${
                                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'
                                        }`}>
                                          {suggestion.text}
                                        </p>
                                        {suggestion.description && (
                                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {suggestion.description}
                                          </p>
                                        )}
                                      </div>
                                      {suggestion.frequency && (
                                        <div className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded">
                                          {suggestion.frequency}
                                        </div>
                                      )}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            ))
                          ) : (
                            // Fallback simple list
                            suggestions.map((suggestion, index) => {
                              const isSelected = index === selectedIndex;
                              return (
                                <motion.button
                                  key={suggestion.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  onClick={() => {
                                    setSearchState(prev => ({ ...prev, query: suggestion.text, showSuggestions: false }));
                                    handleSearch(suggestion.text);
                                  }}
                                  className={`w-full p-3 transition-colors duration-150 flex items-center space-x-3 text-left ${
                                    isSelected 
                                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg ${
                                    suggestion.type === 'command' ? 'bg-purple-100 dark:bg-purple-900/20' :
                                    suggestion.type === 'popular' ? 'bg-red-100 dark:bg-red-900/20' :
                                    suggestion.type === 'recent' ? 'bg-blue-100 dark:bg-blue-900/20' :
                                    suggestion.type === 'semantic' ? 'bg-green-100 dark:bg-green-900/20' :
                                    'bg-yellow-100 dark:bg-yellow-900/20'
                                  }`}>
                                    <span className="text-sm">
                                      {suggestion.type === 'command' ? '⌘' :
                                       suggestion.type === 'popular' ? '🔥' :
                                       suggestion.type === 'recent' ? '⏰' :
                                       suggestion.type === 'semantic' ? '🧠' : '✨'}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <p className={`font-medium text-sm ${
                                      isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'
                                    }`}>
                                      {suggestion.text}
                                    </p>
                                    {suggestion.description && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {suggestion.description}
                                      </p>
                                    )}
                                  </div>
                                  {suggestion.frequency && (
                                    <div className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded">
                                      {suggestion.frequency}
                                    </div>
                                  )}
                                </motion.button>
                              );
                            })
                          )}
                        </div>

                        {/* Keyboard shortcuts hint */}
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                            <span>↑↓ navigate • Enter select • Esc close</span>
                            <span>{suggestions.length} suggestions</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  {/* Advanced Filters */}
                  <div className="relative">
                    <AdvancedFilterPanel
                      filters={filters}
                      onFiltersChange={updateFilters}
                      isOpen={isFilterPanelOpen}
                      onToggle={toggleFilterPanel}
                      resultStats={{
                        totalResults: totalResults || 0,
                        fileTypeCounts: {
                          document: Math.floor((totalResults || 0) * 0.3),
                          code: Math.floor((totalResults || 0) * 0.25),
                          data: Math.floor((totalResults || 0) * 0.2),
                          image: Math.floor((totalResults || 0) * 0.15),
                          video: Math.floor((totalResults || 0) * 0.05),
                          audio: Math.floor((totalResults || 0) * 0.03),
                          archive: Math.floor((totalResults || 0) * 0.02)
                        },
                        tagCounts: {},
                        sizeDistribution: { min: 0, max: 100000000, avg: 5000000 }
                      }}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setUiState(prev => ({ ...prev, rightPanelOpen: !prev.rightPanelOpen }))}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                      uiState.rightPanelOpen 
                        ? 'bg-purple-500 border-purple-500 text-white shadow-lg'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                    title="Insights Hub"
                  >
                    <MapPin className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setUiState(prev => ({ ...prev, showUpload: true }))}
                    className="p-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:border-green-300 dark:hover:border-green-700 transition-all duration-200"
                    title="Upload Files (⌘+U)"
                  >
                    <Upload className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 px-6"
            >
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Active Filters:</span>
                    <div className="flex items-center space-x-2">
                      {getFilterSummary().map((summary, index) => (
                        <span key={index} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                          {summary}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => updateFilters({
                      fileTypes: [],
                      dateRange: { start: null, end: null, preset: 'all' },
                      sizeRange: { min: 0, max: Infinity, preset: 'all' },
                      tags: [],
                      contentTypes: [],
                      sortBy: 'relevance',
                      sortOrder: 'desc',
                      searchIn: { filename: true, content: true, metadata: true, tags: true }
                    })}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}