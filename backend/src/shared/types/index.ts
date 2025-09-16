// Core Types for GenSpark AI Search Agent Framework

export interface AgentMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'error' | 'heartbeat';
  source: string;
  target: string | '*'; // '*' for broadcast
  payload: Record<string, unknown>;
  timestamp: number;
  correlationId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ttl?: number; // Time to live in milliseconds
}

export interface AgentHealth {
  agentId: string;
  status: 'healthy' | 'degraded' | 'failed';
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHeartbeat: number;
  errors: AgentError[];
  metrics: Record<string, number>;
}

export interface AgentError {
  id: string;
  agentId: string;
  type: 'fatal' | 'error' | 'warning';
  message: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface AgentRegistry {
  agentId: string;
  type: AgentType;
  version: string;
  capabilities: string[];
  endpoints: string[];
  status: AgentStatus;
  registeredAt: number;
  lastSeen: number;
  metadata: Record<string, unknown>;
}

export type AgentType = 
  | 'orchestrator'
  | 'file-processing' 
  | 'vector-embedding'
  | 'query-understanding'
  | 'search'
  | 'ranking'
  | 'learning';

export type AgentStatus = 'starting' | 'ready' | 'busy' | 'degraded' | 'stopped' | 'failed';

export interface FileItem {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'directory';
  size: number;
  extension?: string;
  mimeType?: string;
  lastModified: Date;
  created: Date;
  metadata: Record<string, unknown>;
  contentHash?: string;
  indexed?: boolean;
  indexedAt?: Date;
}

export interface ExtractedContent {
  fileId: string;
  content: string;
  contentType: string;
  chunks: ContentChunk[];
  metadata: FileMetadata;
  extractedAt: Date;
  extractionMethod: string;
  confidence: number;
}

export interface ContentChunk {
  id: string;
  fileId: string;
  content: string;
  startOffset: number;
  endOffset: number;
  chunkIndex: number;
  embedding?: Float32Array;
  metadata: Record<string, unknown>;
}

export interface FileMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  keywords?: string[];
  language?: string;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  creationDate?: Date;
  modificationDate?: Date;
  [key: string]: unknown;
}

export interface SearchQuery {
  id: string;
  query: string;
  filters: SearchFilters;
  options: SearchOptions;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
}

export interface SearchFilters {
  fileTypes?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  sizeRange?: {
    min?: number;
    max?: number;
  };
  paths?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'size' | 'name';
  sortOrder?: 'asc' | 'desc';
  includeContent?: boolean;
  includeMetadata?: boolean;
  highlightMatches?: boolean;
  similarityThreshold?: number;
}

export interface SearchResult {
  id: string;
  fileId: string;
  path: string;
  title: string;
  content: string;
  contentType: string;
  relevanceScore: number;
  matches: SearchMatch[];
  metadata: FileMetadata;
  thumbnail?: string;
  lastModified: Date;
  size: number;
}

export interface SearchMatch {
  field: string;
  value: string;
  highlights: TextHighlight[];
  score: number;
}

export interface TextHighlight {
  start: number;
  end: number;
  text: string;
}

export interface ParsedQuery {
  originalQuery: string;
  intent: QueryIntent;
  entities: QueryEntity[];
  keywords: string[];
  filters: SearchFilters;
  embedding?: Float32Array;
  confidence: number;
}

export interface QueryIntent {
  type: 'search' | 'filter' | 'sort' | 'navigate' | 'help';
  confidence: number;
  parameters: Record<string, unknown>;
}

export interface QueryEntity {
  type: 'date' | 'fileType' | 'person' | 'location' | 'size' | 'tag';
  value: string;
  confidence: number;
  startOffset: number;
  endOffset: number;
}

// MCP (Model Context Protocol) Types
export interface MCPCapability {
  name: string;
  version: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  examples?: unknown[];
}

export interface MCPRequest {
  id: string;
  capability: string;
  parameters: Record<string, unknown>;
  timestamp: number;
  timeout?: number;
}

export interface MCPResponse {
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: number;
  executionTime: number;
}

// Configuration Types
export interface AgentConfig {
  agentId: string;
  type: AgentType;
  enabled: boolean;
  maxMemory?: number;
  maxCpu?: number;
  restartOnFailure?: boolean;
  dependencies?: string[];
  environment?: Record<string, string>;
  [key: string]: unknown;
}

export interface SystemConfig {
  agents: Record<string, AgentConfig>;
  mcps: Record<string, unknown>;
  database: {
    type: 'sqlite' | 'postgresql';
    connectionString?: string;
    path?: string;
    options?: Record<string, unknown>;
  };
  redis: {
    url: string;
    options?: Record<string, unknown>;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    outputs: ('console' | 'file' | 'redis')[];
  };
  performance: {
    maxConcurrentOperations: number;
    requestTimeout: number;
    healthCheckInterval: number;
  };
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;