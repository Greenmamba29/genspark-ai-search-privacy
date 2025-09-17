import { useState } from 'react'
import { 
  File, 
  FileText, 
  Image, 
  Video, 
  Code, 
  Calendar, 
  HardDrive,
  ExternalLink,
  Sparkles
} from 'lucide-react'
import type { SearchResult } from '../../types/index'

interface SearchResultsProps {
  results: SearchResult[]
  totalResults: number
  processingTime: number
  model: string
  query: string
  isSearching: boolean
  viewMode: 'grid' | 'list'
  isBackendConnected: boolean
}

export default function SearchResults({
  results,
  totalResults,
  processingTime,
  model,
  query,
  isSearching,
  viewMode,
  isBackendConnected
}: SearchResultsProps) {
  const [selectedResult, setSelectedResult] = useState<string | null>(null)

  const getFileIcon = (type: SearchResult['type']) => {
    const iconProps = { className: "w-5 h-5" }
    
    switch (type) {
      case 'document':
        return <FileText {...iconProps} className="w-5 h-5 text-blue-500" />
      case 'image':
        return <Image {...iconProps} className="w-5 h-5 text-green-500" />
      case 'video':
        return <Video {...iconProps} className="w-5 h-5 text-purple-500" />
      case 'code':
        return <Code {...iconProps} className="w-5 h-5 text-orange-500" />
      default:
        return <File {...iconProps} className="w-5 h-5 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  const highlightText = (text: string, query: string): string => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.trim()})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>')
  }

  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3 text-primary-600 dark:text-primary-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
          <div className="text-center">
            <p className="text-lg font-medium">AI is analyzing your search...</p>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
              Using {model.split('/').pop()} • {isBackendConnected ? 'Local AI' : 'Mock Mode'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!results.length && query) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-secondary-400" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
          No results found
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400 mb-4">
          Try adjusting your search query or filters
        </p>
        <div className="text-sm text-secondary-500 dark:text-secondary-500">
          Searched with {model.split('/').pop()} in {processingTime}ms • {isBackendConnected ? 'Local AI' : 'Mock Mode'}
        </div>
      </div>
    )
  }

  if (!results.length) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-accent-500" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
          Ready to search
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400">
          Grahmos AI will find the most relevant content offline using {model.split('/').pop()}
        </p>
        <div className="text-sm text-secondary-500 dark:text-secondary-500 mt-2">
          {isBackendConnected ? '🟢 Connected to local AI backend' : '🟡 Running in demonstration mode'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-secondary-600 dark:text-secondary-400">
          <span className="font-medium text-secondary-900 dark:text-secondary-100">
            {totalResults} results
          </span>{' '}
          found in {processingTime}ms using {model.split('/').pop()}
          <span className="ml-2">
            {isBackendConnected ? '🟢 Local AI' : '🟡 Demo Mode'}
          </span>
        </div>
      </div>

      {/* Results Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((result) => (
            <div
              key={result.id}
              className={`card p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                selectedResult === result.id 
                  ? 'ring-2 ring-primary-500 shadow-lg' 
                  : ''
              }`}
              onClick={() => setSelectedResult(selectedResult === result.id ? null : result.id)}
            >
              {/* File Icon and Type */}
              <div className="flex items-center space-x-3 mb-4">
                {getFileIcon(result.type)}
                <div className="flex-1 min-w-0">
                  <h3 
                    className="font-medium text-secondary-900 dark:text-secondary-100 truncate"
                    dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }}
                  />
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate">
                    {result.path}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                    {Math.round(result.relevanceScore * 100)}%
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              <p 
                className="text-sm text-secondary-600 dark:text-secondary-400 mb-4 line-clamp-3"
                dangerouslySetInnerHTML={{ __html: highlightText(result.content, query) }}
              />

              {/* File Metadata */}
              <div className="flex items-center justify-between text-xs text-secondary-500 dark:text-secondary-400">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(result.lastModified)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <HardDrive className="w-3 h-3" />
                    <span>{formatFileSize(result.size)}</span>
                  </div>
                </div>
                <button
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center space-x-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle file opening
                    console.log('Opening file:', result.path)
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <div
              key={result.id}
              className={`card p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedResult === result.id 
                  ? 'ring-2 ring-primary-500 shadow-lg' 
                  : ''
              }`}
              onClick={() => setSelectedResult(selectedResult === result.id ? null : result.id)}
            >
              <div className="flex items-start space-x-4">
                {/* File Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getFileIcon(result.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 
                        className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2"
                        dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }}
                      />
                      <p 
                        className="text-secondary-600 dark:text-secondary-400 mb-3"
                        dangerouslySetInnerHTML={{ __html: highlightText(result.content, query) }}
                      />
                      
                      {/* Metadata */}
                      <div className="flex items-center space-x-6 text-sm text-secondary-500 dark:text-secondary-400">
                        <div className="flex items-center space-x-1">
                          <span className="text-secondary-400">Path:</span>
                          <span className="font-mono text-xs">{result.path}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(result.lastModified)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <HardDrive className="w-4 h-4" />
                          <span>{formatFileSize(result.size)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Relevance Score and Actions */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-2">
                        {Math.round(result.relevanceScore * 100)}%
                      </div>
                      <button
                        className="btn-secondary btn-sm flex items-center space-x-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle file opening
                          console.log('Opening file:', result.path)
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}