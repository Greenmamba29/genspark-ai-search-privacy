import { BaseAgent } from '../../shared/interfaces/BaseAgent';
import { MessageBus } from '../../shared/communication/MessageBus';
import { EmbeddingModelManager } from './EmbeddingModelManager';
import { VectorStore } from './VectorStore';
import { SemanticSearchHandler } from './SemanticSearchHandler';
import {
  AgentMessage,
  AgentConfig,
} from '../../shared/types/index';

export interface VectorEmbeddingConfig extends AgentConfig {
  vectorConfig: {
    dimensions: number;
    similarityThreshold: number;
  };
  batchConfig: {
    batchSize: number;
    maxQueueSize: number;
  };
  storage: {
    vectorStorePath: string;
    metadataStorePath: string;
    enablePersistence: boolean;
  };
}

export interface EmbeddingRequest {
  type: 'EMBEDDING_REQUEST';
  fileId: string;
  chunks: Array<{
    chunkId: string;
    content: string;
    metadata: Record<string, unknown>;
  }>;
  requestId: string;
}

export interface SearchRequest {
  type: 'SEARCH_REQUEST';
  query: string;
  topK?: number;
  threshold?: number;
  filters?: Record<string, unknown>;
  requestId: string;
}

export class VectorEmbeddingAgent extends BaseAgent {
  private messageBus: MessageBus;
  private modelManager?: EmbeddingModelManager;
  private vectorStore?: VectorStore;
  private searchHandler?: SemanticSearchHandler;
  private embeddingQueue: Map<string, EmbeddingRequest> = new Map();
  private isProcessing: boolean = false;
  private orchestratorId: string;

  constructor(config: VectorEmbeddingConfig, messageBus: MessageBus, orchestratorId: string = 'orchestrator') {
    super(config);
    this.messageBus = messageBus;
    this.orchestratorId = orchestratorId;
  }

  protected async onInitialize(): Promise<void> {
    console.log('🤖 Initializing Vector Embedding Agent...');
    
    const config = this.config as VectorEmbeddingConfig;
    
    // Initialize model manager
    this.modelManager = new EmbeddingModelManager({
      defaultModel: 'Xenova/all-MiniLM-L6-v2',
      modelSelectionStrategy: 'auto',
      cacheModels: true,
      maxConcurrentModels: 3
    });
    
    await this.modelManager.initialize();
    
    // Initialize vector store
    this.vectorStore = new VectorStore(
      {
        dimensions: config.vectorConfig.dimensions,
        similarityThreshold: config.vectorConfig.similarityThreshold,
        indexType: 'hnsw',
        maxElements: 100000
      },
      {
        vectorStorePath: config.storage.vectorStorePath,
        metadataStorePath: config.storage.metadataStorePath,
        enablePersistence: config.storage.enablePersistence,
        compressionLevel: 1
      }
    );
    
    await this.vectorStore.initialize();
    
    // Initialize search handler
    this.searchHandler = new SemanticSearchHandler(this.vectorStore, this.modelManager);
    await this.searchHandler.initialize();
    
    console.log('✅ Vector Embedding Agent initialized');
  }

  protected async onStart(): Promise<void> {
    console.log('🚀 Starting Vector Embedding Agent...');
    
    // Connect to message bus
    if (!this.messageBus['connected']) {
      await this.messageBus.connect();
    }
    
    // Subscribe to messages
    await this.messageBus.subscribe(this.id, this.handleMessage.bind(this));
    
    // Register with orchestrator
    await this.registerWithOrchestrator();
    
    // Start processing queue
    this.startQueueProcessor();
    
    console.log(`✅ Vector Embedding Agent ${this.id} started`);
  }

  protected async onStop(): Promise<void> {
    console.log('⏹️ Stopping Vector Embedding Agent...');
    
    this.isProcessing = false;
    
    // Deregister from orchestrator
    await this.deregisterFromOrchestrator();
    
    // Unsubscribe from message bus
    await this.messageBus.unsubscribe(this.id);
    
    console.log('✅ Vector Embedding Agent stopped');
  }

