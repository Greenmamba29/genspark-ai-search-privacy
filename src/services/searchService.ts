import type { SearchResult, SearchQuery } from '../types/index'

export interface SearchConfig {
  backendUrl: string
  defaultModel: string
  timeout: number
}

export interface SearchResponse {
  results: SearchResult[]
  totalResults: number
  processingTime: number
  model: string
  query: string
}

class SearchService {
  private config: SearchConfig
  private isConnected: boolean = false

  constructor(config: SearchConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Test backend connection
      const response = await fetch(`${this.config.backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (response.ok) {
        this.isConnected = true
        console.log('✅ Search service connected to backend')
        
        // Initialize default model
        await this.initializeModel()
      } else {
        console.warn('⚠️ Backend health check failed, using mock mode')
        this.isConnected = false
      }
    } catch (error) {
      console.warn('⚠️ Backend not available, using mock mode:', error)
      this.isConnected = false
    }
  }

  private async initializeModel(): Promise<void> {
    try {
      const response = await fetch(`${this.config.backendUrl}/api/models/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          warmup: true
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (response.ok) {
        console.log(`✅ Default model ${this.config.defaultModel} initialized`)
      }
    } catch (error) {
      console.warn('⚠️ Model initialization failed:', error)
    }
  }

  async search(query: SearchQuery, options?: { signal?: AbortSignal }): Promise<SearchResponse> {
    if (this.isConnected) {
      return this.performBackendSearch(query, options)
    } else {
      return this.performMockSearch(query, options)
    }
  }

  private async performBackendSearch(query: SearchQuery, options?: { signal?: AbortSignal }): Promise<SearchResponse> {
    try {
      const response = await fetch(`${this.config.backendUrl}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.query,
          filters: query.filters,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          model: this.config.defaultModel
        }),
        signal: options?.signal || AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        results: data.results || [],
        totalResults: data.totalResults || 0,
        processingTime: data.processingTime || 0,
        model: data.model || this.config.defaultModel,
        query: query.query
      }
    } catch (error) {
      console.error('Backend search failed, falling back to mock:', error)
      return this.performMockSearch(query)
    }
  }

  private async performMockSearch(query: SearchQuery, options?: { signal?: AbortSignal }): Promise<SearchResponse> {
    // Check if search was aborted
    if (options?.signal?.aborted) {
      throw new Error('AbortError')
    }

    // Simulate processing time
    const startTime = Date.now()
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, Math.random() * 1000 + 500)
      
      // Handle abort signal
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(timeout)
          reject(new Error('AbortError'))
        })
      }
    })

    // Generate mock results based on query
    const mockResults: SearchResult[] = this.generateMockResults(query)
    
    return {
      results: mockResults,
      totalResults: mockResults.length,
      processingTime: Date.now() - startTime,
      model: this.config.defaultModel,
      query: query.query
    }
  }

  private generateMockResults(query: SearchQuery): SearchResult[] {
    const baseResults = [
      {
        id: '1',
        title: 'Machine Learning Fundamentals',
        content: 'Introduction to machine learning algorithms and their applications in modern AI systems...',
        type: 'document' as const,
        path: '/documents/ml-fundamentals.pdf',
        size: 2048000,
        lastModified: new Date('2024-01-15'),
        relevanceScore: 0.95
      },
      {
        id: '2',
        title: 'Neural Networks Deep Dive',
        content: 'Comprehensive guide to understanding neural networks, backpropagation, and deep learning architectures...',
        type: 'document' as const,
        path: '/documents/neural-networks.md',
        size: 1536000,
        lastModified: new Date('2024-02-01'),
        relevanceScore: 0.88
      },
      {
        id: '3',
        title: 'AI Search Implementation',
        content: 'Code examples and implementation details for building AI-powered search systems...',
        type: 'code' as const,
        path: '/code/ai-search.py',
        size: 256000,
        lastModified: new Date('2024-02-10'),
        relevanceScore: 0.82
      },
      {
        id: '4',
        title: 'Data Processing Pipeline',
        content: 'Automated data processing pipeline for handling large-scale document collections...',
        type: 'document' as const,
        path: '/documents/data-pipeline.docx',
        size: 1024000,
        lastModified: new Date('2024-01-28'),
        relevanceScore: 0.75
      },
      {
        id: '5',
        title: 'Vector Embeddings Guide',
        content: 'Understanding vector embeddings and their role in semantic search applications...',
        type: 'document' as const,
        path: '/documents/vector-embeddings.pdf',
        size: 1792000,
        lastModified: new Date('2024-02-05'),
        relevanceScore: 0.71
      }
    ]

    // Filter results based on query relevance
    const queryLower = query.query.toLowerCase()
    let filteredResults = baseResults.filter(result => 
      result.title.toLowerCase().includes(queryLower) ||
      result.content.toLowerCase().includes(queryLower)
    )

    // If no specific matches, return all results
    if (filteredResults.length === 0) {
      filteredResults = baseResults
    }

    // Apply filters
    if (query.filters.type && query.filters.type.length > 0) {
      filteredResults = filteredResults.filter(result => 
        query.filters.type!.includes(result.type)
      )
    }

    // Apply sorting
    filteredResults.sort((a, b) => {
      switch (query.sortBy) {
        case 'relevance':
          return query.sortOrder === 'asc' ? 
            a.relevanceScore - b.relevanceScore : 
            b.relevanceScore - a.relevanceScore
        case 'date':
          return query.sortOrder === 'asc' ? 
            a.lastModified.getTime() - b.lastModified.getTime() : 
            b.lastModified.getTime() - a.lastModified.getTime()
        case 'size':
          return query.sortOrder === 'asc' ? 
            a.size - b.size : 
            b.size - a.size
        case 'name':
          return query.sortOrder === 'asc' ? 
            a.title.localeCompare(b.title) : 
            b.title.localeCompare(a.title)
        default:
          return b.relevanceScore - a.relevanceScore
      }
    })

    return filteredResults
  }

  async getAvailableModels(): Promise<string[]> {
    if (this.isConnected) {
      try {
        const response = await fetch(`${this.config.backendUrl}/api/models`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(this.config.timeout)
        })

        if (response.ok) {
          const data = await response.json()
          return data.models || [this.config.defaultModel]
        }
      } catch (error) {
        console.warn('Failed to fetch available models:', error)
      }
    }

    // Return default models if backend not available
    return [
      'Xenova/all-MiniLM-L6-v2',  // GPT OSS equivalent - lightweight
      'Xenova/all-MiniLM-L12-v2',
      'Xenova/all-mpnet-base-v2'
    ]
  }

  isBackendConnected(): boolean {
    return this.isConnected
  }

  getConfig(): SearchConfig {
    return { ...this.config }
  }
}

// Create default search service instance
const defaultConfig: SearchConfig = {
  backendUrl: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001' 
    : window.location.origin,
  defaultModel: 'Xenova/all-MiniLM-L6-v2', // Lightweight GPT OSS equivalent
  timeout: 30000 // 30 seconds
}

export const searchService = new SearchService(defaultConfig)
export default searchService