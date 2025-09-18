import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  HardDrive,
  Tag,
  FileText,
  Code,
  Database,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  RotateCcw,
  Search,
  BookOpen,
  Zap
} from 'lucide-react'

export interface FilterState {
  fileTypes: string[]
  dateRange: {
    start: Date | null
    end: Date | null
    preset: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
  }
  sizeRange: {
    min: number // in bytes
    max: number // in bytes
    preset: 'all' | 'small' | 'medium' | 'large' | 'custom'
  }
  tags: string[]
  contentTypes: string[]
  sortBy: 'relevance' | 'date' | 'size' | 'name' | 'type'
  sortOrder: 'asc' | 'desc'
  searchIn: {
    filename: boolean
    content: boolean
    metadata: boolean
    tags: boolean
  }
}

interface AdvancedFilterPanelProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  isOpen: boolean
  onToggle: () => void
  resultStats?: {
    totalResults: number
    fileTypeCounts: Record<string, number>
    tagCounts: Record<string, number>
    sizeDistribution: { min: number; max: number; avg: number }
  }
  className?: string
}

const FILE_TYPE_CATEGORIES = [
  { 
    id: 'document', 
    label: 'Documents', 
    icon: FileText, 
    color: 'text-blue-500',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt']
  },
  { 
    id: 'code', 
    label: 'Code', 
    icon: Code, 
    color: 'text-purple-500',
    extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'php', 'rb', 'go', 'rs']
  },
  { 
    id: 'data', 
    label: 'Data', 
    icon: Database, 
    color: 'text-green-500',
    extensions: ['json', 'xml', 'csv', 'xlsx', 'xls', 'sql', 'yaml', 'yml']
  },
  { 
    id: 'image', 
    label: 'Images', 
    icon: ImageIcon, 
    color: 'text-pink-500',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico']
  },
  { 
    id: 'video', 
    label: 'Videos', 
    icon: Video, 
    color: 'text-red-500',
    extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']
  },
  { 
    id: 'audio', 
    label: 'Audio', 
    icon: Music, 
    color: 'text-orange-500',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma']
  },
  { 
    id: 'archive', 
    label: 'Archives', 
    icon: Archive, 
    color: 'text-gray-500',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
  }
]