  protected async onHandleMessage(message: AgentMessage): Promise<AgentMessage | void> {
    try {
      switch (message.type) {
        case 'EMBEDDING_REQUEST':
          return await this.handleEmbeddingRequest(message.payload as EmbeddingRequest);
          
        case 'SEARCH_REQUEST':
          return await this.handleSearchRequest(message.payload as SearchRequest);
          
        case 'FILE_UPLOADED':
          return await this.handleFileUploaded(message.payload as any);
          
        case 'FILE_DELETED':
          return await this.handleFileDeleted(message.payload as any);
          
        case 'HEALTH_CHECK':
          return await this.handleHealthCheck();
          
        default:
          console.log(`Unhandled message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      throw error;
    }
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    await this.messageBus.sendMessage(message);
  }

  protected async onConfigUpdate(config: Partial<AgentConfig>): Promise<void> {
    // Handle configuration updates
    console.log('Config updated:', config);
  }

  private async registerWithOrchestrator(): Promise<void> {
    const config = this.config as VectorEmbeddingConfig;
    
    try {
      const message: AgentMessage = {
        id: this.generateMessageId(),
        type: 'AGENT_REGISTERED',
        source: this.id,
        target: this.orchestratorId,
        payload: {
          agentId: this.id,
          type: this.type,
          version: this.version,
          capabilities: ['embeddings', 'vector-search', 'semantic-search'],
          config: {
            vectorDimensions: config.vectorConfig.dimensions,
            batchSize: config.batchConfig.batchSize,
            supportedModels: await this.modelManager!.getAvailableModels()
          }
        },
        timestamp: Date.now(),
        priority: 'normal'
      };
      
      await this.messageBus.sendMessage(message);
      console.log(`🎯 Registered with orchestrator: ${this.orchestratorId}`);
      
    } catch (error) {
      console.error('Failed to register with orchestrator:', error);
      throw error;
    }
  }

  private async deregisterFromOrchestrator(): Promise<void> {
    try {
      const message: AgentMessage = {
        id: this.generateMessageId(),
        type: 'AGENT_DEREGISTERED',
        source: this.id,
        target: this.orchestratorId,
        payload: {
          agentId: this.id
        },
        timestamp: Date.now(),
        priority: 'normal'
      };
      
      await this.messageBus.sendMessage(message);
    } catch (error) {
      console.error('Failed to deregister from orchestrator:', error);
    }
  }

  private async handleEmbeddingRequest(request: EmbeddingRequest): Promise<AgentMessage> {
    try {
      console.log(`📥 Processing embedding request for file: ${request.fileId}`);
      
      // Add to queue for batch processing
      this.embeddingQueue.set(request.requestId, request);
      this.incrementMetric('embedding_requests_queued');
      
      return {
        id: this.generateMessageId(),
        type: 'EMBEDDING_REQUEST_QUEUED',
        source: this.id,
        target: '*',
        payload: {
          requestId: request.requestId,
          queuePosition: this.embeddingQueue.size,
          estimatedProcessingTime: this.embeddingQueue.size * 1000 // rough estimate
        },
        timestamp: Date.now(),
        priority: 'normal'
      };
      
    } catch (error) {
      console.error('Error handling embedding request:', error);
      throw error;
    }
  }

  private async handleSearchRequest(request: SearchRequest): Promise<AgentMessage> {
    try {
      console.log(`🔍 Processing search request: "${request.query}"`);
      
      if (!this.searchHandler) {
        throw new Error('Search handler not initialized');
      }
      
      const searchResponse = await this.searchHandler.search({
        query: request.query,
        topK: request.topK || 10,
        threshold: request.threshold,
        filters: request.filters
      });
      
      return {
        id: this.generateMessageId(),
        type: 'SEARCH_RESPONSE',
        source: this.id,
        target: '*',
        payload: {
          requestId: request.requestId,
          results: searchResponse.results,
          stats: searchResponse.stats,
          suggestions: searchResponse.suggestions,
          query: searchResponse.query
        },
        timestamp: Date.now(),
        priority: 'normal'
      };
      
    } catch (error) {
      console.error('Error handling search request:', error);
      throw error;
    }
  }

  private async handleFileUploaded(payload: any): Promise<AgentMessage | void> {
    console.log(`📄 File uploaded: ${payload.fileId}`);
    
    // File will be processed automatically via embedding requests
    // This is just a notification
  }

  private async handleFileDeleted(payload: any): Promise<AgentMessage | void> {
    console.log(`🗑️ File deleted: ${payload.fileId}`);
    
    try {
      if (this.vectorStore) {
        const removedCount = await this.vectorStore.removeByFileId(payload.fileId);
        console.log(`Removed ${removedCount} vectors for deleted file: ${payload.fileId}`);
      }
    } catch (error) {
      console.error('Error removing vectors for deleted file:', error);
    }
  }

  private async handleHealthCheck(): Promise<AgentMessage> {
    const health = await this.getHealth();
    const vectorStats = await this.vectorStore?.getStats();
    const modelStats = await this.modelManager?.getStats();
    
    return {
      id: this.generateMessageId(),
      type: 'HEALTH_RESPONSE',
      source: this.id,
      target: '*',
      payload: {
        health,
        vectorStats,
        modelStats,
        queueSize: this.embeddingQueue.size,
        isProcessing: this.isProcessing
      },
      timestamp: Date.now(),
      priority: 'normal'
    };
  }

  private startQueueProcessor(): void {
    const processQueue = async () => {
      if (!this.isProcessing && this.embeddingQueue.size > 0) {
        this.isProcessing = true;
        
        try {
          await this.processBatch();
        } catch (error) {
          console.error('Error processing batch:', error);
        } finally {
          this.isProcessing = false;
        }
      }
    };
    
    // Process queue every 5 seconds
    setInterval(processQueue, 5000);
  }

  private async processBatch(): Promise<void> {
    if (!this.modelManager || !this.vectorStore) {
      console.error('Required components not initialized');
      return;
    }

    const config = this.config as VectorEmbeddingConfig;
    const batchSize = Math.min(config.batchConfig.batchSize, this.embeddingQueue.size);
    
    if (batchSize === 0) return;
    
    console.log(`📦 Processing batch of ${batchSize} embedding requests...`);
    const startTime = Date.now();
    
    // Get batch of requests
    const requests = Array.from(this.embeddingQueue.values()).slice(0, batchSize);
    
    for (const request of requests) {
      try {
        // Generate embeddings for all chunks
        const embeddings = [];
        
        for (const chunk of request.chunks) {
          const embedding = await this.modelManager.generateEmbedding(chunk.content);
          embeddings.push({
            chunkId: chunk.chunkId,
            vector: embedding,
            content: chunk.content,
            metadata: chunk.metadata
          });
        }
        
        // Store in vector store
        await this.vectorStore.addEmbeddings(embeddings, request.fileId);
        
        // Send completion message
        await this.messageBus.sendMessage({
          id: this.generateMessageId(),
          type: 'EMBEDDING_COMPLETED',
          source: this.id,
          target: '*',
          payload: {
            requestId: request.requestId,
            fileId: request.fileId,
            embeddingsCount: embeddings.length,
            processingTime: Date.now() - startTime
          },
          timestamp: Date.now(),
          priority: 'normal'
        });
        
        // Remove from queue
        this.embeddingQueue.delete(request.requestId);
        this.incrementMetric('embedding_requests_processed');
        
      } catch (error) {
        console.error(`Error processing embedding request ${request.requestId}:`, error);
        
        // Send error message
        await this.messageBus.sendMessage({
          id: this.generateMessageId(),
          type: 'EMBEDDING_FAILED',
          source: this.id,
          target: '*',
          payload: {
            requestId: request.requestId,
            fileId: request.fileId,
            error: (error as Error).message
          },
          timestamp: Date.now(),
          priority: 'high'
        });
        
        // Remove from queue
        this.embeddingQueue.delete(request.requestId);
        this.incrementMetric('embedding_requests_failed');
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Batch processing completed in ${processingTime}ms`);
  }

  private generateMessageId(): string {
    return `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for testing and monitoring
  public async getStats(): Promise<any> {
    const baseHealth = await this.getHealth();
    const vectorStats = await this.vectorStore?.getStats();
    const modelStats = await this.modelManager?.getStats();
    
    return {
      ...baseHealth,
      vectorStats,
      modelStats,
      queueSize: this.embeddingQueue.size,
      isProcessing: this.isProcessing
    };
  }

  public get isRunning(): boolean {
    return this.status === 'ready';
  }
}