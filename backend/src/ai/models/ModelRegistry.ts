/**
 * Enhanced Model Registry with offline support and SimStudio integration
 * Manages multiple AI providers with fallback strategies
 */

import { createLogger } from '../../shared/utils/logger.js';
import type {
  ModelRegistry,
  ModelProvider,
  ModelDefinition,
  ModelProviderStatus,
  OfflineCapabilities
} from '../providers/types.js';
import { OllamaProvider } from '../../services/ollama/OllamaProvider.js';

const logger = createLogger('ModelRegistry');

interface RegistryConfig {
  offlineMode: boolean;
  fallbackToLocal: boolean;
  cacheTimeout: number;
  healthCheckInterval: number;
  ollamaUrl?: string;
}

interface ModelCache {
  models: ModelDefinition[];
  timestamp: Date;
  providerId: string;
}

export class EnhancedModelRegistry implements ModelRegistry {
  private providers: Map<string, ModelProvider> = new Map();
  private modelCache: Map<string, ModelCache> = new Map();
  private config: RegistryConfig;
  private isOfflineMode = false;
  private healthCheckTimer?: NodeJS.Timer;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      offlineMode: false,
      fallbackToLocal: true,
      cacheTimeout: 300000, // 5 minutes
      healthCheckInterval: 60000, // 1 minute
      ollamaUrl: 'http://localhost:11434',
      ...config
    };

    this.initializeDefaultProviders();
    this.startHealthChecks();
  }

  private initializeDefaultProviders(): void {
    // Initialize Ollama provider by default for local support
    const ollamaProvider = new OllamaProvider(this.config.ollamaUrl);
    this.registerProvider(ollamaProvider);

    logger.info('Initialized default providers', { 
      providers: Array.from(this.providers.keys()) 
    });
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const checks = Array.from(this.providers.values()).map(async (provider) => {
      try {
        const status = await provider.getStatus();
        logger.debug(`Provider health check: ${status.providerId}`, { status });
        return status;
      } catch (error) {
        logger.warn(`Health check failed for provider: ${provider.definition.id}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
      }
    });

    const results = await Promise.all(checks);
    const healthyProviders = results.filter(r => r?.isAvailable).length;
    
    logger.debug(`Health check completed`, { 
      total: this.providers.size,
      healthy: healthyProviders
    });
  }

  registerProvider(provider: ModelProvider): void {
    const providerId = provider.definition.id;
    this.providers.set(providerId, provider);
    logger.info(`Registered provider: ${providerId}`, {
      name: provider.definition.name,
      isLocal: provider.definition.isLocal,
      requiresApiKey: provider.definition.requiresApiKey
    });
  }

  unregisterProvider(providerId: string): void {
    if (this.providers.delete(providerId)) {
      this.modelCache.delete(providerId);
      logger.info(`Unregistered provider: ${providerId}`);
    } else {
      logger.warn(`Attempted to unregister non-existent provider: ${providerId}`);
    }
  }

  getProvider(providerId: string): ModelProvider | null {
    return this.providers.get(providerId) || null;
  }

  getAllProviders(): ModelProvider[] {
    return Array.from(this.providers.values());
  }

  async getAvailableProviders(): Promise<ModelProvider[]> {
    const availabilityChecks = Array.from(this.providers.values()).map(async (provider) => {
      const isAvailable = await provider.isAvailable();
      return { provider, isAvailable };
    });

    const results = await Promise.all(availabilityChecks);
    return results
      .filter(({ isAvailable }) => isAvailable)
      .map(({ provider }) => provider);
  }

  findModelProvider(modelId: string): ModelProvider | null {
    // First check if any provider explicitly lists this model
    for (const provider of this.providers.values()) {
      const models = provider.definition.models;
      if (models.find(m => m.id === modelId)) {
        return provider;
      }
    }

    // Then check model patterns
    for (const provider of this.providers.values()) {
      const patterns = provider.definition.modelPatterns || [];
      for (const pattern of patterns) {
        if (pattern.test(modelId)) {
          return provider;
        }
      }
    }

    return null;
  }

  async listAllModels(): Promise<ModelDefinition[]> {
    const allModels: ModelDefinition[] = [];
    
    const modelLists = await Promise.all(
      Array.from(this.providers.values()).map(async (provider) => {
        try {
          return await this.getModelsFromProvider(provider);
        } catch (error) {
          logger.warn(`Failed to get models from provider: ${provider.definition.id}`, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return [];
        }
      })
    );

    for (const models of modelLists) {
      allModels.push(...models);
    }

    // Remove duplicates based on model ID
    const uniqueModels = allModels.reduce((acc, model) => {
      const existing = acc.find(m => m.id === model.id);
      if (!existing) {
        acc.push(model);
      } else if (model.isLocal && !existing.isLocal) {
        // Prefer local models over remote ones with same ID
        const index = acc.indexOf(existing);
        acc[index] = model;
      }
      return acc;
    }, [] as ModelDefinition[]);

    logger.debug(`Listed all models`, { 
      total: uniqueModels.length,
      local: uniqueModels.filter(m => m.isLocal).length,
      remote: uniqueModels.filter(m => !m.isLocal).length
    });

    return uniqueModels;
  }

  async getLocalModels(): Promise<ModelDefinition[]> {
    const allModels = await this.listAllModels();
    return allModels.filter(model => model.isLocal);
  }

  async getRemoteModels(): Promise<ModelDefinition[]> {
    const allModels = await this.listAllModels();
    return allModels.filter(model => !model.isLocal);
  }

  async enableOfflineMode(): Promise<void> {
    this.isOfflineMode = true;
    logger.info('Enabled offline mode - will prefer local providers');
    
    // Pre-load local models to ensure they're ready
    const localProviders = Array.from(this.providers.values())
      .filter(p => p.definition.isLocal);
    
    for (const provider of localProviders) {
      try {
        await provider.listModels();
      } catch (error) {
        logger.warn(`Failed to pre-load models for local provider: ${provider.definition.id}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async disableOfflineMode(): Promise<void> {
    this.isOfflineMode = false;
    logger.info('Disabled offline mode - will use all available providers');
  }

  isOfflineModeEnabled(): boolean {
    return this.isOfflineMode;
  }

  async getOfflineFallbacks(originalModelId: string): Promise<ModelDefinition[]> {
    const localModels = await this.getLocalModels();
    
    // Find similar local models based on family, capabilities, or size
    const originalProvider = this.findModelProvider(originalModelId);
    const originalModel = originalProvider 
      ? await originalProvider.getModel(originalModelId)
      : null;

    if (!originalModel) {
      // Return all local models as fallbacks
      return localModels;
    }

    // Score models by similarity to original
    const scoredModels = localModels.map(model => ({
      model,
      score: this.calculateSimilarityScore(originalModel, model)
    }));

    // Sort by score and return top matches
    scoredModels.sort((a, b) => b.score - a.score);
    
    return scoredModels
      .slice(0, 5) // Top 5 fallbacks
      .map(item => item.model);
  }

  private calculateSimilarityScore(original: ModelDefinition, candidate: ModelDefinition): number {
    let score = 0;

    // Family match
    if (original.family && candidate.family && original.family === candidate.family) {
      score += 50;
    }

    // Capability matches
    const originalCaps = original.capabilities;
    const candidateCaps = candidate.capabilities;

    if (originalCaps.embedding && candidateCaps.embedding) score += 30;
    if (originalCaps.toolUsageControl && candidateCaps.toolUsageControl) score += 20;
    if (originalCaps.temperature && candidateCaps.temperature) score += 10;

    // Size similarity (prefer smaller differences)
    if (original.sizeGB && candidate.sizeGB) {
      const sizeDiff = Math.abs(original.sizeGB - candidate.sizeGB);
      score += Math.max(0, 20 - sizeDiff); // Less penalty for smaller size differences
    }

    // Context window similarity
    if (original.contextWindow && candidate.contextWindow) {
      const contextRatio = Math.min(
        original.contextWindow / candidate.contextWindow,
        candidate.contextWindow / original.contextWindow
      );
      score += contextRatio * 15;
    }

    return score;
  }

  private async getModelsFromProvider(provider: ModelProvider): Promise<ModelDefinition[]> {
    const providerId = provider.definition.id;
    const cached = this.modelCache.get(providerId);
    
    // Return cached models if they're still fresh
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.config.cacheTimeout) {
      return cached.models;
    }

    // Fetch fresh models
    try {
      const models = await provider.listModels();
      
      // Cache the results
      this.modelCache.set(providerId, {
        models,
        timestamp: new Date(),
        providerId
      });

      return models;
    } catch (error) {
      // Return cached models if available, even if stale
      if (cached) {
        logger.warn(`Using stale cache for provider: ${providerId}`, {
          age: Date.now() - cached.timestamp.getTime()
        });
        return cached.models;
      }
      throw error;
    }
  }

  // Get comprehensive offline capabilities across all providers
  async getGlobalOfflineCapabilities(): Promise<OfflineCapabilities> {
    const localProviders = Array.from(this.providers.values())
      .filter(p => p.definition.isLocal);

    const capabilities = await Promise.all(
      localProviders.map(p => p.getOfflineCapabilities())
    );

    const combined: OfflineCapabilities = {
      hasLocalModels: capabilities.some(c => c.hasLocalModels),
      supportedTasks: [...new Set(capabilities.flatMap(c => c.supportedTasks))],
      estimatedStorageGB: capabilities.reduce((sum, c) => sum + c.estimatedStorageGB, 0),
      fallbackStrategies: [...new Set(capabilities.flatMap(c => c.fallbackStrategies))]
    };

    return combined;
  }

  // Clean up resources
  dispose(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
    this.providers.clear();
    this.modelCache.clear();
    
    logger.info('Model registry disposed');
  }
}

// Singleton instance for global access
let registryInstance: EnhancedModelRegistry | null = null;

export function getModelRegistry(config?: Partial<RegistryConfig>): EnhancedModelRegistry {
  if (!registryInstance) {
    registryInstance = new EnhancedModelRegistry(config);
  }
  return registryInstance;
}

export function disposeModelRegistry(): void {
  if (registryInstance) {
    registryInstance.dispose();
    registryInstance = null;
  }
}