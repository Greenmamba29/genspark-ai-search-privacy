/**
 * Ollama Provider for local model serving
 * Adapted from SimStudio with enhanced offline capabilities
 */

import fetch from 'node-fetch';
import { createLogger } from '../../shared/utils/logger.js';
import type {
  ModelProvider,
  ProviderDefinition,
  ModelDefinition,
  ModelProviderStatus,
  ModelLoadStatus,
  OfflineCapabilities,
  ModelPricing,
  ModelCapabilities
} from '../ai/providers/types.js';

const logger = createLogger('OllamaProvider');

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaResponse {
  models: OllamaModel[];
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    num_predict?: number;
  };
}

interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

export class OllamaProvider implements ModelProvider {
  private baseUrl: string;
  private _definition: ProviderDefinition;
  private modelCache: Map<string, ModelDefinition> = new Map();
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval = 60000; // 1 minute
  private isHealthy = false;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this._definition = {
      id: 'ollama',
      name: 'Ollama',
      description: 'Local LLM models via Ollama',
      models: [],
      defaultModel: '',
      isLocal: true,
      requiresApiKey: false,
      baseUrl: this.baseUrl,
      healthEndpoint: '/api/tags',
      capabilities: {
        localInference: true,
        offlineSupport: true,
        embedding: true,
        temperature: { min: 0, max: 2 }
      }
    };
  }

  get definition(): ProviderDefinition {
    return this._definition;
  }

  async isAvailable(): Promise<boolean> {
    const now = new Date();
    if (now.getTime() - this.lastHealthCheck.getTime() < this.healthCheckInterval && this.isHealthy) {
      return this.isHealthy;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      
      this.isHealthy = response.ok;
      this.lastHealthCheck = now;
      
      if (this.isHealthy) {
        logger.info('Ollama service is available', { baseUrl: this.baseUrl });
      } else {
        logger.warn('Ollama service returned error', { 
          status: response.status, 
          statusText: response.statusText 
        });
      }
      
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = now;
      logger.warn('Failed to connect to Ollama service', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        baseUrl: this.baseUrl 
      });
      return false;
    }
  }

  async getStatus(): Promise<ModelProviderStatus> {
    const isAvailable = await this.isAvailable();
    const models = isAvailable ? await this.listModels() : [];
    
    return {
      providerId: this.definition.id,
      isAvailable,
      isOnline: true, // Ollama is always "online" when available (local service)
      modelCount: models.length,
      lastCheck: this.lastHealthCheck,
      error: !isAvailable ? 'Ollama service unavailable' : undefined
    };
  }

  async listModels(): Promise<ModelDefinition[]> {
    if (!await this.isAvailable()) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      const models: ModelDefinition[] = [];

      for (const ollamaModel of data.models) {
        const modelDef = this.ollamaModelToDefinition(ollamaModel);
        models.push(modelDef);
        this.modelCache.set(modelDef.id, modelDef);
      }

      // Update definition with discovered models
      this._definition.models = models;
      this._definition.defaultModel = models.length > 0 ? models[0].id : '';

      logger.info(`Discovered ${models.length} Ollama models`, { 
        models: models.map(m => m.id) 
      });

      return models;
    } catch (error) {
      logger.error('Failed to list Ollama models', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
  }

  async getModel(modelId: string): Promise<ModelDefinition | null> {
    if (this.modelCache.has(modelId)) {
      return this.modelCache.get(modelId)!;
    }

    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  async loadModel(modelId: string): Promise<void> {
    // Ollama loads models on-demand, so we'll trigger a small request to load it
    try {
      logger.info(`Loading Ollama model: ${modelId}`);
      await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          prompt: 'test', // Minimal prompt to trigger model loading
          stream: false,
          options: { num_predict: 1 }
        } as OllamaGenerateRequest)
      });
      logger.info(`Model loaded successfully: ${modelId}`);
    } catch (error) {
      logger.error(`Failed to load model: ${modelId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async unloadModel(modelId: string): Promise<void> {
    // Ollama doesn't have explicit unload, but we can clear from cache
    logger.info(`Unloading model from cache: ${modelId}`);
    this.modelCache.delete(modelId);
  }

  async getLoadStatus(modelId: string): Promise<ModelLoadStatus> {
    const model = await this.getModel(modelId);
    if (!model) {
      return {
        modelId,
        isLoaded: false,
        isLoading: false,
        error: 'Model not found'
      };
    }

    // For Ollama, we assume models are loaded if they exist
    return {
      modelId,
      isLoaded: true,
      isLoading: false
    };
  }

  async getOfflineCapabilities(): Promise<OfflineCapabilities> {
    const models = await this.listModels();
    const totalSize = models.reduce((sum, model) => sum + (model.sizeGB || 0), 0);

    return {
      hasLocalModels: models.length > 0,
      supportedTasks: ['text-generation', 'embeddings', 'chat-completion'],
      estimatedStorageGB: totalSize,
      fallbackStrategies: ['local-only', 'cached-responses']
    };
  }

  async downloadModel(modelId: string, onProgress?: (progress: number) => void): Promise<void> {
    logger.info(`Downloading Ollama model: ${modelId}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Ollama streams download progress, but for simplicity we'll just wait
      await response.json();
      onProgress?.(100);
      
      logger.info(`Model downloaded successfully: ${modelId}`);
      
      // Refresh our model cache
      await this.listModels();
    } catch (error) {
      logger.error(`Failed to download model: ${modelId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async generateText(prompt: string, modelId: string, options: any = {}): Promise<string> {
    if (!await this.isAvailable()) {
      throw new Error('Ollama service is not available');
    }

    try {
      const request: OllamaGenerateRequest = {
        model: modelId,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature,
          top_k: options.topK,
          top_p: options.topP,
          num_predict: options.maxTokens
        }
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.response || '';
    } catch (error) {
      logger.error(`Failed to generate text with model ${modelId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async generateEmbedding(text: string, modelId: string): Promise<number[]> {
    if (!await this.isAvailable()) {
      throw new Error('Ollama service is not available');
    }

    try {
      const request: OllamaEmbeddingRequest = {
        model: modelId,
        prompt: text
      };

      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as OllamaEmbeddingResponse;
      return data.embedding;
    } catch (error) {
      logger.error(`Failed to generate embedding with model ${modelId}`, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private ollamaModelToDefinition(ollamaModel: OllamaModel): ModelDefinition {
    const sizeGB = ollamaModel.size / (1024 * 1024 * 1024);
    const family = ollamaModel.details?.family || 
                  ollamaModel.details?.families?.[0] || 
                  this.extractFamilyFromName(ollamaModel.name);

    const capabilities: ModelCapabilities = {
      localInference: true,
      offlineSupport: true,
      temperature: { min: 0, max: 2 },
      embedding: this.isEmbeddingModel(ollamaModel.name)
    };

    const pricing: ModelPricing = {
      input: 0, // Local models are free
      output: 0,
      updatedAt: ollamaModel.modified_at
    };

    return {
      id: ollamaModel.name,
      name: ollamaModel.name,
      description: `Local ${family} model via Ollama`,
      pricing,
      capabilities,
      isLocal: true,
      sizeGB: Math.round(sizeGB * 100) / 100,
      family,
      contextWindow: this.estimateContextWindow(ollamaModel.name)
    };
  }

  private extractFamilyFromName(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('llama')) return 'LLaMA';
    if (lowerName.includes('mistral')) return 'Mistral';
    if (lowerName.includes('codellama')) return 'Code Llama';
    if (lowerName.includes('vicuna')) return 'Vicuna';
    if (lowerName.includes('alpaca')) return 'Alpaca';
    if (lowerName.includes('gemma')) return 'Gemma';
    if (lowerName.includes('qwen')) return 'Qwen';
    return 'Unknown';
  }

  private isEmbeddingModel(name: string): boolean {
    const lowerName = name.toLowerCase();
    return lowerName.includes('embed') || 
           lowerName.includes('bge-') || 
           lowerName.includes('sentence');
  }

  private estimateContextWindow(name: string): number {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('32k')) return 32768;
    if (lowerName.includes('16k')) return 16384;
    if (lowerName.includes('8k')) return 8192;
    if (lowerName.includes('4k')) return 4096;
    if (lowerName.includes('2k')) return 2048;
    
    // Default context windows by family
    if (lowerName.includes('llama2') || lowerName.includes('llama-2')) return 4096;
    if (lowerName.includes('llama3') || lowerName.includes('llama-3')) return 8192;
    if (lowerName.includes('mistral')) return 8192;
    if (lowerName.includes('codellama')) return 16384;
    
    return 4096; // Conservative default
  }
}