#!/usr/bin/env node

/**
 * Simple API server for Grahmos AI Search frontend
 * Provides search endpoints with lightweight GPT OSS model integration
 */

import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EmbeddingModelManager } from './agents/vector-embedding/EmbeddingModelManager.js';
import { FileIndexer } from './services/FileIndexer.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure lightweight model - GPT OSS equivalent
const modelConfig = {
  defaultModel: 'Xenova/all-MiniLM-L6-v2', // Lightweight GPT OSS equivalent
  modelSelectionStrategy: 'auto' as const,
  cacheModels: true,
  maxConcurrentModels: 2
};

let modelManager: EmbeddingModelManager;
let fileIndexer: FileIndexer;
let isModelReady = false;
let isIndexReady = false;

// Get test-files directory path (relative to current directory)
const testFilesDir = path.resolve(process.cwd(), '../test-files');
console.log('📂 Test files directory:', testFilesDir);


// Middleware
app.use(cors());
app.use(express.json());

// Initialize model manager and file indexer
async function initializeModels() {
  try {
    console.log('🤖 Initializing lightweight AI models...');
    modelManager = new EmbeddingModelManager(modelConfig);
    await modelManager.initialize();
    isModelReady = true;
    console.log('✅ Models initialized successfully');
    
    // Initialize file indexer
    console.log('🗂️ Initializing file indexer...');
    fileIndexer = new FileIndexer(modelManager, [testFilesDir]);
    await fileIndexer.initialize();
    isIndexReady = true;
    console.log('✅ File indexer initialized successfully');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    isModelReady = false;
    isIndexReady = false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = isIndexReady ? fileIndexer.getStats() : null;
  res.json({
    status: 'healthy',
    modelReady: isModelReady,
    indexReady: isIndexReady,
    model: modelConfig.defaultModel,
    indexStats: stats,
    timestamp: new Date().toISOString()
  });
});

// Get available models
app.get('/api/models', (req, res) => {
  res.json({
    models: [
      'Xenova/all-MiniLM-L6-v2',  // Default lightweight model
      'Xenova/all-MiniLM-L12-v2',
      'Xenova/all-mpnet-base-v2'
    ],
    defaultModel: modelConfig.defaultModel
  });
});


// Initialize model endpoint
app.post('/api/models/initialize', async (req, res) => {
  try {
    const { model, warmup } = req.body;
    
    if (!isModelReady) {
      await initializeModels();
    }

    // Warmup model if requested
    if (warmup && modelManager) {
      await modelManager.generateEmbedding('test warmup query', model);
    }

    res.json({
      success: true,
      model: model || modelConfig.defaultModel,
      status: 'initialized'
    });
  } catch (error) {
    console.error('Model initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize model'
    });
  }
});

// Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query, filters, sortBy, sortOrder, model, limit } = req.body;
    const startTime = Date.now();

    console.log(`🔍 Search request: "${query}" using ${model || modelConfig.defaultModel}`);

    // If indexer is not ready, fall back to mock data or return error
    if (!isIndexReady || !fileIndexer) {
      console.warn('⚠️ File indexer not ready, using fallback');
      
      // Simple fallback response
      const fallbackResults = [{
        id: 'fallback-1',
        title: 'File Indexer Not Ready',
        content: 'The file indexer is still initializing. Please try again in a moment.',
        type: 'system',
        path: '/system/status',
        size: 0,
        lastModified: new Date().toISOString(),
        relevanceScore: 1.0
      }];
      
      return res.json({
        results: fallbackResults,
        totalResults: fallbackResults.length,
        processingTime: Date.now() - startTime,
        model: model || modelConfig.defaultModel,
        query,
        filters: filters || {},
        timestamp: new Date().toISOString(),
        indexReady: false
      });
    }

    // Use real file indexer search
    const searchOptions = {
      query,
      filters: {
        type: filters?.type,
        dateRange: filters?.dateRange,
        sizeRange: filters?.sizeRange
      },
      sortBy: sortBy || 'relevance',
      sortOrder: sortOrder || 'desc',
      limit: limit || 50
    };

    const searchResult = await fileIndexer.search(searchOptions);

    // Format results for frontend compatibility
    const formattedResults = searchResult.results.map(file => ({
      id: file.id,
      title: file.title,
      content: file.content.substring(0, 500) + (file.content.length > 500 ? '...' : ''), // Truncate for display
      type: file.type,
      path: file.path,
      size: file.size,
      lastModified: file.lastModified,
      relevanceScore: file.relevanceScore || 0,
      metadata: file.metadata,
      chunks: file.chunks?.length || 0
    }));

    const totalProcessingTime = Date.now() - startTime;

    res.json({
      results: formattedResults,
      totalResults: searchResult.totalResults,
      processingTime: totalProcessingTime,
      searchTime: searchResult.processingTime,
      model: model || modelConfig.defaultModel,
      query,
      filters: filters || {},
      timestamp: new Date().toISOString(),
      indexReady: true
    });

    console.log(`✅ Real search completed in ${totalProcessingTime}ms (${searchResult.processingTime}ms search), returned ${formattedResults.length}/${searchResult.totalResults} results`);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Start server
async function startServer() {
  try {
    // Initialize models first
    await initializeModels();
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Grahmos AI Search API Server running on port ${PORT}`);
      console.log(`📊 Model: ${modelConfig.defaultModel}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Search endpoint: http://localhost:${PORT}/api/search`);
      console.log('✅ Ready to handle search requests!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  if (modelManager) {
    await modelManager.cleanup();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  if (modelManager) {
    await modelManager.cleanup();
  }
  process.exit(0);
});

// Start the server
startServer();

export { app };