const DATE_PRESETS = [
  { id: 'all', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Past week' },
  { id: 'month', label: 'Past month' },
  { id: 'year', label: 'Past year' },
  { id: 'custom', label: 'Custom range' }
]

const SIZE_PRESETS = [
  { id: 'all', label: 'Any size' },
  { id: 'small', label: 'Small (< 1MB)', min: 0, max: 1024 * 1024 },
  { id: 'medium', label: 'Medium (1-10MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { id: 'large', label: 'Large (> 10MB)', min: 10 * 1024 * 1024, max: Infinity }
]

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance', icon: Zap },
  { id: 'date', label: 'Date modified', icon: Calendar },
  { id: 'size', label: 'File size', icon: HardDrive },
  { id: 'name', label: 'Name', icon: BookOpen },
  { id: 'type', label: 'Type', icon: Tag }
]

export default function AdvancedFilterPanel({
  filters,
  onFiltersChange,
  isOpen,
  onToggle,
  resultStats,
  className = ''
}: AdvancedFilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['fileTypes', 'dateRange', 'sizeRange'])
  )

  // Helper functions
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }, [])

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }, [filters, onFiltersChange])

  const resetFilters = useCallback(() => {
    const defaultFilters: FilterState = {
      fileTypes: [],
      dateRange: { start: null, end: null, preset: 'all' },
      sizeRange: { min: 0, max: Infinity, preset: 'all' },
      tags: [],
      contentTypes: [],
      sortBy: 'relevance',
      sortOrder: 'desc',
      searchIn: {
        filename: true,
        content: true,
        metadata: true,
        tags: true
      }
    }
    onFiltersChange(defaultFilters)
  }, [onFiltersChange])

  // Format file size (currently unused but kept for future use)
  // const formatFileSize = useCallback((bytes: number): string => {
  //   if (bytes === 0) return '0 B'
  //   if (bytes === Infinity) return '∞'
  //   
  //   const k = 1024
  //   const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  //   const i = Math.floor(Math.log(bytes) / Math.log(k))
  //   return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  // }, [])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.fileTypes.length > 0) count++
    if (filters.dateRange.preset !== 'all') count++
    if (filters.sizeRange.preset !== 'all') count++
    if (filters.tags.length > 0) count++
    if (filters.contentTypes.length > 0) count++
    if (filters.sortBy !== 'relevance') count++
    if (!filters.searchIn.filename || !filters.searchIn.content || 
        !filters.searchIn.metadata || !filters.searchIn.tags) count++
    return count
  }, [filters])

  return (
    <div className={className}>
      {/* Filter Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onToggle}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
          isOpen
            ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-600'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span className="font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
            isOpen ? 'bg-white/20' : 'bg-blue-500 text-white'
          }`}>
            {activeFilterCount}
          </span>
        )}
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </motion.button>

      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-2 w-96 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Advanced Filters</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {resultStats?.totalResults || 0} results
                    {activeFilterCount > 0 && ` • ${activeFilterCount} filters active`}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={resetFilters}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onToggle}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Content */}
            <div className="max-h-96 overflow-y-auto">
              {/* File Types */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => toggleSection('fileTypes')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-medium text-slate-900 dark:text-white">File Types</span>
                  {expandedSections.has('fileTypes') ? 
                    <ChevronUp className="w-4 h-4 text-slate-500" /> : 
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  }
                </button>
                
                <AnimatePresence>
                  {expandedSections.has('fileTypes') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {FILE_TYPE_CATEGORIES.map((category) => {
                        const Icon = category.icon
                        const isSelected = filters.fileTypes.includes(category.id)
                        const count = resultStats?.fileTypeCounts[category.id] || 0
                        
                        return (
                          <motion.button
                            key={category.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              const newTypes = isSelected
                                ? filters.fileTypes.filter(t => t !== category.id)
                                : [...filters.fileTypes, category.id]
                              updateFilters({ fileTypes: newTypes })
                            }}
                            className={`flex items-center justify-between w-full p-2 rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className={`w-4 h-4 ${category.color}`} />
                              <span className={`text-sm ${
                                isSelected ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {category.label}
                              </span>
                            </div>
                            {count > 0 && (
                              <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded-full">
                                {count}
                              </span>
                            )}
                          </motion.button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Date Range */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => toggleSection('dateRange')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-medium text-slate-900 dark:text-white">Date Modified</span>
                  {expandedSections.has('dateRange') ? 
                    <ChevronUp className="w-4 h-4 text-slate-500" /> : 
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  }
                </button>
                
                <AnimatePresence>
                  {expandedSections.has('dateRange') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {DATE_PRESETS.map((preset) => {
                        const isSelected = filters.dateRange.preset === preset.id
                        
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              let start = null, end = null
                              const now = new Date()
                              
                              switch (preset.id) {
                                case 'today':
                                  start = new Date(now.setHours(0, 0, 0, 0))
                                  end = new Date(now.setHours(23, 59, 59, 999))
                                  break
                                case 'week':
                                  start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                                  end = new Date()
                                  break
                                case 'month':
                                  start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                                  end = new Date()
                                  break
                                case 'year':
                                  start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
                                  end = new Date()
                                  break
                              }
                              
                              updateFilters({
                                dateRange: { start, end, preset: preset.id as any }
                              })
                            }}
                            className={`flex items-center justify-between w-full p-2 rounded-lg text-sm transition-colors ${
                              isSelected
                                ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-3 h-3" />
                              <span>{preset.label}</span>
                            </div>
                          </button>
                        )
                      })}
                      
                      {/* Custom Date Range */}
                      {filters.dateRange.preset === 'custom' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg space-y-2"
                        >
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">From</label>
                            <input
                              type="date"
                              value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                              onChange={(e) => {
                                const start = e.target.value ? new Date(e.target.value) : null
                                updateFilters({
                                  dateRange: { ...filters.dateRange, start }
                                })
                              }}
                              className="w-full p-2 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">To</label>
                            <input
                              type="date"
                              value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                              onChange={(e) => {
                                const end = e.target.value ? new Date(e.target.value) : null
                                updateFilters({
                                  dateRange: { ...filters.dateRange, end }
                                })
                              }}
                              className="w-full p-2 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                            />
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* File Size */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => toggleSection('sizeRange')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-medium text-slate-900 dark:text-white">File Size</span>
                  {expandedSections.has('sizeRange') ? 
                    <ChevronUp className="w-4 h-4 text-slate-500" /> : 
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  }
                </button>
                
                <AnimatePresence>
                  {expandedSections.has('sizeRange') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {SIZE_PRESETS.map((preset) => {
                        const isSelected = filters.sizeRange.preset === preset.id
                        
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              updateFilters({
                                sizeRange: {
                                  min: preset.min || 0,
                                  max: preset.max || Infinity,
                                  preset: preset.id as any
                                }
                              })
                            }}
                            className={`flex items-center justify-between w-full p-2 rounded-lg text-sm transition-colors ${
                              isSelected
                                ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <HardDrive className="w-3 h-3" />
                              <span>{preset.label}</span>
                            </div>
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sort Options */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => toggleSection('sorting')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-medium text-slate-900 dark:text-white">Sort By</span>
                  {expandedSections.has('sorting') ? 
                    <ChevronUp className="w-4 h-4 text-slate-500" /> : 
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  }
                </button>
                
                <AnimatePresence>
                  {expandedSections.has('sorting') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {SORT_OPTIONS.map((option) => {
                        const Icon = option.icon
                        const isSelected = filters.sortBy === option.id
                        
                        return (
                          <button
                            key={option.id}
                            onClick={() => updateFilters({ sortBy: option.id as any })}
                            className={`flex items-center justify-between w-full p-2 rounded-lg text-sm transition-colors ${
                              isSelected
                                ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className="w-3 h-3" />
                              <span>{option.label}</span>
                            </div>
                          </button>
                        )
                      })}
                      
                      {/* Sort Order Toggle */}
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 dark:border-slate-600">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Order</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => updateFilters({ sortOrder: 'desc' })}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              filters.sortOrder === 'desc'
                                ? 'bg-blue-500 text-white'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                          >
                            Desc
                          </button>
                          <button
                            onClick={() => updateFilters({ sortOrder: 'asc' })}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              filters.sortOrder === 'asc'
                                ? 'bg-blue-500 text-white'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                          >
                            Asc
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search In */}
              <div className="p-4">
                <button
                  onClick={() => toggleSection('searchIn')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-medium text-slate-900 dark:text-white">Search In</span>
                  {expandedSections.has('searchIn') ? 
                    <ChevronUp className="w-4 h-4 text-slate-500" /> : 
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  }
                </button>
                
                <AnimatePresence>
                  {expandedSections.has('searchIn') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {[
                        { key: 'filename', label: 'File names', icon: FileText },
                        { key: 'content', label: 'File content', icon: Search },
                        { key: 'metadata', label: 'Metadata', icon: Database },
                        { key: 'tags', label: 'Tags', icon: Tag }
                      ].map(({ key, label, icon: Icon }) => (
                        <label key={key} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={filters.searchIn[key as keyof typeof filters.searchIn]}
                            onChange={(e) => updateFilters({
                              searchIn: { ...filters.searchIn, [key]: e.target.checked }
                            })}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                          />
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                        </label>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}