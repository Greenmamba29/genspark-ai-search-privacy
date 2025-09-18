import { useState } from 'react'
import { ExternalLink, Calendar, HardDrive, Zap, Star, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SearchResult } from '../../types/index'

interface GoogleStyleSearchResultsProps {
  results: SearchResult[]
  totalResults: number
  processingTime: number
  model: string
  query: string
  isSearching: boolean
  isBackendConnected: boolean
}

export default function GoogleStyleSearchResults({
  results,
  totalResults,
  processingTime,
  model,
  query,
  isSearching,
  isBackendConnected
}: GoogleStyleSearchResultsProps) {
  const [hoveredResult, setHoveredResult] = useState<string | null>(null)

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
    return text.replace(regex, '<strong class="text-blue-600 dark:text-blue-400">$1</strong>')
  }

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'text-blue-600 dark:text-blue-400'
      case 'code': return 'text-green-600 dark:text-green-400' 
      case 'image': return 'text-purple-600 dark:text-purple-400'
      case 'video': return 'text-red-600 dark:text-red-400'
      case 'data': return 'text-orange-600 dark:text-orange-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (isSearching) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Searching with {model.split('/').pop()} • {isBackendConnected ? 'Local AI' : 'Demo Mode'}
          </span>
        </div>
      </div>
    )
  }

  if (!results.length && query) {
    return (
      <div className="max-w-2xl">
        <div className="py-8 text-gray-600 dark:text-gray-400">
          <p className="text-sm mb-2">No results found for <strong>"{query}"</strong></p>
          <p className="text-xs">Try different keywords or check your spelling</p>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
            Search completed in {processingTime}ms using {model.split('/').pop()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Search Stats */}
      <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          About {totalResults.toLocaleString()} results ({(processingTime / 1000).toFixed(2)} seconds)
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
          <Zap className="w-3 h-3" />
          <span>{model.split('/').pop()}</span>
          <span>•</span>
          <span>{isBackendConnected ? 'Local AI' : 'Demo'}</span>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6 py-4">
        <AnimatePresence>
          {results.map((result, index) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredResult(result.id)}
              onMouseLeave={() => setHoveredResult(null)}
              onClick={() => window.open(result.path, '_blank')}
            >
              {/* URL and Path */}
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                  {result.path.replace(/^\//, '')}
                </span>
                <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Title */}
              <h3 
                className="text-xl text-blue-600 dark:text-blue-400 hover:underline cursor-pointer leading-6 mb-1"
                dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }}
              />

              {/* Content Preview */}
              <p 
                className="text-sm text-gray-700 dark:text-gray-300 leading-5 mb-2"
                dangerouslySetInnerHTML={{ 
                  __html: highlightText(
                    result.content.length > 160 
                      ? result.content.substring(0, 160) + '...' 
                      : result.content, 
                    query
                  ) 
                }}
              />

              {/* Meta Information */}
              <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <span className={`font-medium ${getFileTypeColor(result.type)}`}>
                    {result.type.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <HardDrive className="w-3 h-3" />
                  <span>{formatFileSize(result.size)}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(new Date(result.lastModified))}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span>{(result.relevanceScore * 100).toFixed(0)}% match</span>
                </div>

                {hoveredResult === result.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center space-x-2 ml-auto"
                  >
                    <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <Eye className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Relevance Bar */}
              <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.relevanceScore * 100}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}