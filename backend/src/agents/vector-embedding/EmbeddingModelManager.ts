import { pipeline, env, Pipeline } from '@xenova/transformers';

// Disable local model cache for development (models will download to cache)
env.allowLocalModels = false;
env.cacheDir = './data/models';

export interface ModelConfig {
  defaultModel: string;
  modelSelectionStrategy: 'auto' | 'manual';
  cacheModels: boolean;
  maxConcurrentModels: number;
}

export interface ModelInfo {
  name: string;
  dimensions: number;
  maxTokens: number;
  description: string;
  useCase: string[];
  performance: 'fast' | 'balanced' | 'accurate';
  memoryUsage: 'low' | 'medium' | 'high';
}

export interface ModelStats {
  totalModelsLoaded: number;
  activeModels: string[];
  modelUsageCount: Record<string, number>;
  totalEmbeddingsGenerated: number;
  averageEmbeddingTime: number;
  memoryUsage: Record<string, number>;
}

export class EmbeddingModelManager {
  private config: ModelConfig;
  private loadedModels: Map<string, any> = new Map();
  private modelInfo: Map<string, ModelInfo> = new Map();
  private modelStats: Map<string, { usageCount: number; totalTime: number; loadTime: number }> = new Map();
  private isInitialized: boolean = false;
  private currentModel: string | null = null;

  constructor(config: ModelConfig) {
    this.config = config;
    this.initializeModelInfo();
  }

  private initializeModelInfo(): void {
    // Define available models with their characteristics
    const models: ModelInfo[] = [
      {
        name: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 384,
        maxTokens: 512,
        description: 'Fast and efficient general-purpose embedding model',
        useCase: ['general', 'fast-search', 'lightweight'],
        performance: 'fast',
        memoryUsage: 'low'
      },
      {
        name: 'Xenova/all-MiniLM-L12-v2',
        dimensions: 384,
        maxTokens: 512,
        description: 'Balanced performance and accuracy',
        useCase: ['general', 'balanced', 'medium-accuracy'],
        performance: 'balanced',
        memoryUsage: 'medium'
      },
      {
        name: 'Xenova/all-mpnet-base-v2',
        dimensions: 768,
        maxTokens: 512,
        description: 'High-quality embeddings for complex content',
        useCase: ['technical', 'academic', 'high-accuracy'],
        performance: 'accurate',
        memoryUsage: 'high'
      },
      {
        name: 'Xenova/paraphrase-MiniLM-L6-v2',
        dimensions: 384,
        maxTokens: 512,
        description: 'Optimized for paraphrase detection and semantic similarity',
        useCase: ['paraphrase', 'similarity', 'duplicate-detection'],
        performance: 'fast',
        memoryUsage: 'low'
      },
      {
        name: 'Xenova/distilbert-base-uncased',
        dimensions: 768,
        maxTokens: 512,
        description: 'BERT-based model for general text understanding',
        useCase: ['text-classification', 'general', 'balanced'],
        performance: 'balanced',
        memoryUsage: 'medium'
      }
    ];

    for (const model of models) {
      this.modelInfo.set(model.name, model);
      this.modelStats.set(model.name, { usageCount: 0, totalTime: 0, loadTime: 0 });
    }
  }

  async initialize(): Promise<void> {
    console.log('🤖 Initializing Embedding Model Manager...');
    
    // Pre-load default model
    await this.loadModel(this.config.defaultModel);
    
    this.isInitialized = true;
    console.log(`✅ Model Manager initialized with default model: ${this.config.defaultModel}`);
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up model manager...');
    
    // Clear all loaded models
    this.loadedModels.clear();
    
    console.log('✅ Model manager cleanup completed');
  }

  async getAvailableModels(): Promise<string[]> {
    return Array.from(this.modelInfo.keys());
  }

  async selectOptimalModel(
    content: string,
    modelHint?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    // If manual strategy or hint provided, use it
    if (this.config.modelSelectionStrategy === 'manual' && modelHint) {
      if (this.modelInfo.has(modelHint)) {
        return modelHint;
      }
      console.warn(`Model hint ${modelHint} not available, falling back to auto selection`);
    }

    // Auto selection based on content analysis
    return this.autoSelectModel(content, metadata);
  }

