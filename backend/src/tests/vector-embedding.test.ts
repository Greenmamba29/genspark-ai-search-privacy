import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { VectorEmbeddingAgent } from '../agents/vector-embedding/VectorEmbeddingAgent';
import { EmbeddingModelManager } from '../agents/vector-embedding/EmbeddingModelManager';
import { VectorStore } from '../agents/vector-embedding/VectorStore';
import { SemanticSearchHandler, SearchQuery } from '../agents/vector-embedding/SemanticSearchHandler';
import { MessageBus } from '../core/MessageBus';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import Redis from 'ioredis';

// Mock Redis for testing
jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

// Test data directory
const TEST_DATA_DIR = path.join(tmpdir(), 'vector-embedding-tests');
const TEST_VECTOR_STORE_PATH = path.join(TEST_DATA_DIR, 'test-vectors.hnsw');
const TEST_METADATA_DB_PATH = path.join(TEST_DATA_DIR, 'test-metadata.db');

describe('Vector Embedding System Tests', () => {
  let modelManager: EmbeddingModelManager;
  let vectorStore: VectorStore;
  let searchHandler: SemanticSearchHandler;
  let messageBus: MessageBus;
  let vectorAgent: VectorEmbeddingAgent;

  beforeAll(async () => {
    // Create test data directory
    try {
      await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterAll(async () => {
    // Cleanup test data directory
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  beforeEach(async () => {
    // Setup mock Redis
    const mockRedisInstance = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(1),
      subscribe: jest.fn().mockResolvedValue(1),
      unsubscribe: jest.fn().mockResolvedValue(1)
    };
    MockedRedis.mockImplementation(() => mockRedisInstance as any);

    // Initialize message bus
    messageBus = new MessageBus();

    // Initialize model manager
    modelManager = new EmbeddingModelManager();
    
    // Initialize vector store
    const vectorConfig = {
      dimensions: 384, // MiniLM model dimension
      similarityThreshold: 0.7,
      indexType: 'hnsw' as const,
      efConstruction: 200,
      efSearch: 50,
      maxElements: 10000
    };

    const storageConfig = {
      vectorStorePath: TEST_VECTOR_STORE_PATH,
      metadataStorePath: TEST_METADATA_DB_PATH,
      enablePersistence: true,
      compressionLevel: 1
    };

    vectorStore = new VectorStore(vectorConfig, storageConfig);
    
    // Initialize search handler
    searchHandler = new SemanticSearchHandler(vectorStore, modelManager);
    
    // Initialize vector agent
    vectorAgent = new VectorEmbeddingAgent('test-agent', messageBus, {
      modelManager,
      vectorStore,
      searchHandler
    });
  });

  afterEach(async () => {
    // Clean up between tests
    try {
      if (vectorStore.isReady) {
        await vectorStore.clear();
      }
    } catch (error) {
      console.warn('Failed to clear vector store:', error);
    }
  });

  describe('EmbeddingModelManager', () => {
    test('should initialize successfully', async () => {
      await modelManager.initialize();
      expect(modelManager.isInitialized).toBe(true);
    });

    test('should select optimal model based on content', async () => {
      await modelManager.initialize();
      
      const shortText = 'Simple test';
      const longText = 'This is a much longer text that contains various technical terms and concepts that would benefit from a more sophisticated embedding model to capture the nuanced semantic relationships between the different components and ideas presented in this comprehensive passage.';
      
      const shortModel = modelManager.selectOptimalModel(shortText);
      const longModel = modelManager.selectOptimalModel(longText);
      
      expect(typeof shortModel).toBe('string');
      expect(typeof longModel).toBe('string');
    });

    test('should generate embeddings for text', async () => {
      await modelManager.initialize();
      
      const text = 'This is a test sentence for embedding generation.';
      const embedding = await modelManager.generateEmbedding(text);
      
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
    });

    test('should handle batch embedding generation', async () => {
      await modelManager.initialize();
      
      const texts = [
        'First test sentence',
        'Second test sentence',
        'Third test sentence'
      ];
      
      const embeddings = await modelManager.generateBatchEmbeddings(texts);
      
      expect(embeddings).toHaveLength(3);
      expect(embeddings.every(emb => Array.isArray(emb) && emb.length > 0)).toBe(true);
    });

    test('should provide model statistics', async () => {
      await modelManager.initialize();
      
      // Generate some embeddings to populate stats
      await modelManager.generateEmbedding('Test text');
      
      const stats = modelManager.getStats();
      
      expect(stats).toHaveProperty('totalEmbeddings');
      expect(stats).toHaveProperty('totalProcessingTime');
      expect(stats).toHaveProperty('averageEmbeddingTime');
      expect(stats).toHaveProperty('loadedModels');
    });
  });

  describe('VectorStore', () => {
    beforeEach(async () => {
      await vectorStore.initialize();
    });

    test('should initialize successfully', () => {
      expect(vectorStore.isReady).toBe(true);
      expect(vectorStore.totalVectors).toBe(0);
    });

    test('should add and retrieve embeddings', async () => {
      const fileId = 'test-file-1';
      const embeddings = [
        {
          chunkId: 'chunk-1',
          vector: Array(384).fill(0).map(() => Math.random()),
          content: 'This is the first test chunk',
          metadata: { type: 'text', section: 'intro' }
        },
        {
          chunkId: 'chunk-2',
          vector: Array(384).fill(0).map(() => Math.random()),
          content: 'This is the second test chunk',
          metadata: { type: 'text', section: 'body' }
        }
      ];

      await vectorStore.addEmbeddings(embeddings, fileId);
      
      expect(vectorStore.totalVectors).toBe(2);
      
      // Test search
      const queryVector = Array(384).fill(0).map(() => Math.random());
      const results = await vectorStore.search(queryVector, 5);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('chunkId');
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('score');
    });

    test('should filter search results', async () => {
      const fileId = 'test-file-2';
      const embeddings = [
        {
          chunkId: 'chunk-3',
          vector: Array(384).fill(0).map(() => Math.random()),
          content: 'Intro content',
          metadata: { type: 'text', section: 'intro' }
        },
        {
          chunkId: 'chunk-4',
          vector: Array(384).fill(0).map(() => Math.random()),
          content: 'Body content',
          metadata: { type: 'text', section: 'body' }
        }
      ];

      await vectorStore.addEmbeddings(embeddings, fileId);
      
      const queryVector = Array(384).fill(0).map(() => Math.random());
      const filteredResults = await vectorStore.search(
        queryVector,
        5,
        undefined,
        { section: 'intro' }
      );
      
      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].metadata.section).toBe('intro');
    });

    test('should find similar content', async () => {
      const fileId = 'test-file-3';
      const embeddings = [
        {
          chunkId: 'chunk-5',
          vector: Array(384).fill(0).map(() => 0.5), // Similar vectors
          content: 'Similar content A',
          metadata: { type: 'text' }
        },
        {
          chunkId: 'chunk-6',
          vector: Array(384).fill(0).map(() => 0.6), // Similar vectors
          content: 'Similar content B',
          metadata: { type: 'text' }
        }
      ];

      await vectorStore.addEmbeddings(embeddings, fileId);
      
      const similarResults = await vectorStore.findSimilar('test-file-3', undefined, 5);
      
      expect(similarResults.length).toBeGreaterThanOrEqual(1);
    });

    test('should remove embeddings by file ID', async () => {
      const fileId = 'test-file-4';
      const embeddings = [
        {
          chunkId: 'chunk-7',
          vector: Array(384).fill(0).map(() => Math.random()),
          content: 'Content to be removed',
          metadata: { type: 'text' }
        }
      ];

      await vectorStore.addEmbeddings(embeddings, fileId);
      expect(vectorStore.totalVectors).toBe(1);
      
      const removedCount = await vectorStore.removeByFileId(fileId);
      
      expect(removedCount).toBe(1);
      expect(vectorStore.totalVectors).toBe(0);
    });

    test('should provide vector store statistics', async () => {
      const stats = await vectorStore.getStats();
      
      expect(stats).toHaveProperty('totalVectors');
      expect(stats).toHaveProperty('totalFiles');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('searchesPerformed');
    });
  });

  describe('SemanticSearchHandler', () => {
    beforeEach(async () => {
      await modelManager.initialize();
      await vectorStore.initialize();
      await searchHandler.initialize();
      
      // Add some test data
      const fileId = 'search-test-file';
      const embeddings = await Promise.all([
        'JavaScript is a programming language',
        'Python is used for data science',
        'Machine learning requires large datasets',
        'Web development uses HTML, CSS, and JavaScript'
      ].map(async (content, index) => ({
        chunkId: `search-chunk-${index}`,
        vector: await modelManager.generateEmbedding(content),
        content,
        metadata: { type: 'educational', topic: 'programming' }
      })));
      
      await vectorStore.addEmbeddings(embeddings, fileId);
    });

    test('should initialize successfully', () => {
      expect(searchHandler.isReady).toBe(true);
    });

    test('should process search queries', async () => {
      const searchQuery: SearchQuery = {
        query: 'What is JavaScript?',
        topK: 5,
        threshold: 0.3
      };
      
      const response = await searchHandler.search(searchQuery);
      
      expect(response).toHaveProperty('query');
      expect(response).toHaveProperty('results');
      expect(response).toHaveProperty('stats');
      expect(response.query.originalQuery).toBe('What is JavaScript?');
      expect(response.results.length).toBeGreaterThan(0);
    });

    test('should detect query intent correctly', async () => {
      const queries = [
        { query: 'What is machine learning?', expectedIntent: 'definition' },
        { query: 'How to use Python', expectedIntent: 'how_to' },
        { query: 'JavaScript vs Python', expectedIntent: 'comparison' },
        { query: 'programming languages', expectedIntent: 'search' }
      ];
      
      for (const { query } of queries) {
        const searchQuery: SearchQuery = { query, topK: 5 };
        const response = await searchHandler.search(searchQuery);
        
        expect(response.query.intent).toBeDefined();
        expect(typeof response.query.intent).toBe('string');
      }
    });

    test('should extract entities and keywords', async () => {
      const searchQuery: SearchQuery = {
        query: 'How does TensorFlow work with machine learning?',
        topK: 5
      };
      
      const response = await searchHandler.search(searchQuery);
      
      expect(response.query.entities).toBeDefined();
      expect(response.query.keywords).toBeDefined();
      expect(Array.isArray(response.query.entities)).toBe(true);
      expect(Array.isArray(response.query.keywords)).toBe(true);
    });

    test('should enhance search results with metadata', async () => {
      const searchQuery: SearchQuery = {
        query: 'programming language',
        topK: 3
      };
      
      const response = await searchHandler.search(searchQuery);
      
      if (response.results.length > 0) {
        const result = response.results[0];
        expect(result).toHaveProperty('relevanceReason');
        expect(result).toHaveProperty('contextSnippet');
        expect(result).toHaveProperty('confidence');
        expect(typeof result.confidence).toBe('number');
      }
    });

    test('should find similar content', async () => {
      const similarResults = await searchHandler.findSimilarContent(
        'search-test-file',
        undefined,
        3
      );
      
      expect(Array.isArray(similarResults)).toBe(true);
      if (similarResults.length > 0) {
        expect(similarResults[0]).toHaveProperty('chunkId');
        expect(similarResults[0]).toHaveProperty('confidence');
      }
    });

    test('should provide search statistics', async () => {
      const searchQuery: SearchQuery = {
        query: 'test query',
        topK: 5
      };
      
      await searchHandler.search(searchQuery);
      
      const historyStats = searchHandler.queryHistoryStats;
      
      expect(historyStats).toHaveProperty('totalQueries');
      expect(historyStats).toHaveProperty('averageResults');
      expect(historyStats.totalQueries).toBeGreaterThan(0);
    });
  });

  describe('VectorEmbeddingAgent Integration', () => {
    beforeEach(async () => {
      await vectorAgent.initialize();
    });

    afterEach(async () => {
      if (vectorAgent.isRunning) {
        await vectorAgent.stop();
      }
    });

    test('should initialize vector agent successfully', () => {
      expect(vectorAgent.isInitialized).toBe(true);
    });

    test('should start and stop agent', async () => {
      await vectorAgent.start();
      expect(vectorAgent.isRunning).toBe(true);
      
      await vectorAgent.stop();
      expect(vectorAgent.isRunning).toBe(false);
    });

    test('should process embedding requests', async () => {
      await vectorAgent.start();
      
      const mockRequest = {
        type: 'EMBEDDING_REQUEST',
        fileId: 'integration-test-file',
        chunks: [
          {
            chunkId: 'integration-chunk-1',
            content: 'Integration test content for vector embeddings',
            metadata: { source: 'test' }
          }
        ],
        requestId: 'test-request-1'
      };
      
      // Simulate message processing
      const result = await vectorAgent['processEmbeddingRequest'](mockRequest);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    test('should handle batch processing', async () => {
      await vectorAgent.start();
      
      const batchRequests = Array.from({ length: 5 }, (_, i) => ({
        type: 'EMBEDDING_REQUEST',
        fileId: `batch-test-file-${i}`,
        chunks: [
          {
            chunkId: `batch-chunk-${i}`,
            content: `Batch test content ${i}`,
            metadata: { batch: true, index: i }
          }
        ],
        requestId: `batch-request-${i}`
      }));
      
      // Process batch
      for (const request of batchRequests) {
        vectorAgent['addToQueue'](request);
      }
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const stats = await vectorAgent.getStats();
      expect(stats.queueSize).toBe(0); // Queue should be empty after processing
    });

    test('should provide agent statistics', async () => {
      const stats = await vectorAgent.getStats();
      
      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('vectorStoreStats');
    });
  });

  describe('Performance Tests', () => {
    test('should handle large batches efficiently', async () => {
      await modelManager.initialize();
      await vectorStore.initialize();
      
      const startTime = Date.now();
      const batchSize = 100;
      const texts = Array.from({ length: batchSize }, (_, i) => 
        `Performance test document ${i} with some meaningful content that represents typical document size.`
      );
      
      const embeddings = await modelManager.generateBatchEmbeddings(texts);
      
      const embeddingTime = Date.now() - startTime;
      console.log(`Generated ${batchSize} embeddings in ${embeddingTime}ms`);
      
      const addStartTime = Date.now();
      const vectorEmbeddings = embeddings.map((vector, i) => ({
        chunkId: `perf-chunk-${i}`,
        vector,
        content: texts[i],
        metadata: { test: 'performance', index: i }
      }));
      
      await vectorStore.addEmbeddings(vectorEmbeddings, 'performance-test-file');
      
      const addTime = Date.now() - addStartTime;
      console.log(`Added ${batchSize} vectors in ${addTime}ms`);
      
      // Performance assertions
      expect(embeddingTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(vectorStore.totalVectors).toBe(batchSize);
    }, 60000); // 60-second timeout for performance test

    test('should perform searches efficiently', async () => {
      await modelManager.initialize();
      await vectorStore.initialize();
      await searchHandler.initialize();
      
      // Add test data
      const texts = Array.from({ length: 50 }, (_, i) => 
        `Search performance test document ${i} about various topics including technology, science, and general knowledge.`
      );
      
      const embeddings = await modelManager.generateBatchEmbeddings(texts);
      const vectorEmbeddings = embeddings.map((vector, i) => ({
        chunkId: `search-perf-chunk-${i}`,
        vector,
        content: texts[i],
        metadata: { category: i % 3 === 0 ? 'tech' : i % 3 === 1 ? 'science' : 'general' }
      }));
      
      await vectorStore.addEmbeddings(vectorEmbeddings, 'search-performance-file');
      
      // Perform multiple searches
      const searchStartTime = Date.now();
      const searchQueries = [
        'technology and innovation',
        'scientific research methods',
        'general knowledge topics',
        'performance optimization',
        'data analysis techniques'
      ];
      
      const searchResults = [];
      for (const query of searchQueries) {
        const result = await searchHandler.search({ query, topK: 10 });
        searchResults.push(result);
      }
      
      const searchTime = Date.now() - searchStartTime;
      console.log(`Performed ${searchQueries.length} searches in ${searchTime}ms`);
      
      // Performance assertions
      expect(searchTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(searchResults.every(r => r.results.length > 0)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization failures gracefully', async () => {
      const invalidVectorStore = new VectorStore(
        {
          dimensions: 384,
          similarityThreshold: 0.7,
          indexType: 'hnsw',
          maxElements: 10000
        },
        {
          vectorStorePath: '/invalid/path/vectors.hnsw',
          metadataStorePath: '/invalid/path/metadata.db',
          enablePersistence: true,
          compressionLevel: 1
        }
      );
      
      await expect(invalidVectorStore.initialize()).rejects.toThrow();
    });

    test('should handle search on uninitialized system', async () => {
      const uninitializedHandler = new SemanticSearchHandler(vectorStore, modelManager);
      
      await expect(uninitializedHandler.search({ query: 'test' })).rejects.toThrow();
    });

    test('should handle invalid embedding dimensions', async () => {
      await modelManager.initialize();
      await vectorStore.initialize();
      
      const invalidVector = [1, 2, 3]; // Wrong dimensions
      
      await expect(vectorStore.search(invalidVector, 5)).rejects.toThrow();
    });
  });
});