import { useState, useCallback, useEffect, useMemo } from 'react'
import { FilterState } from '../components/filters/AdvancedFilterPanel'

const DEFAULT_FILTERS: FilterState = {
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

interface UseAdvancedFiltersOptions {
  persistToLocalStorage?: boolean
  syncWithURL?: boolean
  onFiltersChange?: (filters: FilterState) => void
}

interface FilterAnalytics {
  activeFilters: number
  mostUsedFilters: Array<{ type: string; usage: number }>
  filterHistory: Array<{ timestamp: number; filters: FilterState }>
  quickFilters: Array<{ label: string; filters: Partial<FilterState> }>
}

export function useAdvancedFilters(options: UseAdvancedFiltersOptions = {}) {
  const {
    persistToLocalStorage = true,
    syncWithURL = true,
    onFiltersChange
  } = options

  const [filters, setFilters] = useState<FilterState>(() => {
    // Try to load from localStorage first
    if (persistToLocalStorage) {
      try {
        const saved = localStorage.getItem('genspark-advanced-filters')
        if (saved) {
          const parsed = JSON.parse(saved)
          return { ...DEFAULT_FILTERS, ...parsed }
        }
      } catch (error) {
        console.warn('Failed to load filters from localStorage:', error)
      }
    }

    // Try to load from URL parameters
    if (syncWithURL) {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const urlFilters = parseFiltersFromURL(urlParams)
        if (Object.keys(urlFilters).length > 0) {
          return { ...DEFAULT_FILTERS, ...urlFilters }
        }
      } catch (error) {
        console.warn('Failed to load filters from URL:', error)
      }
    }

    return DEFAULT_FILTERS
  })

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [filterAnalytics, setFilterAnalytics] = useState<FilterAnalytics>({
    activeFilters: 0,
    mostUsedFilters: [],
    filterHistory: [],
    quickFilters: [
      { label: 'Recent Documents', filters: { fileTypes: ['document'], dateRange: { start: null, end: null, preset: 'week' } } },
      { label: 'Code Files', filters: { fileTypes: ['code'] } },
      { label: 'Large Files', filters: { sizeRange: { min: 10 * 1024 * 1024, max: Infinity, preset: 'large' } } },
      { label: 'Images & Videos', filters: { fileTypes: ['image', 'video'] } }
    ]
  })

  // Update filters with validation and persistence
  const updateFilters = useCallback((newFilters: FilterState) => {
    setFilters(prevFilters => {
      const updatedFilters = { ...prevFilters, ...newFilters }
      
      // Persist to localStorage
      if (persistToLocalStorage) {
        try {
          localStorage.setItem('genspark-advanced-filters', JSON.stringify(updatedFilters))
        } catch (error) {
          console.warn('Failed to save filters to localStorage:', error)
        }
      }

      // Update URL parameters
      if (syncWithURL) {
        try {
          const urlParams = serializeFiltersToURL(updatedFilters)
          const newURL = new URL(window.location.href)
          newURL.search = urlParams.toString()
          window.history.replaceState({}, '', newURL.toString())
        } catch (error) {
          console.warn('Failed to update URL with filters:', error)
        }
      }

      // Update analytics
      setFilterAnalytics(prev => ({
        ...prev,
        filterHistory: [
          { timestamp: Date.now(), filters: updatedFilters },
          ...prev.filterHistory.slice(0, 9) // Keep last 10 entries
        ]
      }))

      // Call external callback
      if (onFiltersChange) {
        onFiltersChange(updatedFilters)
      }

      return updatedFilters
    })
  }, [persistToLocalStorage, syncWithURL, onFiltersChange])

  // Reset filters to default
  const resetFilters = useCallback(() => {
    updateFilters(DEFAULT_FILTERS)
  }, [updateFilters])

  // Toggle filter panel
  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelOpen(prev => !prev)
  }, [])

  // Apply quick filter preset
  const applyQuickFilter = useCallback((quickFilter: { label: string; filters: Partial<FilterState> }) => {
    const mergedFilters = { ...filters, ...quickFilter.filters }
    updateFilters(mergedFilters)
  }, [filters, updateFilters])

  // Clear specific filter type
  const clearFilterType = useCallback((filterType: keyof FilterState) => {
    const clearedFilters = { ...filters }
    
    switch (filterType) {
      case 'fileTypes':
        clearedFilters.fileTypes = []
        break
      case 'dateRange':
        clearedFilters.dateRange = { start: null, end: null, preset: 'all' }
        break
      case 'sizeRange':
        clearedFilters.sizeRange = { min: 0, max: Infinity, preset: 'all' }
        break
      case 'tags':
        clearedFilters.tags = []
        break
      case 'contentTypes':
        clearedFilters.contentTypes = []
        break
      case 'sortBy':
        clearedFilters.sortBy = 'relevance'
        clearedFilters.sortOrder = 'desc'
        break
      case 'searchIn':
        clearedFilters.searchIn = {
          filename: true,
          content: true,
          metadata: true,
          tags: true
        }
        break
    }
    
    updateFilters(clearedFilters)
  }, [filters, updateFilters])

  // Generate search query string for backend
  const getSearchQuery = useCallback((baseQuery: string): string => {
    let searchQuery = baseQuery.trim()

    // Add file type filters
    if (filters.fileTypes.length > 0) {
      const typeFilters = filters.fileTypes.map(type => `type:${type}`).join(' OR ')
      searchQuery += ` (${typeFilters})`
    }

    // Add date range filters
    if (filters.dateRange.preset !== 'all' && filters.dateRange.start) {
      const startDate = filters.dateRange.start.toISOString().split('T')[0]
      searchQuery += ` after:${startDate}`
    }
    if (filters.dateRange.preset !== 'all' && filters.dateRange.end) {
      const endDate = filters.dateRange.end.toISOString().split('T')[0]
      searchQuery += ` before:${endDate}`
    }

    // Add size filters
    if (filters.sizeRange.preset !== 'all') {
      if (filters.sizeRange.min > 0) {
        searchQuery += ` size:>${Math.floor(filters.sizeRange.min / 1024)}KB`
      }
      if (filters.sizeRange.max < Infinity) {
        searchQuery += ` size:<${Math.floor(filters.sizeRange.max / 1024)}KB`
      }
    }

    // Add tag filters
    if (filters.tags.length > 0) {
      const tagFilters = filters.tags.map(tag => `tag:"${tag}"`).join(' ')
      searchQuery += ` ${tagFilters}`
    }

    return searchQuery.trim()
  }, [filters])

  // Generate backend filter object
  const getBackendFilters = useCallback(() => {
    return {
      fileTypes: filters.fileTypes,
      dateRange: filters.dateRange.preset !== 'all' ? {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      } : null,
      sizeRange: filters.sizeRange.preset !== 'all' ? {
        min: filters.sizeRange.min,
        max: filters.sizeRange.max
      } : null,
      tags: filters.tags,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      searchIn: filters.searchIn
    }
  }, [filters])

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

  // Check if filters are at default state
  const hasActiveFilters = useMemo(() => {
    return activeFilterCount > 0
  }, [activeFilterCount])

  // Get human-readable filter summary
  const getFilterSummary = useCallback((): string[] => {
    const summary: string[] = []

    if (filters.fileTypes.length > 0) {
      summary.push(`Types: ${filters.fileTypes.join(', ')}`)
    }

    if (filters.dateRange.preset !== 'all') {
      summary.push(`Date: ${filters.dateRange.preset}`)
    }

    if (filters.sizeRange.preset !== 'all') {
      summary.push(`Size: ${filters.sizeRange.preset}`)
    }

    if (filters.tags.length > 0) {
      summary.push(`Tags: ${filters.tags.join(', ')}`)
    }

    if (filters.sortBy !== 'relevance') {
      summary.push(`Sort: ${filters.sortBy} (${filters.sortOrder})`)
    }

    const searchInItems = Object.entries(filters.searchIn)
      .filter(([, enabled]) => !enabled)
      .map(([key]) => key)
    if (searchInItems.length > 0) {
      summary.push(`Excluding: ${searchInItems.join(', ')}`)
    }

    return summary
  }, [filters])

  // Listen to URL changes (for browser back/forward)
  useEffect(() => {
    if (!syncWithURL) return

    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const urlFilters = parseFiltersFromURL(urlParams)
        if (Object.keys(urlFilters).length > 0) {
          setFilters(prev => ({ ...prev, ...urlFilters }))
        }
      } catch (error) {
        console.warn('Failed to sync filters from URL on popstate:', error)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [syncWithURL])

  return {
    // State
    filters,
    isFilterPanelOpen,
    activeFilterCount,
    hasActiveFilters,
    filterAnalytics,

    // Actions
    updateFilters,
    resetFilters,
    toggleFilterPanel,
    applyQuickFilter,
    clearFilterType,

    // Utilities
    getSearchQuery,
    getBackendFilters,
    getFilterSummary
  }
}