  private autoSelectModel(content: string, metadata?: Record<string, unknown>): string {
    const contentLength = content.length;
    const wordCount = content.split(/\s+/).length;
    
    // Analyze content characteristics
    const hasTechnicalTerms = /\b(algorithm|function|class|method|implementation|architecture|system|database|API|framework)\b/i.test(content);
    const hasCode = /\{|\}|function|class|import|from|def |int |string|boolean|array/i.test(content);
    const hasFormulas = /\$.*\$|\\[.*\\]|∑|∫|∂|∇|α|β|γ|δ|ε|θ|λ|μ|π|σ|φ|ψ|ω/i.test(content);
    const hasTables = /\|.*\|.*\||,.*,.*,/g.test(content);
    const isStructured = /^#{1,6}\s+|\n=+\n|\n-+\n/m.test(content);
    
    // Check metadata for hints
    const extractionStats = metadata?.extractionStats as Record<string, unknown>;
    const documentStructure = extractionStats?.documentStructure as Record<string, unknown>;
    const contentType = documentStructure?.contentType as string;
    const complexity = documentStructure?.complexity as string;
    
    console.log(`🔍 Content analysis: length=${contentLength}, words=${wordCount}, type=${contentType}, complexity=${complexity}`);
    console.log(`   - Technical: ${hasTechnicalTerms}, Code: ${hasCode}, Formulas: ${hasFormulas}, Tables: ${hasTables}, Structured: ${isStructured}`);
    
    // Model selection logic
    if (hasCode || hasTechnicalTerms || hasFormulas || contentType === 'technical') {
      if (complexity === 'complex' || contentLength > 5000) {
        return 'Xenova/all-mpnet-base-v2'; // High accuracy for complex technical content
      }
      return 'Xenova/all-MiniLM-L12-v2'; // Balanced for technical content
    }
    
    if (hasTables || contentType === 'data') {
      return 'Xenova/distilbert-base-uncased'; // Good for structured data
    }
    
    if (contentType === 'narrative' || wordCount > 1000) {
      return 'Xenova/paraphrase-MiniLM-L6-v2'; // Optimized for text similarity
    }
    
    // Default to fast, general-purpose model
    return 'Xenova/all-MiniLM-L6-v2';
  }

  async generateEmbedding(text: string, modelName?: string): Promise<number[]> {
    const selectedModel = modelName || this.config.defaultModel;
    
    if (!this.modelInfo.has(selectedModel)) {
      throw new Error(`Model ${selectedModel} not available`);
    }
    
    const startTime = Date.now();
    
    try {
      // Load model if not already loaded
      if (!this.loadedModels.has(selectedModel)) {
        await this.loadModel(selectedModel);
      }
      
      const model = this.loadedModels.get(selectedModel)!;
      const modelInfo = this.modelInfo.get(selectedModel)!;
      
      // Truncate text if it exceeds model's max tokens (rough estimation)
      const truncatedText = this.truncateText(text, modelInfo.maxTokens);
      
      // Generate embedding
      const output = await model(truncatedText, { pooling: 'mean', normalize: true });
      
      // Extract the embedding array
      const embedding: number[] = Array.from(output.data);
      
      // Update stats
      const processingTime = Date.now() - startTime;
      this.updateModelStats(selectedModel, processingTime);
      
      console.log(`🎯 Generated ${embedding.length}D embedding with ${selectedModel} in ${processingTime}ms`);
      
      return embedding;
      
    } catch (error) {
      console.error(`Failed to generate embedding with ${selectedModel}:`, error);
      
      // Fallback to default model if different
      if (selectedModel !== this.config.defaultModel) {
        console.log(`Falling back to default model: ${this.config.defaultModel}`);
        return this.generateEmbedding(text, this.config.defaultModel);
      }
      
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[], modelName?: string): Promise<number[][]> {
    const selectedModel = modelName || this.config.defaultModel;
    console.log(`📦 Generating batch embeddings for ${texts.length} texts with ${selectedModel}`);
    
    const startTime = Date.now();
    const embeddings: number[][] = [];
    
    // Process in smaller batches to avoid memory issues
    const batchSize = 10;
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.generateEmbedding(text, selectedModel))
      );
      
