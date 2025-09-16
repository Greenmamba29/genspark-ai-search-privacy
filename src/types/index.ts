export interface SearchResult {
  id: string
  title: string
  content: string
  type: 'document' | 'image' | 'video' | 'code' | 'other'
  path: string
  size: number
  lastModified: Date
  relevanceScore: number
}

export interface SearchFilters {
  type?: string[]
  dateRange?: {
    start?: Date
    end?: Date
  }
  sizeRange?: {
    min?: number
    max?: number
  }
  tags?: string[]
}

export interface SearchQuery {
  query: string
  filters: SearchFilters
  sortBy: 'relevance' | 'date' | 'size' | 'name'
  sortOrder: 'asc' | 'desc'
}

export interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  size: number
  lastModified: Date
  thumbnail?: string
  children?: FileItem[]
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  primaryColor: string
  accentColor: string
}