// Helper functions for URL serialization
function serializeFiltersToURL(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.fileTypes.length > 0) {
    params.set('types', filters.fileTypes.join(','))
  }

  if (filters.dateRange.preset !== 'all') {
    params.set('date', filters.dateRange.preset)
    if (filters.dateRange.start) {
      params.set('date_start', filters.dateRange.start.toISOString().split('T')[0])
    }
    if (filters.dateRange.end) {
      params.set('date_end', filters.dateRange.end.toISOString().split('T')[0])
    }
  }

  if (filters.sizeRange.preset !== 'all') {
    params.set('size', filters.sizeRange.preset)
    if (filters.sizeRange.min > 0) {
      params.set('size_min', filters.sizeRange.min.toString())
    }
    if (filters.sizeRange.max < Infinity) {
      params.set('size_max', filters.sizeRange.max.toString())
    }
  }

  if (filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','))
  }

  if (filters.sortBy !== 'relevance') {
    params.set('sort', filters.sortBy)
    params.set('order', filters.sortOrder)
  }

  const searchInDisabled = Object.entries(filters.searchIn)
    .filter(([, enabled]) => !enabled)
    .map(([key]) => key)
  if (searchInDisabled.length > 0) {
    params.set('exclude', searchInDisabled.join(','))
  }

  return params
}