      embeddings.push(...batchEmbeddings);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Generated ${embeddings.length} embeddings in ${totalTime}ms (${Math.round(totalTime / embeddings.length)}ms/embedding)`);
    
    return embeddings;
  }

  private async loadModel(modelName: string): Promise<void> {
    if (this.loadedModels.has(modelName)) {
      return; // Already loaded
    }
    
    // Check concurrent model limit
    if (this.loadedModels.size >= this.config.maxConcurrentModels) {
      await this.unloadLeastUsedModel();
    }
    
    console.log(`📥 Loading model: ${modelName}`);
    const loadStartTime = Date.now();
    
    try {
      // Create feature extraction pipeline
      const model = await pipeline('feature-extraction', modelName, {
        quantized: true, // Use quantized models for better performance
      });
      
      this.loadedModels.set(modelName, model);
      
      // Set current model if this is the first one loaded
      if (!this.currentModel) {
        this.currentModel = modelName;
      }
      
      const loadTime = Date.now() - loadStartTime;
      const stats = this.modelStats.get(modelName)!;
      stats.loadTime = loadTime;
      
      console.log(`✅ Model loaded: ${modelName} (${loadTime}ms)`);
      
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      throw new Error(`Failed to load embedding model: ${modelName}`);
    }
  }

  private async unloadLeastUsedModel(): Promise<void> {
    if (this.loadedModels.size === 0) {
      return;
    }
    
    // Find least used model (excluding default)
    let leastUsedModel = '';
    let minUsage = Infinity;
    
    Array.from(this.modelStats.entries()).forEach(([modelName, stats]) => {
      if (modelName !== this.config.defaultModel && 
          this.loadedModels.has(modelName) && 
          stats.usageCount < minUsage) {
        minUsage = stats.usageCount;
        leastUsedModel = modelName;
      }
    });
    
    if (leastUsedModel) {
      console.log(`🗑️ Unloading least used model: ${leastUsedModel} (used ${minUsage} times)`);
      this.loadedModels.delete(leastUsedModel);
    }
  }

  private truncateText(text: string, maxTokens: number): string {
    // Simple token estimation: ~4 characters per token
    const estimatedTokens = text.length / 4;
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    const maxChars = maxTokens * 4;
    return text.substring(0, maxChars - 3) + '...';
  }

  private updateModelStats(modelName: string, processingTime: number): void {
    const stats = this.modelStats.get(modelName);
    if (stats) {
      stats.usageCount++;
      stats.totalTime += processingTime;
    }
  }

  async getStats(): Promise<ModelStats> {
    const activeModels = Array.from(this.loadedModels.keys());
    const modelUsageCount: Record<string, number> = {};
    let totalEmbeddings = 0;
    let totalTime = 0;
    
    Array.from(this.modelStats.entries()).forEach(([modelName, stats]) => {
      modelUsageCount[modelName] = stats.usageCount;
      totalEmbeddings += stats.usageCount;
      totalTime += stats.totalTime;
    });
    
    return {
      totalModelsLoaded: this.loadedModels.size,
      activeModels,
      modelUsageCount,
      totalEmbeddingsGenerated: totalEmbeddings,
      averageEmbeddingTime: totalEmbeddings > 0 ? totalTime / totalEmbeddings : 0,
      memoryUsage: await this.getModelMemoryUsage()
    };
  }

  private async getModelMemoryUsage(): Promise<Record<string, number>> {
    // Estimate memory usage for loaded models
    const memoryUsage: Record<string, number> = {};
    
    Array.from(this.loadedModels.keys()).forEach((modelName) => {
      const modelInfo = this.modelInfo.get(modelName);
      if (modelInfo) {
        // Rough estimation based on model size and dimensions
        let estimatedMB = 0;
        
        switch (modelInfo.memoryUsage) {
          case 'low':
            estimatedMB = 50;
            break;
          case 'medium':
            estimatedMB = 150;
            break;
          case 'high':
            estimatedMB = 300;
            break;
        }
        
        memoryUsage[modelName] = estimatedMB;
      }
    });
    
    return memoryUsage;
  }

  getModelInfo(modelName: string): ModelInfo | undefined {
    return this.modelInfo.get(modelName);
  }

  getAllModelInfo(): ModelInfo[] {
    return Array.from(this.modelInfo.values());
  }

  isModelLoaded(modelName: string): boolean {
    return this.loadedModels.has(modelName);
  }

  getLoadedModels(): string[] {
    return Array.from(this.loadedModels.keys());
  }
  
  get initialized(): boolean {
    return this.isInitialized;
  }
  
  getCurrentModel(): string | null {
    return this.currentModel;
  }
}
