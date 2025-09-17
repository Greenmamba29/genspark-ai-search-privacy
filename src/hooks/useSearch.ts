import { useState, useEffect, useCallback } from 'react'
import { searchService } from '../services/searchService'
import type { SearchQuery, SearchResult, SearchFilters } from '../types/index'
import type { SearchResponse } from '../services/searchService'

interface UseSearchState {
  results: SearchResult[]
  isSearching: boolean
  error: string | null
  totalResults: number
  processingTime: number
  model: string
  query: string
  isBackendConnected: boolean
}

interface UseSearchActions {
  search: (query: string, filters?: SearchFilters) => Promise<void>
  clearResults: () => void
  setFilters: (filters: SearchFilters) => void
  setSorting: (sortBy: SearchQuery['sortBy'], sortOrder: SearchQuery['sortOrder']) => void
}

interface UseSearchReturn extends UseSearchState, UseSearchActions {}

export function useSearch(): UseSearchReturn {
  const [state, setState] = useState<UseSearchState>({
    results: [],
    isSearching: false,
    error: null,
    totalResults: 0,
    processingTime: 0,
    model: '',
    query: '',
    isBackendConnected: false
  })

  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({})
  const [sortBy, setSortBy] = useState<SearchQuery['sortBy']>('relevance')
  const [sortOrder, setSortOrder] = useState<SearchQuery['sortOrder']>('desc')

  // Initialize search service
  useEffect(() => {
    const initializeSearchService = async () => {
      try {
        await searchService.initialize()
        setState(prev => ({
          ...prev,
          isBackendConnected: searchService.isBackendConnected(),
          model: searchService.getConfig().defaultModel
        }))
      } catch (error) {
        console.error('Failed to initialize search service:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize search service',
          isBackendConnected: false
        }))
      }
    }

    initializeSearchService()
  }, [])

  const search = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!query.trim()) {
      return
    }

    setState(prev => ({
      ...prev,
      isSearching: true,
      error: null,
      query: query.trim()
    }))

    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        filters: filters || currentFilters,
        sortBy,
        sortOrder
      }

      const response: SearchResponse = await searchService.search(searchQuery)

      setState(prev => ({
        ...prev,
        isSearching: false,
        results: response.results,
        totalResults: response.totalResults,
        processingTime: response.processingTime,
        model: response.model,
        error: null
      }))
    } catch (error) {
      console.error('Search failed:', error)
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: error instanceof Error ? error.message : 'Search failed',
        results: [],
        totalResults: 0
      }))
    }
  }, [currentFilters, sortBy, sortOrder])

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      totalResults: 0,
      processingTime: 0,
      query: '',
      error: null
    }))
  }, [])

  const setFilters = useCallback((filters: SearchFilters) => {
    setCurrentFilters(filters)
    
    // Re-search if there's an active query
    if (state.query) {
      search(state.query, filters)
    }
  }, [state.query, search])

  const setSorting = useCallback((newSortBy: SearchQuery['sortBy'], newSortOrder: SearchQuery['sortOrder']) => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    
    // Re-search if there's an active query
    if (state.query) {
      search(state.query, currentFilters)
    }
  }, [state.query, currentFilters, search])

  return {
    // State
    ...state,
    
    // Actions
    search,
    clearResults,
    setFilters,
    setSorting
  }
}

// Hook for getting available models
export function useModels() {
  const [models, setModels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const availableModels = await searchService.getAvailableModels()
        setModels(availableModels)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch models:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch models')
        // Fallback models
        setModels(['Xenova/all-MiniLM-L6-v2'])
      } finally {
        setIsLoading(false)
      }
    }

    fetchModels()
  }, [])

  return { models, isLoading, error }
}