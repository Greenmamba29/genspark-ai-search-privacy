import { useState } from 'react'
import { 
  File, 
  FileText, 
  Video, 
  Code, 
  Calendar, 
  HardDrive,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  FileImage,
  Database,
  Archive,
  Music,
  Hash,
  Tag,
  Clock,
  Zap,
  Copy,
  Download
} from 'lucide-react'
import { motion } from 'framer-motion'
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
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())
  const [previewModes, setPreviewModes] = useState<Record<string, 'content' | 'metadata' | 'preview'>>({})

  const getFileIcon = (type: SearchResult['type'], path?: string) => {
    const iconProps = { className: "w-5 h-5" }
    
    // Enhanced file type detection based on extension
    const ext = path?.split('.').pop()?.toLowerCase() || ''
    
    switch (type) {
      case 'document':
        if (['pdf'].includes(ext)) return <FileText {...iconProps} className="w-5 h-5 text-red-500" />
        if (['docx', 'doc'].includes(ext)) return <FileText {...iconProps} className="w-5 h-5 text-blue-600" />
        if (['md', 'markdown'].includes(ext)) return <Hash {...iconProps} className="w-5 h-5 text-slate-600" />
        return <FileText {...iconProps} className="w-5 h-5 text-blue-500" />
      case 'image':
        return <FileImage {...iconProps} className="w-5 h-5 text-green-500" />
      case 'video':
        return <Video {...iconProps} className="w-5 h-5 text-purple-500" />
      case 'code':
        if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return <Code {...iconProps} className="w-5 h-5 text-yellow-500" />
        if (['py', 'python'].includes(ext)) return <Code {...iconProps} className="w-5 h-5 text-green-600" />
        if (['java', 'class'].includes(ext)) return <Code {...iconProps} className="w-5 h-5 text-red-600" />
        if (['cpp', 'c', 'h'].includes(ext)) return <Code {...iconProps} className="w-5 h-5 text-blue-600" />
        return <Code {...iconProps} className="w-5 h-5 text-orange-500" />
      case 'data':
        if (['json', 'xml'].includes(ext)) return <Database {...iconProps} className="w-5 h-5 text-purple-600" />
        if (['csv', 'xlsx'].includes(ext)) return <Database {...iconProps} className="w-5 h-5 text-green-600" />
        return <Database {...iconProps} className="w-5 h-5 text-indigo-500" />
      default:
        if (['zip', 'tar', 'gz'].includes(ext)) return <Archive {...iconProps} className="w-5 h-5 text-orange-600" />
        if (['mp3', 'wav', 'flac'].includes(ext)) return <Music {...iconProps} className="w-5 h-5 text-pink-500" />
        return <File {...iconProps} className="w-5 h-5 text-gray-500" />
    }
  }

  // Toggle result expansion
  const toggleExpanded = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(resultId)) {
        newSet.delete(resultId)
      } else {
        newSet.add(resultId)
      }
      return newSet
    })
  }

  // Set preview mode for a result
  const setPreviewMode = (resultId: string, mode: 'content' | 'metadata' | 'preview') => {
    setPreviewModes(prev => ({ ...prev, [resultId]: mode }))
  }

  // Get syntax highlighting for code content
  const getSyntaxHighlight = (content: string, path: string) => {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    const codeLanguages = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', java: 'java', cpp: 'cpp', c: 'c', h: 'c',
      css: 'css', html: 'html', json: 'json', xml: 'xml',
      md: 'markdown', sql: 'sql', sh: 'bash', yaml: 'yaml', yml: 'yaml'
    }

    const language = codeLanguages[ext as keyof typeof codeLanguages] || 'text'
    
    // Simple syntax highlighting simulation (in real app, use proper syntax highlighter)
    if (language === 'javascript' || language === 'typescript') {
      return content
        .replace(/(function|const|let|var|if|else|for|while|class|import|export)/g, 
          '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>')
        .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, 
          '<span class="text-green-600 dark:text-green-400">$1</span>')
        .replace(/(\/\/.*$)/gm, 
          '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
    }
    
    return content
  }

  // Generate content preview based on file type
  const getContentPreview = (result: SearchResult) => {
    const isCode = result.type === 'code'
    const maxLength = isCode ? 300 : 200
    
    let preview = result.content
    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength) + '...'
    }
    
    if (isCode) {
      return getSyntaxHighlight(preview, result.path)
    }
    
    return highlightText(preview, query)
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
          {results.map((result) => {
            const isExpanded = expandedResults.has(result.id)
            const previewMode = previewModes[result.id] || 'content'
            
            return (
              <motion.div
                key={result.id}
                layout
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600"
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-start space-x-3">
                    {getFileIcon(result.type, result.path)}
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-medium text-slate-900 dark:text-white text-sm leading-tight mb-1"
                        dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                        {result.path.split('/').pop()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                        {Math.round(result.relevanceScore * 100)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Preview Mode Toggle */}
                  <div className="flex items-center space-x-1 mt-3">
                    {(['content', 'metadata', 'preview'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setPreviewMode(result.id, mode)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          previewMode === mode
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {mode === 'content' && <><Eye className="w-3 h-3 inline mr-1" />Content</>}
                        {mode === 'metadata' && <><Tag className="w-3 h-3 inline mr-1" />Meta</>}
                        {mode === 'preview' && <><Zap className="w-3 h-3 inline mr-1" />Quick</>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-4">
                  {previewMode === 'content' && (
                    <div className={`transition-all ${
                      result.type === 'code' ? 'font-mono text-xs' : 'text-sm'
                    }`}>
                      <div 
                        className={`text-slate-600 dark:text-slate-400 leading-relaxed ${
                          isExpanded ? '' : 'line-clamp-3'
                        }`}
                        dangerouslySetInnerHTML={{ 
                          __html: isExpanded 
                            ? (result.type === 'code' ? getSyntaxHighlight(result.content, result.path) : highlightText(result.content, query))
                            : getContentPreview(result)
                        }}
                      />
                      
                      {result.content.length > 200 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpanded(result.id)
                          }}
                          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{isExpanded ? 'Show less' : 'Show more'}</span>
                        </button>
                      )}
                    </div>
                  )}
                  
                  {previewMode === 'metadata' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Size:</span>
                          <span className="ml-1 text-slate-700 dark:text-slate-300 font-medium">
                            {formatFileSize(result.size)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Type:</span>
                          <span className="ml-1 text-slate-700 dark:text-slate-300 font-medium capitalize">
                            {result.type}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 dark:text-slate-400">Modified:</span>
                          <span className="ml-1 text-slate-700 dark:text-slate-300 font-medium">
                            {formatDate(result.lastModified)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 dark:text-slate-400">Path:</span>
                          <p className="mt-1 text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                            {result.path}
                          </p>
                        </div>
                      </div>
                      
                      {/* Metadata from result if available */}
                      {(result as any).metadata && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                          <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Additional Info</h4>
                          <div className="text-xs space-y-1">
                            {Object.entries((result as any).metadata).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  {typeof value === 'object' ? JSON.stringify(value).substring(0, 30) + '...' : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {previewMode === 'preview' && (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg flex items-center justify-center">
                        {getFileIcon(result.type, result.path)}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {result.type === 'code' ? 'Code file ready for viewing' : 'Document ready for preview'}
                      </p>
                      <div className="flex justify-center space-x-2">
                        <button className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>Quick View</span>
                        </button>
                        <button className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1">
                          <ExternalLink className="w-3 h-3" />
                          <span>Open</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Footer Actions */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(result.lastModified)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(result.path)
                        }}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                        title="Copy path"
                      >
                        <Copy className="w-3 h-3 text-slate-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          console.log('Opening file:', result.path)
                        }}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => {
            const isExpanded = expandedResults.has(result.id)
            const previewMode = previewModes[result.id] || 'content'
            
            return (
              <motion.div
                key={result.id}
                layout
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600"
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* File Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getFileIcon(result.type, result.path)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 
                            className="text-lg font-medium text-slate-900 dark:text-white mb-2 leading-tight"
                            dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }}
                          />
                          
                          {/* Preview Mode Toggle */}
                          <div className="flex items-center space-x-1 mb-3">
                            {(['content', 'metadata', 'preview'] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setPreviewMode(result.id, mode)}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  previewMode === mode
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                {mode === 'content' && <><Eye className="w-3 h-3 inline mr-1" />Content</>}
                                {mode === 'metadata' && <><Tag className="w-3 h-3 inline mr-1" />Metadata</>}
                                {mode === 'preview' && <><Zap className="w-3 h-3 inline mr-1" />Preview</>}
                              </button>
                            ))}
                          </div>
                          
                          {/* Content based on preview mode */}
                          {previewMode === 'content' && (
                            <div className={result.type === 'code' ? 'font-mono text-sm' : ''}>
                              <div 
                                className={`text-slate-600 dark:text-slate-400 leading-relaxed ${
                                  isExpanded ? '' : 'line-clamp-4'
                                }`}
                                dangerouslySetInnerHTML={{ 
                                  __html: isExpanded 
                                    ? (result.type === 'code' ? getSyntaxHighlight(result.content, result.path) : highlightText(result.content, query))
                                    : getContentPreview(result)
                                }}
                              />
                              
                              {result.content.length > 300 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpanded(result.id)
                                  }}
                                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  <span>{isExpanded ? 'Show less' : 'Show more content'}</span>
                                </button>
                              )}
                            </div>
                          )}
                          
                          {previewMode === 'metadata' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-sm">
                                  <HardDrive className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-500 dark:text-slate-400">Size:</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-medium">{formatFileSize(result.size)}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-500 dark:text-slate-400">Modified:</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(result.lastModified)}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <Tag className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-500 dark:text-slate-400">Type:</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">{result.type}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-sm mb-2">
                                  <span className="text-slate-500 dark:text-slate-400">Path:</span>
                                </div>
                                <p className="text-sm font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2 rounded break-all">
                                  {result.path}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {previewMode === 'preview' && (
                            <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                              <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                {getFileIcon(result.type, result.path)}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                  {result.type === 'code' ? 'Code file ready for syntax-highlighted viewing' : 
                                   result.type === 'document' ? 'Document ready for quick preview' :
                                   'File ready for preview'}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <button className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1">
                                    <Eye className="w-3 h-3" />
                                    <span>Quick View</span>
                                  </button>
                                  <button className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center space-x-1">
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Relevance Score and Actions */}
                        <div className="flex-shrink-0 text-right ml-4">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                            {Math.round(result.relevanceScore * 100)}%
                          </div>
                          <div className="flex flex-col space-y-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(result.path)
                              }}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" 
                              title="Copy path"
                            >
                              <Copy className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Opening file:', result.path)
                              }}
                              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors flex items-center space-x-1"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Open</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}