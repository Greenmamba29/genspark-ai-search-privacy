import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseAgent } from '@/shared/interfaces/BaseAgent.js';
import { MessageBus } from '@/shared/communication/MessageBus.js';
import { EmbeddingModelManager } from './EmbeddingModelManager.js';
import { VectorStore } from './VectorStore.js';
import type {
  AgentMessage,
  AgentConfig,
  ExtractedContent,
  ContentChunk,
} from '@/shared/types/index.js';

export interface VectorEmbeddingConfig extends AgentConfig {
  messageBusConfig: {
    redisUrl: string;
    channelPrefix: string;
    requestTimeout: number;
    maxRetries: number;
  };
  modelConfig: {
    defaultModel: string;
    modelSelectionStrategy: 'auto' | 'manual';
    cacheModels: boolean;
    maxConcurrentModels: number;
  };
  vectorConfig: {
    dimensions: number;
    similarityThreshold: number;
    indexType: 'hnsw' | 'flat';
    efConstruction?: number;
    efSearch?: number;
    maxElements?: number;
  };
  batchConfig: {
    batchSize: number;
    maxBatchWaitTime: number; // milliseconds
    maxQueueSize: number;
  };
  storageConfig: {
    vectorStorePath: string;
    metadataStorePath: string;
    enablePersistence: boolean;
    compressionLevel: number;
  };
}

export interface EmbeddingRequest {
  id: string;
  content: string;
  chunks: ContentChunk[];
  fileId: string;
  extractionMethod: string;
  modelHint?: string;
  priority: 'low' | 'normal' | 'high';
  metadata: Record<string, unknown>;
}

export interface EmbeddingResult {
  requestId: string;
  fileId: string;
  embeddings: {
    chunkId: string;
    vector: number[];
    content: string;
    metadata: Record<string, unknown>;
  }[];
  modelUsed: string;
  processingTime: number;
  confidence: number;
  dimensions: number;
}

export interface SearchQuery {
  id: string;
  query: string;
  filters?: Record<string, unknown>;
  topK: number;
  threshold?: number;
  modelHint?: string;
}

export interface SearchResult {
  queryId: string;
  results: {
    fileId: string;
    chunkId: string;
    content: string;
    score: number;
    metadata: Record<string, unknown>;
  }[];
  processingTime: number;
  totalResults: number;
  modelUsed: string;
}

export class VectorEmbeddingAgent extends BaseAgent {
  private messageBus: MessageBus;
  private orchestratorId: string = 'master-orchestrator';
  private modelManager: EmbeddingModelManager;
  private vectorStore: VectorStore;
  private embeddingQueue: Map<string, EmbeddingRequest> = new Map();
  private batchProcessor: NodeJS.Timeout | null = null;
  private processingBatch: boolean = false;

  constructor(config: VectorEmbeddingConfig) {
    super(config);
    this.messageBus = new MessageBus(config.messageBusConfig);
    this.modelManager = new EmbeddingModelManager(config.modelConfig);
    this.vectorStore = new VectorStore(config.vectorConfig, config.storageConfig);
  }

  protected async onInitialize(): Promise<void> {
    // Connect to message bus
    await this.messageBus.connect();
    
    // Subscribe to messages
    await this.messageBus.subscribe(this.id, this.handleMessage.bind(this));
    
    // Initialize model manager
    await this.modelManager.initialize();
    
    // Initialize vector store
    await this.vectorStore.initialize();
    
    // Start batch processor
    this.startBatchProcessor();
    
    console.log(`🧠 Vector Embedding Agent ${this.id} initialized`);
  }

  protected async onStart(): Promise<void> {
    // Register with orchestrator
    try {
      await this.messageBus.request(this.id, this.orchestratorId, {
        action: 'register-agent',
        agentId: this.id,
        type: this.type,
        version: this.version,
        capabilities: [
          'vector-embedding',
          'semantic-search',
          'batch-processing',
          'auto-model-selection',
          'similarity-search',
          'content-indexing'
        ],
        endpoints: [],
        metadata: {
          description: 'Vector embedding agent with intelligent model selection and semantic search',
          supportedModels: await this.modelManager.getAvailableModels(),
          vectorDimensions: (this.getConfig() as VectorEmbeddingConfig).vectorConfig.dimensions,
          batchSize: (this.getConfig() as VectorEmbeddingConfig).batchConfig.batchSize,
          searchCapabilities: ['semantic', 'similarity', 'hybrid'],
          autoModelSelection: true
        }
      });
      
      console.log('🧠 Vector Embedding Agent registered successfully');
      console.log(`📊 Available models: ${(await this.modelManager.getAvailableModels()).join(', ')}`);
      console.log(`🎯 Vector dimensions: ${(this.getConfig() as VectorEmbeddingConfig).vectorConfig.dimensions}`);
      
    } catch (error) {
      console.error('Failed to register Vector Embedding Agent:', error);
      throw error;
    }
  }

