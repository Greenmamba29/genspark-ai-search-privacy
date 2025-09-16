/**
 * SimStudio Integration Service
 * Main orchestration service for enhanced offline capabilities
 */

import { createLogger } from '../shared/utils/logger.js';
import { getModelRegistry, EnhancedModelRegistry } from '../ai/models/ModelRegistry.js';
import { OllamaProvider } from './ollama/OllamaProvider.js';
import { EnhancedSyncEngine } from './sync/SyncEngine.js';
import { PrivacyManager } from '../privacy/PrivacyManager.js';
import type { 
  ModelDefinition,
  OfflineCapabilities,
  ModelInferenceOptions,
  ModelInferenceResult,
  EmbeddingOptions,
  EmbeddingResult
} from '../ai/providers/types.js';
import type { 
  SyncConfiguration,
  OfflineStorage,
  CloudSync,
  SyncStats
} from '../shared/types/sync.js';
import type { 
  PrivacyConfiguration,
  PrivacyMode,
  DataClassification
} from '../privacy/PrivacyManager.js';

const logger = createLogger('SimStudioIntegration');

export interface SimStudioConfig {
  ollama?: {
    enabled: boolean;
    baseUrl: string;
    autoDiscovery: boolean;
  };
  sync?: Partial<SyncConfiguration>;
  privacy?: Partial<PrivacyConfiguration>;
  registry?: {
    ollamaUrl?: string;
    healthCheckInterval?: number;
    cacheTimeout?: number;
  };
}

