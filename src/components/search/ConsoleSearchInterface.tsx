import { useState, useEffect, useRef } from 'react'
import { Search, Sparkles, Cpu, Upload, X, BarChart3, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealTimeSearch } from '../../hooks/useRealTimeSearch'
import { useModels } from '../../contexts/ModelContext'
import GoogleStyleSearchResults from './GoogleStyleSearchResults'
import SearchSuggestions from './SearchSuggestions'
import EnhancedLeftPanel from '../panels/EnhancedLeftPanel'
import RightPanel from '../panels/RightPanel'
import FileUploadComponent from '../ui/FileUploadComponent'
import ModelSelector from '../ai/ModelSelector'
import ModelDownloadModal from '../ai/ModelDownloadModal'

export default function ConsoleSearchInterface() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [leftPanelOpen, setLeftPanelOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showModelDownload, setShowModelDownload] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const { getCurrentModelInfo, downloadModel, state: modelState } = useModels()
  const currentModelId = modelState.currentModel
  const currentModelName = getCurrentModelInfo()?.name || currentModelId

  const {
    results,
    isSearching,
    error,
    totalResults,
    processingTime,
    model,
    query,
    isBackendConnected,
    searchHistory,
    searchRealTime,
    search,
    clearResults,
    addToHistory
  } = useRealTimeSearch(300, currentModelId) // Pass current model to hook


  // Handle real-time search as user types
  useEffect(() => {
    if (searchQuery !== query) {
      searchRealTime(searchQuery)
    }
  }, [searchQuery, query, searchRealTime])

  // Handle search input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSuggestions(value.trim().length > 0)
  }

  // Handle manual search (Enter key)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setShowSuggestions(false)
    await search(searchQuery)
    addToHistory(searchQuery)
    searchInputRef.current?.blur()
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    search(suggestion)
    addToHistory(suggestion)
  }

  // Handle input focus/blur
  const handleFocus = () => {
    setIsFocused(true)
    setShowSuggestions(searchQuery.trim().length > 0)
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Delay hiding suggestions to allow clicks
    setTimeout(() => setShowSuggestions(false), 150)
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      searchInputRef.current?.blur()
    }
  }

  // Clear search
  const handleClear = () => {
    setSearchQuery('')
    setShowSuggestions(false)
    clearResults()
    searchInputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 relative">
      {/* Side Panels */}
      <EnhancedLeftPanel isOpen={leftPanelOpen} onClose={() => setLeftPanelOpen(false)} />
      <RightPanel isOpen={rightPanelOpen} onClose={() => setRightPanelOpen(false)} />

      {/* File Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Files to GenSpark AI</h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <FileUploadComponent />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ease-out ${
        leftPanelOpen ? 'lg:pl-96' : ''
      } ${
        rightPanelOpen ? 'lg:pr-96' : ''
      }`}>
        
        {/* Results Area - Scrollable */}
        <div className="pb-32 pt-8">
          <div className="max-w-4xl mx-auto px-4">
            
            {/* Grahmos Header */}
            {!query && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
              >
                <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
                  GenSpark AI
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  AI-Powered Semantic Search with Local Models
                </p>
                <div className="mt-4 flex flex-col items-center justify-center space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-500">
                    <div className="flex items-center space-x-1">
                      {isBackendConnected ? (
                        <Cpu className="w-4 h-4 text-green-500" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                      )}
                      <span>{currentModelName}</span>
                    </div>
                    <span>•</span>
                    <span>{isBackendConnected ? 'Local AI Connected' : 'Demo Mode - Mock Data'}</span>
                  </div>
                  {!isBackendConnected && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-md">
                      Currently showing sample results. Connect a backend service for actual AI search functionality.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Search Results */}
            <AnimatePresence>
              {(query || results.length > 0 || isSearching) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-8"
                >
                  <GoogleStyleSearchResults
                    results={results}
                    totalResults={totalResults}
                    processingTime={processingTime}
                    model={model}
                    query={query}
                    isSearching={isSearching}
                    isBackendConnected={isBackendConnected}
                  />
                  
                  {/* Error Display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 max-w-2xl p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <p className="text-red-800 dark:text-red-200 text-sm">
                        <span className="font-medium">Search Error:</span> {error}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Search Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-2xl z-40">
        <div className={`max-w-4xl mx-auto p-4 transition-all duration-300 ease-out ${
          leftPanelOpen ? 'lg:ml-96' : ''
        } ${
          rightPanelOpen ? 'lg:mr-96' : ''
        }`}>
          
          {/* Controls Row */}
          <div className="flex items-center justify-between mb-4">
            {/* Left Controls */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  leftPanelOpen 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title="Analytics & Insights"
              >
                <BarChart3 className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUpload(true)}
                className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
                title="Quick Upload"
              >
                <Upload className="w-5 h-5" />
              </motion.button>
              
              {/* Model Selector */}
              <ModelSelector 
                compact={true} 
                onModelDownloadClick={() => setShowModelDownload(true)}
              />
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  rightPanelOpen 
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title="Search Controls"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Search Input */}
          <div ref={searchContainerRef} className="relative">
            <div className={`relative transition-all duration-300 ${
              isFocused ? 'transform -translate-y-1 shadow-2xl' : 'shadow-xl'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-50" />
              
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-600 overflow-hidden">
                <div className="flex items-center">
                  <div className="pl-6 pr-3 py-4">
                    <Search className={`w-6 h-6 transition-colors duration-200 ${
                      isFocused ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                  
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask GenSpark AI anything... (e.g., 'Find documents about machine learning')"
                    className="flex-1 py-4 text-lg bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  
                  <div className="flex items-center space-x-3 pr-6 pl-3">
                    {/* AI Status Indicator */}
                    <div className="flex items-center space-x-2">
                      {isBackendConnected ? (
                        <div title="Local AI Connected" className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <Cpu className="w-5 h-5 text-green-500" />
                        </div>
                      ) : (
                        <div title="Demo Mode" className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                          <Sparkles className="w-5 h-5 text-yellow-500" />
                        </div>
                      )}
                    </div>

                    {/* Clear Button */}
                    {searchQuery && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={handleClear}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Clear search"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </motion.button>
                    )}

                    {/* Search Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSearch}
                      disabled={!searchQuery.trim() || isSearching}
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
                    >
                      {isSearching ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Searching...</span>
                        </div>
                      ) : (
                        'Search'
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Suggestions - Positioned Above Search Bar */}
            <div className="absolute bottom-full left-0 right-0 mb-4 z-[110]">
              <div className="relative">
                <SearchSuggestions
                  isVisible={showSuggestions}
                  searchQuery={searchQuery}
                  onSelect={handleSuggestionSelect}
                  model={model}
                  isBackendConnected={isBackendConnected}
                />
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
            <div className="flex items-center space-x-4">
              {isSearching ? (
                <span>Searching with {currentModelName} • {isBackendConnected ? 'Local AI' : 'Demo Mode'}</span>
              ) : isBackendConnected ? (
                <span>Ready to search with {currentModelName} • Local AI</span>
              ) : (
                <span>Running with {currentModelName} • Demo Mode</span>
              )}
            </div>
            
            {searchHistory.length > 0 && (
              <div className="flex items-center space-x-1">
                <span>{searchHistory.length} recent searches</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Model Download Modal */}
      <ModelDownloadModal
        isOpen={showModelDownload}
        onClose={() => setShowModelDownload(false)}
        onModelSelect={(modelId) => {
          downloadModel(modelId)
          setShowModelDownload(false)
        }}
        installedModels={modelState.installedModels}
        currentModel={modelState.currentModel}
      />
    </div>
  )
}
