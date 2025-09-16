/**
 * Model provider types adapted from SimStudio for GenSpark integration
 * Enhanced with offline capabilities and local processing support
 */

export interface ModelPricing {
  input: number // Per 1M tokens
  cachedInput?: number // Per 1M tokens (if supported)
  output: number // Per 1M tokens
  updatedAt: string
}

export interface ModelCapabilities {
  temperature?: {
    min: number
    max: number
  }
  toolUsageControl?: boolean
  computerUse?: boolean
  reasoningEffort?: {
    values: string[]
  }
  verbosity?: {
    values: string[]
  }
  embedding?: boolean
  localInference?: boolean
  offlineSupport?: boolean
}

export interface ModelDefinition {
  id: string
  name: string
  description?: string
  pricing: ModelPricing
  capabilities: ModelCapabilities
  isLocal: boolean
  sizeGB?: number
  contextWindow?: number
  family?: string
}

export interface ProviderDefinition {
  id: string
  name: string
  description: string
  models: ModelDefinition[]
  defaultModel: string
  modelPatterns?: RegExp[]
  icon?: string
  capabilities?: ModelCapabilities
  isLocal: boolean
  requiresApiKey: boolean
  baseUrl?: string
  healthEndpoint?: string
}

export interface ModelProviderStatus {
  providerId: string
  isAvailable: boolean
  isOnline: boolean
  modelCount: number
  lastCheck: Date
  error?: string
}

export interface ModelLoadStatus {
  modelId: string
  isLoaded: boolean
  isLoading: boolean
  loadProgress?: number
  error?: string
  memoryUsage?: number
}

export interface OfflineCapabilities {
  hasLocalModels: boolean
  supportedTasks: string[]
  estimatedStorageGB: number
  fallbackStrategies: string[]
}

export interface ModelProvider {
  readonly definition: ProviderDefinition
  
  // Status and health
  isAvailable(): Promise<boolean>
  getStatus(): Promise<ModelProviderStatus>
  
  // Model management
  listModels(): Promise<ModelDefinition[]>
  getModel(modelId: string): Promise<ModelDefinition | null>
  loadModel(modelId: string): Promise<void>
  unloadModel(modelId: string): Promise<void>
  getLoadStatus(modelId: string): Promise<ModelLoadStatus>
  
  // Offline capabilities
  getOfflineCapabilities(): Promise<OfflineCapabilities>
  downloadModel?(modelId: string, onProgress?: (progress: number) => void): Promise<void>
  
  // Inference
  generateText?(prompt: string, modelId: string, options?: any): Promise<string>
  generateEmbedding?(text: string, modelId: string): Promise<number[]>
}

export interface ModelRegistry {
  registerProvider(provider: ModelProvider): void
  unregisterProvider(providerId: string): void
  getProvider(providerId: string): ModelProvider | null
  getAllProviders(): ModelProvider[]
  getAvailableProviders(): Promise<ModelProvider[]>
  findModelProvider(modelId: string): ModelProvider | null
  
  // Global model operations
  listAllModels(): Promise<ModelDefinition[]>
  getLocalModels(): Promise<ModelDefinition[]>
  getRemoteModels(): Promise<ModelDefinition[]>
  
  // Offline support
  enableOfflineMode(): Promise<void>
  disableOfflineMode(): Promise<void>
  isOfflineModeEnabled(): boolean
  getOfflineFallbacks(originalModelId: string): Promise<ModelDefinition[]>
}

export interface ModelInferenceOptions {
  temperature?: number
  maxTokens?: number
  stream?: boolean
  systemPrompt?: string
  tools?: any[]
  toolUsage?: 'auto' | 'required' | 'disabled'
  fallbackToLocal?: boolean
  offlineOnly?: boolean
}

export interface ModelInferenceResult {
  text: string
  modelUsed: string
  providerUsed: string
  tokensUsed?: {
    input: number
    output: number
  }
  wasOffline: boolean
  duration: number
  cached?: boolean
}

export interface EmbeddingOptions {
  dimensions?: number
  batchSize?: number
  fallbackToLocal?: boolean
  offlineOnly?: boolean
}

export interface EmbeddingResult {
  embedding: number[]
  modelUsed: string
  providerUsed: string
  tokensUsed?: number
  wasOffline: boolean
  duration: number
  dimensions: number
}