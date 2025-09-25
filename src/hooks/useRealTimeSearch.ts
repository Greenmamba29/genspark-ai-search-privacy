import { useState, useEffect, useCallback, useRef } from 'react'
import { searchService } from '../services/searchService'
import type { SearchQuery, SearchResult, SearchFilters } from '../types/index'
import type { SearchResponse } from '../services/searchService'

interface UseRealTimeSearchState {
  results: SearchResult[]
  suggestions: string[]
  isSearching: boolean
  error: string | null
  totalResults: number
  processingTime: number
  model: string
  query: string
  isBackendConnected: boolean
  searchHistory: string[]
}

interface UseRealTimeSearchActions {
  search: (query: string, filters?: SearchFilters) => Promise<void>
  searchRealTime: (query: string, filters?: SearchFilters) => void
  clearResults: () => void
  setFilters: (filters: SearchFilters) => void
  setSorting: (sortBy: SearchQuery['sortBy'], sortOrder: SearchQuery['sortOrder']) => void
  addToHistory: (query: string) => void
}

interface UseRealTimeSearchReturn extends UseRealTimeSearchState, UseRealTimeSearchActions {}

export function useRealTimeSearch(debounceMs: number = 300, currentModel?: string): UseRealTimeSearchReturn {
  const [state, setState] = useState<UseRealTimeSearchState>({
    results: [],
    suggestions: [],
    isSearching: false,
    error: null,
    totalResults: 0,
    processingTime: 0,
    model: '',
    query: '',
    isBackendConnected: false,
    searchHistory: JSON.parse(localStorage.getItem('genspark_search_history') || '[]')
  })

  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({})
  const [sortBy, setSortBy] = useState<SearchQuery['sortBy']>('relevance')
  const [sortOrder, setSortOrder] = useState<SearchQuery['sortOrder']>('desc')
  
  const debounceRef = useRef<NodeJS.Timeout>()
  const searchControllerRef = useRef<AbortController>()

  // Initialize search service and sync with current model
  useEffect(() => {
    const initializeSearchService = async () => {
      try {
        await searchService.initialize()
        
        // Set the current model in search service if provided
        if (currentModel) {
          searchService.setCurrentModel(currentModel)
        }
        
        setState(prev => ({
          ...prev,
          isBackendConnected: searchService.isBackendConnected(),
          model: searchService.getCurrentModel()
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

  // Update search service when current model changes
  useEffect(() => {
    if (currentModel) {
      searchService.setCurrentModel(currentModel)
      setState(prev => ({
        ...prev,
        model: currentModel
      }))
    }
  }, [currentModel])

  // Save search history to localStorage
  useEffect(() => {
    localStorage.setItem('genspark_search_history', JSON.stringify(state.searchHistory))
  }, [state.searchHistory])

  // Real-time search with debouncing
  const searchRealTime = useCallback((query: string, filters?: SearchFilters) => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Cancel previous search
    if (searchControllerRef.current) {
      searchControllerRef.current.abort()
    }

    if (!query.trim()) {
      setState(prev => ({
        ...prev,
        results: [],
        totalResults: 0,
        processingTime: 0,
        query: '',
        error: null,
        isSearching: false
      }))
      return
    }

    // Set searching state immediately for better UX
    setState(prev => ({
      ...prev,
      isSearching: true,
      query: query.trim(),
      error: null
    }))

    // Debounce the actual search
    debounceRef.current = setTimeout(async () => {
      try {
        // Create new abort controller for this search
        searchControllerRef.current = new AbortController()

        const searchQuery: SearchQuery = {
          query: query.trim(),
          filters: filters || currentFilters,
          sortBy,
          sortOrder
        }

        const response: SearchResponse = await searchService.search(searchQuery, {
          signal: searchControllerRef.current.signal
        })

        // Only update if this search wasn't cancelled
        if (!searchControllerRef.current.signal.aborted) {
          setState(prev => ({
            ...prev,
            isSearching: false,
            results: response.results,
            totalResults: response.totalResults,
            processingTime: response.processingTime,
            model: response.model,
            error: null
          }))
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Real-time search failed:', error)
          setState(prev => ({
            ...prev,
            isSearching: false,
            error: error instanceof Error ? error.message : 'Search failed',
            results: [],
            totalResults: 0
          }))
        }
      }
    }, debounceMs)
  }, [currentFilters, sortBy, sortOrder, debounceMs])

  // Regular search (immediate)
  const search = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!query.trim()) return

    // Cancel any pending real-time search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
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

      // Add to search history
      addToHistory(query.trim())
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
    // Cancel any pending searches
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (searchControllerRef.current) {
      searchControllerRef.current.abort()
    }

    setState(prev => ({
      ...prev,
      results: [],
      totalResults: 0,
      processingTime: 0,
      query: '',
      error: null,
      isSearching: false
    }))
  }, [])

  const setFilters = useCallback((filters: SearchFilters) => {
    setCurrentFilters(filters)
    
    // Re-search if there's an active query
    if (state.query) {
      searchRealTime(state.query, filters)
    }
  }, [state.query, searchRealTime])

  const setSorting = useCallback((newSortBy: SearchQuery['sortBy'], newSortOrder: SearchQuery['sortOrder']) => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    
    // Re-search if there's an active query
    if (state.query) {
      searchRealTime(state.query, currentFilters)
    }
  }, [state.query, currentFilters, searchRealTime])

  const addToHistory = useCallback((query: string) => {
    setState(prev => {
      // Avoid adding duplicate or empty queries
      if (!query.trim() || prev.searchHistory[0] === query) {
        return prev
      }
      const newHistory = [query, ...prev.searchHistory.filter(h => h !== query)].slice(0, 10)
      return {
        ...prev,
        searchHistory: newHistory
      }
    })
  }, [])

  // Generate suggestions based on current query and history
  const generateSuggestions = useCallback((query: string): string[] => {
    if (!query.trim()) return []

    const queryLower = query.toLowerCase()
    const historySuggestions = state.searchHistory.filter(h => 
      h.toLowerCase().includes(queryLower) && h.toLowerCase() !== queryLower
    )

    const completionSuggestions = [
      `${query} tutorial`,
      `${query} examples`,
      `${query} documentation`,
      `${query} best practices`
    ].filter(suggestion => !historySuggestions.some(h => 
      h.toLowerCase() === suggestion.toLowerCase()
    ))

    return [...historySuggestions, ...completionSuggestions].slice(0, 5)
  }, [state.searchHistory])

  // Update suggestions when query changes
  useEffect(() => {
    const suggestions = generateSuggestions(state.query)
    setState(prev => ({
      ...prev,
      suggestions
    }))
  }, [state.query, generateSuggestions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (searchControllerRef.current) {
        searchControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // State
    ...state,
    
    // Actions
    search,
    searchRealTime,
    clearResults,
    setFilters,
    setSorting,
    addToHistory
  }
}