export interface OfflineSearchCapabilities {
  textGeneration: boolean;
  embeddings: boolean;
  semanticSearch: boolean;
  documentProcessing: boolean;
  localModels: string[];
  estimatedPerformance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface EnhancedSearchOptions {
  privacyMode?: PrivacyMode;
  offlineOnly?: boolean;
  preferLocal?: boolean;
  modelPreference?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface EnhancedSearchResult {
  results: any[];
  metadata: {
    modelUsed?: string;
    processingLocation: 'LOCAL' | 'CLOUD' | 'HYBRID';
    privacyCompliant: boolean;
    processingTime: number;
    cached: boolean;
  };
  privacy: {
    dataClassification: DataClassification;
    approvedForProcessing: boolean;
    encryptionUsed: boolean;
  };
}

export class SimStudioIntegrationService {
  private config: SimStudioConfig;
  private modelRegistry: EnhancedModelRegistry;
  private syncEngine?: EnhancedSyncEngine;
  private privacyManager: PrivacyManager;
  private isInitialized = false;

  constructor(config: SimStudioConfig = {}) {
    this.config = {
      ollama: {
        enabled: true,
        baseUrl: 'http://localhost:11434',
        autoDiscovery: true,
        ...config.ollama
      },
      sync: {
        enabled: true,
        autoSync: true,
        syncInterval: 30000,
        ...config.sync
      },
      privacy: {
        mode: 'HYBRID',
        localModelPreference: true,
        encryptSensitiveData: true,
        ...config.privacy
      },
      registry: {
        ollamaUrl: config.ollama?.baseUrl || 'http://localhost:11434',
        healthCheckInterval: 60000,
        cacheTimeout: 300000,
        ...config.registry
      }
    };

    this.modelRegistry = getModelRegistry(this.config.registry);
    this.privacyManager = new PrivacyManager(this.config.privacy);

    logger.info('SimStudio Integration Service created', { 
      config: this.sanitizeConfigForLogging(this.config) 
    });
  }

  /**
   * Initialize the integration service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('SimStudio Integration already initialized');
      return;
    }

    try {
      logger.info('Initializing SimStudio Integration...');

      // Initialize Ollama provider if enabled
      if (this.config.ollama?.enabled) {
        await this.initializeOllamaProvider();
      }

      // Initialize sync engine if needed
      if (this.config.sync?.enabled) {
        await this.initializeSyncEngine();
      }

      // Assess offline capabilities
      const capabilities = await this.assessOfflineCapabilities();
      logger.info('Offline capabilities assessed', capabilities);

      // Set appropriate privacy mode based on capabilities
      await this.configurePrivacyMode(capabilities);

      this.isInitialized = true;
      logger.info('SimStudio Integration initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize SimStudio Integration', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Perform enhanced AI search with privacy and offline capabilities
   */
  async enhancedSearch(
    query: string, 
    documents: any[], 
    options: EnhancedSearchOptions = {}
  ): Promise<EnhancedSearchResult> {
    const startTime = Date.now();

    try {
      // Classify the query for privacy compliance
      const classification = await this.privacyManager.classifyData(query);
      
      // Check if processing is allowed
      const canProcess = await this.privacyManager.canProcessData(
        query, 
        'search_query', 
        options.offlineOnly ? undefined : 'cloud'
      );

      if (!canProcess) {
        throw new Error('Query processing not allowed by privacy policy');
      }

      // Get processing strategy
      const strategy = await this.privacyManager.getProcessingStrategy(query, 'text_generation');

      // Generate embeddings for semantic search
      const queryEmbedding = await this.generatePrivateEmbeddings([query], {
        offlineOnly: options.offlineOnly || strategy.approach === 'LOCAL_ONLY',
        fallbackToLocal: options.preferLocal || strategy.approach === 'LOCAL_PREFERRED'
      });

      // Perform semantic search
      const searchResults = await this.performSemanticSearch(
        queryEmbedding[0].embedding,
        documents,
        options
      );

      // Generate enhanced results with AI if requested
      let enhancedResults = searchResults;
      if (options.modelPreference || classification.sensitivity === 'PUBLIC') {
        enhancedResults = await this.enhanceSearchResults(
          query,
          searchResults,
          options
        );
      }

      const processingTime = Date.now() - startTime;
      const wasLocal = queryEmbedding[0].wasOffline;

      return {
        results: enhancedResults,
        metadata: {
          modelUsed: queryEmbedding[0].modelUsed,
          processingLocation: wasLocal ? 'LOCAL' : 'CLOUD',
          privacyCompliant: true,
          processingTime,
          cached: false
        },
        privacy: {
          dataClassification: classification,
          approvedForProcessing: canProcess,
          encryptionUsed: classification.requiresEncryption
        }
      };

    } catch (error) {
      logger.error('Enhanced search failed', {
        query: query.substring(0, 100) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate embeddings with privacy controls
   */
  async generatePrivateEmbeddings(
    texts: string[], 
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    return this.privacyManager.generatePrivateEmbeddings(texts, options);
  }

  /**
   * Perform AI inference with privacy controls
   */
  async performPrivateInference(
    prompt: string, 
    options: ModelInferenceOptions = {}
  ): Promise<ModelInferenceResult> {
    return this.privacyManager.performPrivateInference(prompt, options);
  }

  /**
   * Get current offline capabilities
   */
  async getOfflineCapabilities(): Promise<OfflineSearchCapabilities> {
    const registry = this.modelRegistry;
    const localModels = await registry.getLocalModels();
    const privacyCapabilities = this.privacyManager.getLocalCapabilities();

    return {
      textGeneration: localModels.length > 0,
      embeddings: localModels.some(m => m.capabilities.embedding),
      semanticSearch: localModels.some(m => m.capabilities.embedding),
      documentProcessing: privacyCapabilities.documentAnalysis,
      localModels: localModels.map(m => m.id),
      estimatedPerformance: privacyCapabilities.estimatedPerformance
    };
  }

  /**
   * Get synchronization status
   */
  async getSyncStatus(): Promise<SyncStats | null> {
    if (!this.syncEngine) {
      return null;
    }
    return this.syncEngine.getStats();
  }

  /**
   * Force synchronization
   */
  async forcSync(): Promise<void> {
    if (!this.syncEngine) {
      throw new Error('Sync engine not initialized');
    }

    await this.syncEngine.processQueue();
  }

  /**
   * Update configuration
   */
  async updateConfiguration(updates: Partial<SimStudioConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };

    // Update privacy manager if privacy config changed
    if (updates.privacy) {
      await this.privacyManager.updateConfiguration(updates.privacy);
    }

    // Update sync engine if sync config changed
    if (updates.sync && this.syncEngine) {
      await this.syncEngine.updateConfiguration(updates.sync);
    }

    // Reinitialize Ollama if URL changed
    if (updates.ollama?.baseUrl && updates.ollama.baseUrl !== oldConfig.ollama?.baseUrl) {
      await this.initializeOllamaProvider();
    }

    logger.info('Configuration updated', { 
      changes: Object.keys(updates) 
    });
  }

  /**
   * Get privacy report
   */
  generatePrivacyReport() {
    return this.privacyManager.generatePrivacyReport();
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down SimStudio Integration...');

    try {
      if (this.syncEngine) {
        await this.syncEngine.stop();
      }

      this.modelRegistry.dispose();
      this.isInitialized = false;

      logger.info('SimStudio Integration shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Private methods

  private async initializeOllamaProvider(): Promise<void> {
    try {
      const ollamaProvider = new OllamaProvider(this.config.ollama!.baseUrl);
      
      // Test connection
      const isAvailable = await ollamaProvider.isAvailable();
      if (!isAvailable) {
        logger.warn('Ollama service not available', { 
          baseUrl: this.config.ollama!.baseUrl 
        });
        return;
      }

      // Register the provider
      this.modelRegistry.registerProvider(ollamaProvider);
      
      // Auto-discover models if enabled
      if (this.config.ollama!.autoDiscovery) {
        const models = await ollamaProvider.listModels();
        logger.info(`Discovered ${models.length} Ollama models`, {
          models: models.map(m => m.id)
        });
      }

    } catch (error) {
      logger.error('Failed to initialize Ollama provider', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async initializeSyncEngine(): Promise<void> {
    // This would initialize the sync engine with proper storage implementations
    // For now, we'll skip this as it requires concrete storage implementations
    logger.info('Sync engine initialization skipped - requires storage implementation');
  }

  private async assessOfflineCapabilities(): Promise<OfflineSearchCapabilities> {
    return this.getOfflineCapabilities();
  }

  private async configurePrivacyMode(capabilities: OfflineSearchCapabilities): Promise<void> {
    // Auto-configure privacy mode based on capabilities
    if (capabilities.textGeneration && capabilities.embeddings) {
      if (this.config.privacy?.mode === 'HYBRID') {
        logger.info('Local models available - privacy mode optimal');
      }
    } else {
      logger.warn('Limited local capabilities - consider privacy implications');
    }
  }

  private async performSemanticSearch(
    queryEmbedding: number[],
    documents: any[],
    options: EnhancedSearchOptions
  ): Promise<any[]> {
    // This would implement actual semantic search using the query embedding
    // For now, return a placeholder implementation
    return documents.slice(0, 10); // Return top 10 as placeholder
  }

  private async enhanceSearchResults(
    query: string,
    results: any[],
    options: EnhancedSearchOptions
  ): Promise<any[]> {
    try {
      // Generate enhanced descriptions or summaries for search results
      const enhancementPrompt = `Based on the query "${query}", provide enhanced context for these search results.`;
      
      const enhancement = await this.performPrivateInference(enhancementPrompt, {
        maxTokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
        offlineOnly: options.offlineOnly,
        fallbackToLocal: options.preferLocal
      });

      // Merge enhancement with original results
      return results.map((result, index) => ({
        ...result,
        enhancement: enhancement.text,
        enhanced: true
      }));

    } catch (error) {
      logger.warn('Failed to enhance search results', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return results; // Return original results if enhancement fails
    }
  }

  private sanitizeConfigForLogging(config: SimStudioConfig): any {
    // Remove sensitive information from config for logging
    const sanitized = { ...config };
    if (sanitized.privacy) {
      // Keep only non-sensitive privacy config
      sanitized.privacy = {
        mode: sanitized.privacy.mode,
        localModelPreference: sanitized.privacy.localModelPreference,
        auditLevel: sanitized.privacy.auditLevel
      };
    }
    return sanitized;
  }
}

// Singleton instance
let integrationInstance: SimStudioIntegrationService | null = null;

export function getSimStudioIntegration(config?: SimStudioConfig): SimStudioIntegrationService {
  if (!integrationInstance) {
    integrationInstance = new SimStudioIntegrationService(config);
  }
  return integrationInstance;
}

export function disposeSimStudioIntegration(): void {
  if (integrationInstance) {
    integrationInstance.shutdown().catch(err => 
      logger.error('Error disposing SimStudio integration', { error: err.message })
    );
    integrationInstance = null;
  }
}

export default SimStudioIntegrationService;