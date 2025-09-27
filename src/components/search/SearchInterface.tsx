import { useState } from 'react';
import { Search, Filter, Grid, List, Sparkles, Cpu, Menu, MapPin, Upload, X } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import SearchResults from './SearchResults';
import LeftPanel from '../panels/LeftPanel';
import RightPanel from '../panels/RightPanel';
import FileUploadComponent from '../ui/FileUploadComponent'; // Import the new component

export default function SearchInterface() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [leftPanelOpen, setLeftPanelOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false); // Add new state for upload component
  const [activeFilters, setActiveFilters] = useState({
    type: [] as string[],
    dateRange: undefined,
    sizeRange: undefined,
    tags: [] as string[]
  })

  const {
    results,
    isSearching,
    error,
    totalResults,
    processingTime,
    model,
    query,
    isBackendConnected,
    search,
    // clearResults,
    setFilters
  } = useSearch()

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    await search(searchQuery, activeFilters)
  }

  const handleFilterChange = (newFilters: typeof activeFilters) => {
    setActiveFilters(newFilters)
    setFilters(newFilters)
  }

  return (
    <>
      {/* Side Panels */}
      <LeftPanel isOpen={leftPanelOpen} onClose={() => setLeftPanelOpen(false)} />
      <RightPanel isOpen={rightPanelOpen} onClose={() => setRightPanelOpen(false)} />

      {/* File Upload Component - Conditionally rendered */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-3xl p-8">
            <button onClick={() => setShowUpload(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700">
              <X className="w-6 h-6 text-secondary-500" />
            </button>
            <FileUploadComponent />
          </div>
        </div>
      )}
      
      {/* Main Content with adjusted margins for panels */}
      <div className={`w-full max-w-6xl mx-auto space-y-6 transition-all duration-300 ease-out ${
        leftPanelOpen ? 'lg:ml-96' : ''
      } ${
        rightPanelOpen ? 'lg:mr-96' : ''
      }`}>
        
        {/* Search Results Console - Above search input */}
        {(searchQuery || results.length > 0 || isSearching) && (
          <div className="space-y-4">
            <div className="card p-6">
              <SearchResults
                results={results}
                totalResults={totalResults}
                processingTime={processingTime}
                model={model}
                query={query}
                isSearching={isSearching}
                viewMode={viewMode}
                isBackendConnected={isBackendConnected}
              />
              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    <span className="font-medium">Search Error:</span> {error}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Search Container */}
        <div className="flex items-center space-x-4">
        {/* Left Panel Toggle */}
        <button 
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className={`p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 transition-all duration-200 ${
            leftPanelOpen 
              ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 shadow-lg'
              : 'bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 text-secondary-600 dark:text-secondary-400'
          }`}
          title="Control Center"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar - Centered */}
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask Grahmos AI anything... (e.g., 'Find documents about machine learning')"
              className="search-input pl-12 pr-20 py-4 text-lg w-full"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                {isBackendConnected ? (
                  <div title="Local AI Connected">
                    <Cpu className="w-5 h-5 text-green-500" />
                  </div>
                ) : (
                  <div title="Demo Mode">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                  </div>
                )}
                <button
                  onClick={() => handleSearch()}
                  disabled={!searchQuery.trim() || isSearching}
                  className="btn-primary px-4 py-2"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </div>
          
          {/* AI Suggestions */}
          {!searchQuery && !results.length && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-lg z-10">
              <div className="p-4">
                <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                  Try these AI-powered searches with {model.split('/').pop() || 'local AI'}:
                </p>
                <div className="space-y-2">
                  {[
                    "Find all PDF documents about machine learning",
                    "Show me code files containing authentication",
                    "Search for recent presentations and documents",
                    "Find technical documentation and guides"
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(suggestion)
                        handleSearch()
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 rounded-md transition-colors duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel Toggle */}
        <button 
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className={`p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 transition-all duration-200 ${
            rightPanelOpen 
              ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 shadow-lg'
              : 'bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 text-secondary-600 dark:text-secondary-400'
          }`}
          title="Insights Hub"
        >
          <MapPin className="w-5 h-5" />
        </button>

        {/* Upload Button */}
        <button 
          onClick={() => setShowUpload(true)}
          className="p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 transition-all duration-200 bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 text-secondary-600 dark:text-secondary-400"
          title="Upload Files"
        >
          <Upload className="w-5 h-5" />
        </button>
      </div>

        {/* Search Controls - Compact version below search bar */}
        <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center space-x-2 ${
              showFilters ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : ''
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          
          <div className="text-sm text-secondary-600 dark:text-secondary-400">
            {isSearching ? (
              `AI is processing your search using ${model.split('/').pop() || 'default model'}...`
            ) : isBackendConnected ? (
              `Ready to search offline with ${model.split('/').pop() || 'local AI'}`
            ) : (
              'Running in demonstration mode'
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              viewMode === 'grid'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              viewMode === 'list'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

        {/* Collapsible Filters Panel */}
        {showFilters && (
          <div className="card p-6 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                File Type
              </label>
              <select 
                className="search-input"
                value={activeFilters.type.length > 0 ? activeFilters.type[0] : ''}
                onChange={(e) => {
                  const newFilters = {
                    ...activeFilters,
                    type: e.target.value ? [e.target.value] : []
                  }
                  handleFilterChange(newFilters)
                }}
              >
                <option value="">All types</option>
                <option value="document">Documents</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="code">Code</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Date Range
              </label>
              <select className="search-input">
                <option>Any time</option>
                <option>Last 24 hours</option>
                <option>Last week</option>
                <option>Last month</option>
                <option>Last year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Size
              </label>
              <select className="search-input">
                <option>Any size</option>
                <option>Small (&lt; 1MB)</option>
                <option>Medium (1MB - 10MB)</option>
                <option>Large (&gt; 10MB)</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              {activeFilters.type.length > 0 && (
                <span>File type: {activeFilters.type.join(', ')}</span>
              )}
            </div>
            <button
              onClick={() => {
                const emptyFilters = {
                  type: [] as string[],
                  dateRange: undefined,
                  sizeRange: undefined,
                  tags: [] as string[]
                }
                handleFilterChange(emptyFilters)
              }}
              className="btn-secondary btn-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
        )}
        
      </div>
    </>
  )
}
