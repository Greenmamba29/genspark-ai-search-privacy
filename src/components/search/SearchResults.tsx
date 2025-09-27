import { useState, useCallback } from 'react'
import { 
  File as FileIcon, 
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
  Copy,
  Download,
  Maximize2,
  BookOpen,
  Play,
  Monitor,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [previewModes, setPreviewModes] = useState<Record<string, 'content' | 'metadata' | 'preview' | 'fullscreen'>>({})
  const [fullscreenResult, setFullscreenResult] = useState<SearchResult | null>(null)

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
        return <FileIcon {...iconProps} className="w-5 h-5 text-gray-500" />
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
  const setPreviewMode = (resultId: string, mode: 'content' | 'metadata' | 'preview' | 'fullscreen') => {
    setPreviewModes(prev => ({ ...prev, [resultId]: mode }))
  }

  // Generate thumbnail for different file types
  const generateThumbnail = useCallback((result: SearchResult): string => {
    const ext = result.path.split('.').pop()?.toLowerCase() || ''
    
    // For images, try to generate preview URL (in real app, use proper image processing)
    if (result.type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      // In a real application, you'd generate actual thumbnails
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" class="bg-gradient-to-br from-blue-400 to-purple-500">
          <rect width="64" height="64" fill="url(#grad)"/>
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
            </linearGradient>
          </defs>
          <text x="32" y="40" text-anchor="middle" fill="white" font-size="20" font-weight="bold">📷</text>
        </svg>
      `)}`
    }

    // For PDFs, generate document thumbnail
    if (ext === 'pdf') {
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="#ef4444" rx="8"/>
          <text x="32" y="20" text-anchor="middle" fill="white" font-size="8" font-weight="bold">PDF</text>
          <rect x="12" y="25" width="40" height="2" fill="white" opacity="0.8"/>
          <rect x="12" y="30" width="35" height="2" fill="white" opacity="0.6"/>
          <rect x="12" y="35" width="38" height="2" fill="white" opacity="0.6"/>
          <rect x="12" y="40" width="32" height="2" fill="white" opacity="0.4"/>
        </svg>
      `)}`
    }

    // For code files, generate code thumbnail with syntax colors
    if (result.type === 'code') {
      const colors = {
        js: '#f7df1e', ts: '#3178c6', py: '#3776ab', java: '#ed8b00',
        cpp: '#00599c', go: '#00add8', rust: '#000000', php: '#777bb4'
      }
      const color = colors[ext as keyof typeof colors] || '#6b7280'
      
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="${color}" rx="8"/>
          <text x="32" y="15" text-anchor="middle" fill="white" font-size="7" font-weight="bold">${ext.toUpperCase()}</text>
          <text x="8" y="28" fill="white" font-size="6" font-family="monospace">{'{'}</text>
          <text x="12" y="36" fill="white" font-size="5" font-family="monospace">const x = 1;</text>
          <text x="12" y="44" fill="white" font-size="5" font-family="monospace">func() {}</text>
          <text x="8" y="52" fill="white" font-size="6" font-family="monospace">{'}'}</text>
        </svg>
      `)}`
    }

    // Default file thumbnail
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#64748b" rx="8"/>
        <text x="32" y="40" text-anchor="middle" fill="white" font-size="18">📄</text>
      </svg>
    `)}`
  }, [])

  // Enhanced syntax highlighting for code content
  const getSyntaxHighlight = useCallback((content: string, path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    const codeLanguages = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', java: 'java', cpp: 'cpp', c: 'c', h: 'c',
      css: 'css', html: 'html', json: 'json', xml: 'xml',
      md: 'markdown', sql: 'sql', sh: 'bash', yaml: 'yaml', yml: 'yaml',
      go: 'go', rust: 'rust', php: 'php', rb: 'ruby', swift: 'swift',
      kt: 'kotlin', dart: 'dart', scala: 'scala', r: 'r'
    }

    const language = codeLanguages[ext as keyof typeof codeLanguages] || 'text'
    
    // Enhanced syntax highlighting patterns
    let highlighted = content
    
    if (['javascript', 'typescript'].includes(language)) {
      highlighted = highlighted
        // Keywords
        .replace(/(\b(?:function|const|let|var|if|else|for|while|class|import|export|async|await|return|try|catch|finally|throw|new|this|super|extends|implements|interface|type|enum|namespace|public|private|protected|static|readonly)\b)/g, 
          '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>')
        // Strings
        .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, 
          '<span class="text-green-600 dark:text-green-400">$1</span>')
        // Numbers
        .replace(/(\b\d+(?:\.\d+)?\b)/g,
          '<span class="text-blue-600 dark:text-blue-400">$1</span>')
        // Comments
        .replace(/(\/\/.*$)/gm, 
          '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g,
          '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
        // Functions
        .replace(/(\b\w+)(?=\s*\()/g,
          '<span class="text-blue-700 dark:text-blue-300 font-medium">$1</span>')
    } else if (language === 'python') {
      highlighted = highlighted
        .replace(/(\b(?:def|class|if|elif|else|for|while|import|from|as|try|except|finally|with|lambda|return|yield|break|continue|pass|global|nonlocal|and|or|not|in|is|None|True|False)\b)/g,
          '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>')
        .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|'''[\s\S]*?'''|"""[\s\S]*?""")/g,
          '<span class="text-green-600 dark:text-green-400">$1</span>')
        .replace(/(#.*$)/gm,
          '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
        .replace(/(\b\d+(?:\.\d+)?\b)/g,
          '<span class="text-blue-600 dark:text-blue-400">$1</span>')
    } else if (language === 'json') {
      highlighted = highlighted
        .replace(/("[^"]*")(?=\s*:)/g,
          '<span class="text-blue-600 dark:text-blue-400 font-medium">$1</span>')
        .replace(/("[^"]*")(?!\s*:)/g,
          '<span class="text-green-600 dark:text-green-400">$1</span>')
        .replace(/(\b(?:true|false|null)\b)/g,
          '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>')
        .replace(/(\b\d+(?:\.\d+)?\b)/g,
          '<span class="text-orange-600 dark:text-orange-400">$1</span>')
    } else if (language === 'css') {
      highlighted = highlighted
        .replace(/([.#][\w-]+)/g,
          '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>')
        .replace(/([\w-]+)(?=\s*:)/g,
          '<span class="text-blue-600 dark:text-blue-400 font-medium">$1</span>')
        .replace(/("[^"]*"|'[^']*')/g,
          '<span class="text-green-600 dark:text-green-400">$1</span>')
    } else if (language === 'html') {
      highlighted = highlighted
        .replace(/(&lt;\/?[\w\s="'.-]*&gt;)/g,
          '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>')
        .replace(/(\w+)(?==)/g,
          '<span class="text-blue-600 dark:text-blue-400 font-medium">$1</span>')
        .replace(/("[^"]*"|'[^']*')/g,
          '<span class="text-green-600 dark:text-green-400">$1</span>')
    }
    
    return highlighted
  }, [])

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
                  
                  {/* Enhanced Preview Mode Toggle */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-1">
                      {(['content', 'metadata', 'preview'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPreviewMode(result.id, mode)}
                          className={`px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
                            previewMode === mode
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          {mode === 'content' && <><BookOpen className="w-3 h-3 inline mr-1" />Content</>}
                          {mode === 'metadata' && <><Tag className="w-3 h-3 inline mr-1" />Details</>}
                          {mode === 'preview' && <><Monitor className="w-3 h-3 inline mr-1" />Preview</>}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setFullscreenResult(result)}
                      className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="View fullscreen"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
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
                    <div className="space-y-4">
                      {/* Enhanced Visual Preview */}
                      <div className="relative">
                        <div className="aspect-video bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                          {/* Thumbnail Preview */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <img 
                              src={generateThumbnail(result)} 
                              alt={`Preview of ${result.title}`}
                              className="w-20 h-20 object-cover rounded-lg shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                          
                          {/* File Type Indicator */}
                          <div className="absolute top-3 left-3 px-2 py-1 bg-black/20 backdrop-blur-sm rounded text-white text-xs font-medium">
                            {result.type.toUpperCase()}
                          </div>
                          
                          {/* File Size */}
                          <div className="absolute top-3 right-3 px-2 py-1 bg-black/20 backdrop-blur-sm rounded text-white text-xs">
                            {formatFileSize(result.size)}
                          </div>
                          
                          {/* Play Button for Videos */}
                          {result.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <Play className="w-8 h-8 text-white ml-1" />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex justify-center space-x-2 mt-3">
                          <button 
                            onClick={() => setFullscreenResult(result)}
                            className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Full View</span>
                          </button>
                          <button 
                            onClick={() => console.log('Opening file:', result.path)}
                            className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </button>
                          {result.type === 'image' && (
                            <button className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1">
                              <Download className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Preview Info */}
                      <div className="text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {result.type === 'code' ? `${result.path.split('.').pop()?.toUpperCase()} source file ready for syntax-highlighted viewing` :
                           result.type === 'document' ? 'Document ready for rich text preview with formatting' :
                           result.type === 'image' ? 'High-resolution image with metadata and EXIF data' :
                           result.type === 'video' ? 'Video file with thumbnail preview and metadata' :
                           'File ready for preview with enhanced details'}
                        </p>
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
                          
                          {/* Enhanced Preview Mode Toggle */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-1">
                              {(['content', 'metadata', 'preview'] as const).map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => setPreviewMode(result.id, mode)}
                                  className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${
                                    previewMode === mode
                                      ? 'bg-blue-500 text-white shadow-sm'
                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                                  }`}
                                >
                                  {mode === 'content' && <><BookOpen className="w-3 h-3 inline mr-1" />Content</>}
                                  {mode === 'metadata' && <><Tag className="w-3 h-3 inline mr-1" />Details</>}
                                  {mode === 'preview' && <><Monitor className="w-3 h-3 inline mr-1" />Preview</>}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setFullscreenResult(result)}
                              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="View fullscreen"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
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
                            <div className="space-y-4">
                              {/* Enhanced Visual Preview */}
                              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-50 via-slate-25 to-white dark:from-slate-800 dark:via-slate-750 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                                <div className="relative">
                                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
                                    <img 
                                      src={generateThumbnail(result)} 
                                      alt={`Preview of ${result.title}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  {/* File Type Badge */}
                                  <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium">
                                    {result.path.split('.').pop()?.toUpperCase()}
                                  </div>
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <h5 className="font-medium text-slate-900 dark:text-white text-sm mb-1">
                                        Enhanced Preview
                                      </h5>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">
                                        {result.type === 'code' ? `${result.path.split('.').pop()?.toUpperCase()} source with syntax highlighting` :
                                         result.type === 'document' ? 'Rich document preview with formatting' :
                                         result.type === 'image' ? 'High-resolution image with EXIF data' :
                                         result.type === 'video' ? 'Video with thumbnail and metadata' :
                                         'Enhanced preview with file analysis'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(result.size)}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(result.lastModified)}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <button 
                                      onClick={() => setFullscreenResult(result)}
                                      className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Full View</span>
                                    </button>
                                    <button 
                                      onClick={() => console.log('Opening file:', result.path)}
                                      className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center space-x-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Open</span>
                                    </button>
                                    {result.type === 'image' && (
                                      <button className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center space-x-1">
                                        <Download className="w-3 h-3" />
                                        <span>Save</span>
                                      </button>
                                    )}
                                  </div>
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
      
      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {fullscreenResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setFullscreenResult(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getFileIcon(fullscreenResult.type, fullscreenResult.path)}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-lg"
                        dangerouslySetInnerHTML={{ __html: highlightText(fullscreenResult.title, query) }}
                    />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                      {fullscreenResult.path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                    {Math.round(fullscreenResult.relevanceScore * 100)}% match
                  </div>
                  <button
                    onClick={() => setFullscreenResult(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-hidden flex">
                {/* Main Preview Area */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {fullscreenResult.type === 'image' ? (
                    <div className="space-y-4">
                      <div className="aspect-video bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                        <img 
                          src={generateThumbnail(fullscreenResult)} 
                          alt={fullscreenResult.title}
                          className="max-w-full max-h-full object-contain rounded-lg"
                        />
                      </div>
                      <p className="text-center text-slate-600 dark:text-slate-400 text-sm">
                        High-resolution preview would be displayed here in a production environment
                      </p>
                    </div>
                  ) : fullscreenResult.type === 'code' ? (
                    <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-6 font-mono text-sm overflow-x-auto">
                      <div 
                        className="text-slate-100 leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: getSyntaxHighlight(fullscreenResult.content, fullscreenResult.path)
                        }}
                      />
                    </div>
                  ) : fullscreenResult.type === 'document' ? (
                    <div className="space-y-4">
                      <div className="aspect-[3/4] bg-white dark:bg-slate-100 rounded-xl p-8 border border-slate-200 overflow-y-auto">
                        <div 
                          className="text-slate-900 leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightText(fullscreenResult.content, query)
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-2xl flex items-center justify-center">
                          {getFileIcon(fullscreenResult.type, fullscreenResult.path)}
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                            {fullscreenResult.type.charAt(0).toUpperCase() + fullscreenResult.type.slice(1)} File
                          </h4>
                          <p className="text-slate-600 dark:text-slate-400">
                            Preview not available for this file type
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Sidebar with Metadata */}
                <div className="w-80 border-l border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-4">File Information</h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Size</span>
                        <span className="text-slate-900 dark:text-white font-medium">{formatFileSize(fullscreenResult.size)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Type</span>
                        <span className="text-slate-900 dark:text-white font-medium capitalize">{fullscreenResult.type}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">Modified</span>
                        <span className="text-slate-900 dark:text-white font-medium">{formatDate(fullscreenResult.lastModified)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block mb-2">Path</span>
                      <p className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 p-2 rounded break-all">
                        {fullscreenResult.path}
                      </p>
                    </div>
                    
                    {fullscreenResult.content && (
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block mb-2">Preview</span>
                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 p-3 rounded-lg max-h-40 overflow-y-auto">
                          {fullscreenResult.content.substring(0, 500)}
                          {fullscreenResult.content.length > 500 && '...'}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="mt-6 space-y-2">
                    <button 
                      onClick={() => navigator.clipboard.writeText(fullscreenResult.path)}
                      className="w-full px-4 py-2 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Path</span>
                    </button>
                    <button 
                      onClick={() => console.log('Opening file:', fullscreenResult.path)}
                      className="w-full px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open File</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