  protected async onStop(): Promise<void> {
    // Stop batch processor
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
      this.batchProcessor = null;
    }
    
    // Process remaining queue
    if (this.embeddingQueue.size > 0) {
      console.log(`Processing remaining ${this.embeddingQueue.size} items in queue...`);
      await this.processBatch(true);
    }
    
    // Save vector store state
    await this.vectorStore.save();
    
    // Cleanup models
    await this.modelManager.cleanup();
    
    // Unregister from orchestrator
    try {
      await this.messageBus.request(this.id, this.orchestratorId, {
        action: 'unregister-agent',
        agentId: this.id
      });
    } catch (error) {
      console.error('Failed to unregister Vector Embedding Agent:', error);
    }
    
    // Disconnect from message bus
    await this.messageBus.disconnect();
  }

  protected async onHandleMessage(message: AgentMessage): Promise<AgentMessage | void> {
    switch (message.type) {
      case 'request':
        return await this.handleRequest(message);
      case 'event':
        await this.handleEvent(message);
        break;
      default:
        console.log(`Vector Embedding Agent received ${message.type} message from ${message.source}`);
    }
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    await this.messageBus.sendMessage(message);
  }

  protected async onConfigUpdate(config: Partial<AgentConfig>): Promise<void> {
    console.log('Vector Embedding Agent config updated:', config);
  }

  private async handleRequest(message: AgentMessage): Promise<AgentMessage> {
    const { payload } = message;
    
    try {
      switch (payload.action) {
        case 'embed-content':
          return await this.handleEmbedContent(message);
        case 'search':
          return await this.handleSearch(message);
        case 'batch-embed':
          return await this.handleBatchEmbed(message);
        case 'get-embedding-stats':
          return await this.handleGetEmbeddingStats(message);
        case 'optimize-index':
          return await this.handleOptimizeIndex(message);
        case 'get-similar':
          return await this.handleGetSimilar(message);
        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }
    } catch (error) {
      return this.createErrorResponse(message, error as Error);
    }
  }

  private async handleEvent(message: AgentMessage): Promise<void> {
    const { payload } = message;
    
    switch (payload.event) {
      case 'file-processed':
        await this.handleFileProcessedEvent(message);
        break;
      case 'system-startup':
        console.log('Vector Embedding Agent: System startup detected');
        break;
      case 'system-shutdown':
        console.log('Vector Embedding Agent: System shutdown detected');
        break;
      default:
        console.log(`Vector Embedding Agent received event: ${payload.event}`);
    }
  }

  private async handleFileProcessedEvent(message: AgentMessage): Promise<void> {
    const { extractedContent } = message.payload as { extractedContent: ExtractedContent };
    
    if (!extractedContent || !extractedContent.chunks || extractedContent.chunks.length === 0) {
      console.warn(`Received file-processed event with no chunks for file ${extractedContent?.fileId}`);
      return;
    }

    console.log(`🔄 Processing embeddings for file: ${extractedContent.fileId} (${extractedContent.chunks.length} chunks)`);
    
    // Queue for embedding processing
    const embeddingRequest: EmbeddingRequest = {
      id: uuidv4(),
      content: extractedContent.content,
      chunks: extractedContent.chunks,
      fileId: extractedContent.fileId,
      extractionMethod: extractedContent.extractionMethod,
      modelHint: extractedContent.metadata?.extractionStats?.modelSelected as string,
      priority: 'normal',
      metadata: extractedContent.metadata || {}
    };

    this.embeddingQueue.set(embeddingRequest.id, embeddingRequest);
    console.log(`📥 Queued embedding request ${embeddingRequest.id} (queue size: ${this.embeddingQueue.size})`);
    
    this.incrementMetric('embedding_requests_queued');
  }

  private async handleEmbedContent(message: AgentMessage): Promise<AgentMessage> {
    const { content, modelHint, metadata = {} } = message.payload as {
      content: string;
      modelHint?: string;
      metadata?: Record<string, unknown>;
    };

    console.log(`🔄 Direct embedding request for content (${content.length} chars)`);
    
    const startTime = Date.now();
    
    // Select optimal model
    const selectedModel = await this.modelManager.selectOptimalModel(content, modelHint);
    console.log(`🎯 Selected model: ${selectedModel}`);
    
    // Generate embedding
    const embedding = await this.modelManager.generateEmbedding(content, selectedModel);
    
    const processingTime = Date.now() - startTime;
    
    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        embedding: {
          vector: embedding,
          model: selectedModel,
          dimensions: embedding.length,
          processingTime,
          content: content.substring(0, 100) + '...',
          metadata
        }
      },
      timestamp: Date.now(),
      correlationId: message.correlationId || uuidv4(),
      priority: 'normal'
    };
  }

  private async handleSearch(message: AgentMessage): Promise<AgentMessage> {
    const { query, topK = 10, threshold, modelHint, filters } = message.payload as {
      query: string;
      topK?: number;
      threshold?: number;
      modelHint?: string;
      filters?: Record<string, unknown>;
    };

    console.log(`🔍 Search request: "${query}" (topK: ${topK})`);
    
    const startTime = Date.now();
    
    // Select optimal model for query
    const selectedModel = await this.modelManager.selectOptimalModel(query, modelHint);
    
    // Generate query embedding
    const queryEmbedding = await this.modelManager.generateEmbedding(query, selectedModel);
    
    // Search vector store
    const results = await this.vectorStore.search(
      queryEmbedding,
      topK,
      threshold || (this.getConfig() as VectorEmbeddingConfig).vectorConfig.similarityThreshold,
      filters
    );
    
    const processingTime = Date.now() - startTime;
    
    console.log(`📊 Search completed: ${results.length} results in ${processingTime}ms`);
    
    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        searchResult: {
          queryId: uuidv4(),
          query,
          results,
          processingTime,
          totalResults: results.length,
          modelUsed: selectedModel,
          threshold: threshold || (this.getConfig() as VectorEmbeddingConfig).vectorConfig.similarityThreshold
        }
      },
      timestamp: Date.now(),
      correlationId: message.correlationId || uuidv4(),
      priority: 'normal'
    };
  }

  private async handleBatchEmbed(message: AgentMessage): Promise<AgentMessage> {
    const { requests } = message.payload as { requests: EmbeddingRequest[] };
    
    console.log(`📦 Batch embedding request: ${requests.length} items`);
    
    const startTime = Date.now();
    const results: EmbeddingResult[] = [];
    
    for (const request of requests) {
      this.embeddingQueue.set(request.id, request);
    }
    
    // Process the batch immediately
    const batchResults = await this.processBatch(true);
    results.push(...batchResults);
    
    const processingTime = Date.now() - startTime;
    
    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        batchResults: results,
        totalProcessed: results.length,
        processingTime
      },
      timestamp: Date.now(),
      correlationId: message.correlationId || uuidv4(),
      priority: 'normal'
    };
  }

  private async handleGetEmbeddingStats(message: AgentMessage): Promise<AgentMessage> {
    const stats = {
      queueSize: this.embeddingQueue.size,
      vectorStoreStats: await this.vectorStore.getStats(),
      modelStats: await this.modelManager.getStats(),
      metrics: this.getMetrics(),
      memoryUsage: process.memoryUsage(),
      uptime: Date.now() - this.startTime
    };

    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        stats
      },
      timestamp: Date.now(),
      correlationId: message.correlationId || uuidv4(),
      priority: 'normal'
    };
  }

  private async handleOptimizeIndex(message: AgentMessage): Promise<AgentMessage> {
    console.log('🔧 Optimizing vector index...');
    
    const startTime = Date.now();
    await this.vectorStore.optimize();
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Index optimization completed in ${processingTime}ms`);

    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        optimizationTime: processingTime,
        indexStats: await this.vectorStore.getStats()
      },
      timestamp: Date.now(),
      correlationId: message.correlationId || uuidv4(),
      priority: 'normal'
    };
  }

  private async handleGetSimilar(message: AgentMessage): Promise<AgentMessage> {
    const { fileId, chunkId, topK = 5 } = message.payload as {
      fileId?: string;
      chunkId?: string;
      topK?: number;
    };

    console.log(`🔍 Finding similar items for ${fileId ? `file: ${fileId}` : `chunk: ${chunkId}`}`);
    
    const results = await this.vectorStore.findSimilar(fileId, chunkId, topK);
    
    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        similarItems: results,
        totalFound: results.length
      },
      timestamp: Date.now(),
      correlationId: message.correlationId || uuidv4(),
      priority: 'normal'
    };
  }

  private startBatchProcessor(): void {
    const config = this.getConfig() as VectorEmbeddingConfig;
    
    this.batchProcessor = setInterval(async () => {
      if (this.embeddingQueue.size === 0 || this.processingBatch) {
        return;
      }
      
      const shouldProcess = 
        this.embeddingQueue.size >= config.batchConfig.batchSize ||
        this.getOldestQueueItemAge() >= config.batchConfig.maxBatchWaitTime;
        
      if (shouldProcess) {
        await this.processBatch();
      }
    }, Math.min(config.batchConfig.maxBatchWaitTime / 4, 1000));
  }

  private async processBatch(forceProcess: boolean = false): Promise<EmbeddingResult[]> {
    if (this.processingBatch && !forceProcess) {
      return [];
    }
    
    this.processingBatch = true;
    const config = this.getConfig() as VectorEmbeddingConfig;
    const results: EmbeddingResult[] = [];
    
    try {
      const batchSize = forceProcess ? this.embeddingQueue.size : Math.min(config.batchConfig.batchSize, this.embeddingQueue.size);
      const batch = Array.from(this.embeddingQueue.values()).slice(0, batchSize);
      
      if (batch.length === 0) {
        return results;
      }
      
      console.log(`🏭 Processing batch: ${batch.length} embedding requests`);
      const startTime = Date.now();
      
      for (const request of batch) {
        try {
          const result = await this.processEmbeddingRequest(request);
          results.push(result);
          
          // Remove from queue
          this.embeddingQueue.delete(request.id);
          
          this.incrementMetric('embedding_requests_processed');
          
        } catch (error) {
          console.error(`Failed to process embedding request ${request.id}:`, error);
          this.incrementMetric('embedding_requests_failed');
          
          // Remove failed request from queue
          this.embeddingQueue.delete(request.id);
        }
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Batch processed: ${results.length} embeddings in ${processingTime}ms`);
      
      // Broadcast batch completion event
      await this.messageBus.broadcast({
        event: 'embeddings-generated',
        batchSize: results.length,
        processingTime,
        agentId: this.id,
        timestamp: Date.now()
      }, this.id);
      
    } finally {
      this.processingBatch = false;
    }
    
    return results;
  }

  private async processEmbeddingRequest(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const startTime = Date.now();
    
    // Select optimal model based on content and hints
    const selectedModel = await this.modelManager.selectOptimalModel(
      request.content,
      request.modelHint,
      request.metadata
    );
    
    console.log(`🎯 Processing ${request.chunks.length} chunks with model: ${selectedModel}`);
    
    const embeddings: EmbeddingResult['embeddings'] = [];
    
    // Process chunks in batches for efficiency
    const chunkBatchSize = 5; // Process 5 chunks at a time
    
    for (let i = 0; i < request.chunks.length; i += chunkBatchSize) {
      const chunkBatch = request.chunks.slice(i, i + chunkBatchSize);
      
      const chunkEmbeddings = await Promise.all(
        chunkBatch.map(async (chunk) => {
          const embedding = await this.modelManager.generateEmbedding(chunk.content, selectedModel);
          
          return {
            chunkId: chunk.id,
            vector: embedding,
            content: chunk.content,
            metadata: {
              ...chunk.metadata,
              fileId: request.fileId,
              extractionMethod: request.extractionMethod,
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
              chunkIndex: chunk.chunkIndex
            }
          };
        })
      );
      
      embeddings.push(...chunkEmbeddings);
    }
    
    // Store embeddings in vector store
    await this.vectorStore.addEmbeddings(embeddings, request.fileId);
    
    const processingTime = Date.now() - startTime;
    
    const result: EmbeddingResult = {
      requestId: request.id,
      fileId: request.fileId,
      embeddings,
      modelUsed: selectedModel,
      processingTime,
      confidence: 1.0, // Will be enhanced with actual confidence scoring
      dimensions: embeddings[0]?.vector.length || 0
    };
    
    console.log(`✅ Embedded ${embeddings.length} chunks in ${processingTime}ms (${Math.round(processingTime / embeddings.length)}ms/chunk)`);
    
    return result;
  }

  private getOldestQueueItemAge(): number {
    let oldestTime = Date.now();
    
    for (const request of this.embeddingQueue.values()) {
      const requestTime = parseInt(request.id.split('-')[0]) || Date.now();
      oldestTime = Math.min(oldestTime, requestTime);
    }
    
    return Date.now() - oldestTime;
  }

  private createErrorResponse(message: AgentMessage, error: Error): AgentMessage {
    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: false,
        error: error.message
      },
      timestamp: Date.now(),
      correlationId: message.correlationId || uuidv4(),
      priority: 'normal'
    };
  }
}