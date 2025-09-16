import { useState } from 'react'
import { Search, Filter, Grid, List, Sparkles } from 'lucide-react'

export default function SearchInterface() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = async () => {
    setIsSearching(true)
    // Simulate AI search processing
    setTimeout(() => {
      setIsSearching(false)
    }, 1500)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ask Grahmos AI anything... (e.g., 'Find documents about climate change')"
            className="search-input pl-12 pr-20 py-4 text-lg"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-accent-500 animate-pulse" />
            <button
              onClick={() => handleSearch()}
              disabled={!searchQuery.trim() || isSearching}
              className="btn-primary px-4 py-2"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
        
        {/* AI Suggestions */}
        {!searchQuery && (
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-lg z-10">
            <div className="p-4">
              <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">Try these AI-powered searches:</p>
              <div className="space-y-2">
                {[
                  "Find all PDF documents from last month",
                  "Show me images with people in them",
                  "Search for code files containing 'authentication'",
                  "Find presentations about machine learning"
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

      {/* Search Controls */}
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
            {isSearching ? 'AI is processing your search...' : 'Ready to search offline'}
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
              <select className="search-input">
                <option>All types</option>
                <option>Documents</option>
                <option>Images</option>
                <option>Videos</option>
                <option>Code</option>
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
        </div>
      )}

      {/* Search Results Area */}
      {searchQuery && (
        <div className="space-y-4">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3 text-primary-600 dark:text-primary-400">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
                <span>AI is analyzing your search...</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-secondary-600 dark:text-secondary-400">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-accent-500" />
              <p>Search results will appear here</p>
              <p className="text-sm mt-2">Grahmos AI will find the most relevant content offline</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}