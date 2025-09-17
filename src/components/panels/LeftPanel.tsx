import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Clock,
  TrendingUp,
  Filter,
  Bookmark,
  Download,
  Upload,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  BarChart3,
  Calendar,
  Tag,
  Sliders,
  Brain,
  Cpu,
  Database,
  Activity,
  Users,
  Globe,
  Moon,
  Sun,
  Monitor,
  Zap
} from 'lucide-react';
import { useSearchHistory } from '../../hooks/useSearchHistory';

interface LeftPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PANEL_SECTIONS = [
  { id: 'recent', label: 'Recent Searches', icon: Clock },
  { id: 'filters', label: 'Advanced Filters', icon: Filter },
  { id: 'analytics', label: 'Search Analytics', icon: BarChart3 },
  { id: 'bookmarks', label: 'Saved Searches', icon: Bookmark },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function LeftPanel({ isOpen, onClose }: LeftPanelProps) {
  const [activeSection, setActiveSection] = useState('recent');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['recent', 'filters']));
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [savedSearches, setSavedSearches] = useState<Array<{ id: string; name: string; query: string; filters?: any }>>([]);

  const {
    searchHistory,
    analytics,
    getPopularSearches,
    getRecentSearches,
    clearHistory,
    clearOldHistory,
    exportHistory,
    importHistory,
    searchStats
  } = useSearchHistory();

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('genspark-theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Load saved searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('genspark-saved-searches');
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved searches:', error);
      }
    }
  }, []);

  // Theme handler
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('genspark-theme', newTheme);
    
    // Apply theme immediately
    if (newTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Save current search
  const saveCurrentSearch = (query: string, filters?: any) => {
    const newSavedSearch = {
      id: `saved_${Date.now()}`,
      name: query.length > 30 ? `${query.substring(0, 30)}...` : query,
      query,
      filters,
      timestamp: Date.now()
    };

    const updated = [...savedSearches, newSavedSearch];
    setSavedSearches(updated);
    localStorage.setItem('genspark-saved-searches', JSON.stringify(updated));
  };

  // Delete saved search
  const deleteSavedSearch = (id: string) => {
    const updated = savedSearches.filter(search => search.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('genspark-saved-searches', JSON.stringify(updated));
  };

  // Import search history file
  const handleImportHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importHistory(file)
        .then(() => {
          alert('Search history imported successfully!');
        })
        .catch((error) => {
          alert(`Failed to import history: ${error.message}`);
        });
    }
  };

  const recentSearches = useMemo(() => getRecentSearches(10), [getRecentSearches]);
  const popularSearches = useMemo(() => getPopularSearches(5), [getPopularSearches]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: -384, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -384, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700 z-50 overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Control Center</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Search analytics & settings
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">

                {/* Recent Searches Section */}
                <div className="space-y-3">
                  <button
                    onClick={() => toggleSection('recent')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-slate-900 dark:text-white">Recent Searches</span>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                        {recentSearches.length}
                      </span>
                    </div>
                    {expandedSections.has('recent') ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.has('recent') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {recentSearches.length > 0 ? (
                          <>
                            {recentSearches.map((search, index) => (
                              <motion.div
                                key={search.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {search.query}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(search.timestamp).toLocaleDateString()} • 
                                    {search.resultsCount ? ` ${search.resultsCount} results` : ' No results data'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => saveCurrentSearch(search.query)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-all"
                                  title="Save search"
                                >
                                  <Bookmark className="w-3 h-3 text-slate-500" />
                                </button>
                              </motion.div>
                            ))}
                            
                            <div className="flex space-x-2 mt-3">
                              <button
                                onClick={clearHistory}
                                className="flex-1 flex items-center justify-center space-x-1 p-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Clear All</span>
                              </button>
                              <button
                                onClick={() => clearOldHistory(30)}
                                className="flex-1 flex items-center justify-center space-x-1 p-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>30d+</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No recent searches</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Search Analytics Section */}
                <div className="space-y-3">
                  <button
                    onClick={() => toggleSection('analytics')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-slate-900 dark:text-white">Analytics</span>
                    </div>
                    {expandedSections.has('analytics') ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.has('analytics') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                            <div className="flex items-center justify-between">
                              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total</span>
                            </div>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                              {searchStats.total}
                            </p>
                          </div>

                          <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                            <div className="flex items-center justify-between">
                              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">7 Days</span>
                            </div>
                            <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">
                              {searchStats.last7Days}
                            </p>
                          </div>

                          <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                            <div className="flex items-center justify-between">
                              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Today</span>
                            </div>
                            <p className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1">
                              {searchStats.todayCount}
                            </p>
                          </div>

                          <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
                            <div className="flex items-center justify-between">
                              <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Avg</span>
                            </div>
                            <p className="text-lg font-bold text-orange-700 dark:text-orange-300 mt-1">
                              {Math.round(analytics.averageProcessingTime)}ms
                            </p>
                          </div>
                        </div>

                        {/* Popular Searches */}
                        {popularSearches.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              Popular Searches
                            </h4>
                            <div className="space-y-1">
                              {popularSearches.map((search, index) => (
                                <div key={index} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600 dark:text-slate-400 truncate flex-1">
                                    {search.query}
                                  </span>
                                  <span className="text-slate-500 dark:text-slate-500 ml-2">
                                    {search.count}x
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Saved Searches Section */}
                <div className="space-y-3">
                  <button
                    onClick={() => toggleSection('bookmarks')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Bookmark className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-slate-900 dark:text-white">Saved Searches</span>
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full">
                        {savedSearches.length}
                      </span>
                    </div>
                    {expandedSections.has('bookmarks') ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.has('bookmarks') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {savedSearches.length > 0 ? (
                          savedSearches.map((search, index) => (
                            <motion.div
                              key={search.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg group"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {search.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {search.query}
                                </p>
                              </div>
                              <button
                                onClick={() => deleteSavedSearch(search.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 rounded transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No saved searches</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Settings Section */}
                <div className="space-y-3">
                  <button
                    onClick={() => toggleSection('settings')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-900 dark:text-white">Settings</span>
                    </div>
                    {expandedSections.has('settings') ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.has('settings') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        {/* Theme Settings */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Theme
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'light', label: 'Light', icon: Sun },
                              { value: 'dark', label: 'Dark', icon: Moon },
                              { value: 'system', label: 'Auto', icon: Monitor }
                            ].map((themeOption) => {
                              const IconComponent = themeOption.icon;
                              return (
                                <button
                                  key={themeOption.value}
                                  onClick={() => handleThemeChange(themeOption.value as any)}
                                  className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                                    theme === themeOption.value
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                >
                                  <IconComponent className="w-4 h-4 mb-1" />
                                  <span className="text-xs font-medium">{themeOption.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Data Management */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Data Management
                          </h4>
                          <div className="space-y-2">
                            <button
                              onClick={exportHistory}
                              className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>Export History</span>
                            </button>
                            
                            <label className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors cursor-pointer">
                              <Upload className="w-4 h-4" />
                              <span>Import History</span>
                              <input
                                type="file"
                                accept=".json"
                                onChange={handleImportHistory}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>GenSpark AI Search</span>
                <span>v2.0.0</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