function parseFiltersFromURL(params: URLSearchParams): Partial<FilterState> {
  const filters: Partial<FilterState> = {}

  const types = params.get('types')
  if (types) {
    filters.fileTypes = types.split(',').filter(Boolean)
  }

  const datePreset = params.get('date')
  if (datePreset) {
    const start = params.get('date_start')
    const end = params.get('date_end')
    filters.dateRange = {
      preset: datePreset as any,
      start: start ? new Date(start) : null,
      end: end ? new Date(end) : null
    }
  }

  const sizePreset = params.get('size')
  if (sizePreset) {
    const min = params.get('size_min')
    const max = params.get('size_max')
    filters.sizeRange = {
      preset: sizePreset as any,
      min: min ? parseInt(min) : 0,
      max: max ? parseInt(max) : Infinity
    }
  }

  const tags = params.get('tags')
  if (tags) {
    filters.tags = tags.split(',').filter(Boolean)
  }

  const sort = params.get('sort')
  const order = params.get('order')
  if (sort) {
    filters.sortBy = sort as any
    filters.sortOrder = (order as any) || 'desc'
  }

  const exclude = params.get('exclude')
  if (exclude) {
    const excludedFields = exclude.split(',')
    filters.searchIn = {
      filename: !excludedFields.includes('filename'),
      content: !excludedFields.includes('content'),
      metadata: !excludedFields.includes('metadata'),
      tags: !excludedFields.includes('tags')
    }
  }

  return filters
}

export default useAdvancedFilters