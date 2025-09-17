#!/usr/bin/env node

/**
 * Simple API server for Grahmos AI Search frontend
 * Provides search endpoints with lightweight GPT OSS model integration
 */

import express from 'express';
import cors from 'cors';
import { EmbeddingModelManager } from './agents/vector-embedding/EmbeddingModelManager.js';

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
let isModelReady = false;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize model manager
async function initializeModels() {
  try {
    console.log('🤖 Initializing lightweight AI models...');
    modelManager = new EmbeddingModelManager(modelConfig);
    await modelManager.initialize();
    isModelReady = true;
    console.log('✅ Models initialized successfully');
  } catch (error) {
    console.error('❌ Model initialization failed:', error);
    isModelReady = false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    modelReady: isModelReady,
    model: modelConfig.defaultModel,
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
    const { query, filters, sortBy, sortOrder, model } = req.body;
    const startTime = Date.now();

    console.log(`🔍 Search request: "${query}" using ${model || modelConfig.defaultModel}`);

    // Mock search results with AI model processing
    const mockResults = [
      {
        id: '1',
        title: 'Machine Learning Fundamentals',
        content: 'Introduction to machine learning algorithms and their applications in modern AI systems...',
        type: 'document',
        path: '/documents/ml-fundamentals.pdf',
        size: 2048000,
        lastModified: new Date('2024-01-15').toISOString(),
        relevanceScore: 0.95
      },
      {
        id: '2',
        title: 'Neural Networks Deep Dive',
        content: 'Comprehensive guide to understanding neural networks, backpropagation, and deep learning architectures...',
        type: 'document',
        path: '/documents/neural-networks.md',
        size: 1536000,
        lastModified: new Date('2024-02-01').toISOString(),
        relevanceScore: 0.88
      },
      {
        id: '3',
        title: 'AI Search Implementation',
        content: 'Code examples and implementation details for building AI-powered search systems...',
        type: 'code',
        path: '/code/ai-search.py',
        size: 256000,
        lastModified: new Date('2024-02-10').toISOString(),
        relevanceScore: 0.82
      },
      {
        id: '4',
        title: 'Data Processing Pipeline',
        content: 'Automated data processing pipeline for handling large-scale document collections...',
        type: 'document',
        path: '/documents/data-pipeline.docx',
        size: 1024000,
        lastModified: new Date('2024-01-28').toISOString(),
        relevanceScore: 0.75
      },
      {
        id: '5',
        title: 'Vector Embeddings Guide',
        content: 'Understanding vector embeddings and their role in semantic search applications...',
        type: 'document',
        path: '/documents/vector-embeddings.pdf',
        size: 1792000,
        lastModified: new Date('2024-02-05').toISOString(),
        relevanceScore: 0.71
      }
    ];

    // Filter results based on query relevance
    const queryLower = query.toLowerCase();
    let filteredResults = mockResults.filter(result => 
      result.title.toLowerCase().includes(queryLower) ||
      result.content.toLowerCase().includes(queryLower)
    );

    // If no specific matches, return all results
    if (filteredResults.length === 0) {
      filteredResults = mockResults;
    }

    // Apply filters
    if (filters?.type && filters.type.length > 0) {
      filteredResults = filteredResults.filter(result => 
        filters.type.includes(result.type)
      );
    }

    // Apply sorting
    filteredResults.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return sortOrder === 'asc' ? 
            a.relevanceScore - b.relevanceScore : 
            b.relevanceScore - a.relevanceScore;
        case 'date':
          return sortOrder === 'asc' ? 
            new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime() : 
            new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        case 'size':
          return sortOrder === 'asc' ? 
            a.size - b.size : 
            b.size - a.size;
        case 'name':
          return sortOrder === 'asc' ? 
            a.title.localeCompare(b.title) : 
            b.title.localeCompare(a.title);
        default:
          return b.relevanceScore - a.relevanceScore;
      }
    });

    // Generate embeddings if model is ready (for demonstration)
    if (isModelReady && modelManager) {
      try {
        const embedding = await modelManager.generateEmbedding(query);
        console.log(`📊 Generated ${embedding.length}-dimensional embedding`);
      } catch (error) {
        console.warn('⚠️ Embedding generation failed:', error);
      }
    }

    const processingTime = Date.now() - startTime;

    res.json({
      results: filteredResults,
      totalResults: filteredResults.length,
      processingTime,
      model: model || modelConfig.defaultModel,
      query,
      filters: filters || {},
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Search completed in ${processingTime}ms, returned ${filteredResults.length} results`);

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