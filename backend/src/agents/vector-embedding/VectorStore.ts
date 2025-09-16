import * as fs from 'fs/promises';
import * as path from 'path';
import { HierarchicalNSW } from 'hnswlib-node';
// @ts-ignore - better-sqlite3 types compatibility
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface VectorStoreConfig {
  dimensions: number;
  similarityThreshold: number;
  indexType: 'hnsw' | 'flat';
  efConstruction?: number;
  efSearch?: number;
  maxElements?: number;
}

export interface StorageConfig {
  vectorStorePath: string;
  metadataStorePath: string;
  enablePersistence: boolean;
  compressionLevel: number;
}

export interface VectorEntry {
  id: string;
  chunkId: string;
  fileId: string;
  vector: number[];
  content: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface SearchResult {
  chunkId: string;
  fileId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  distance: number;
}

export interface VectorStoreStats {
  totalVectors: number;
  totalFiles: number;
  indexSize: number;
  memoryUsage: number;
  searchesPerformed: number;
  averageSearchTime: number;
  lastOptimization: number;
}

export class VectorStore {
  private vectorConfig: VectorStoreConfig;
  private storageConfig: StorageConfig;
  private index: HierarchicalNSW | null = null;
  private metadataDb: Database.Database | null = null;
  private vectorMap: Map<number, VectorEntry> = new Map();
  private nextId: number = 0;
  private isInitialized: boolean = false;
  private searchCount: number = 0;
  private totalSearchTime: number = 0;
  private lastOptimization: number = 0;

  constructor(vectorConfig: VectorStoreConfig, storageConfig: StorageConfig) {
    this.vectorConfig = vectorConfig;
    this.storageConfig = storageConfig;
  }

  async initialize(): Promise<void> {
    console.log('🗄️ Initializing Vector Store...');
    
    // Create necessary directories
    await this.ensureDirectories();
    
    // Initialize metadata database
    await this.initializeDatabase();
    
    // Initialize vector index
    await this.initializeIndex();
    
    // Load existing data if persistence is enabled
    if (this.storageConfig.enablePersistence) {
      await this.loadPersistedData();
    }
    
    this.isInitialized = true;
    console.log(`✅ Vector Store initialized with ${this.vectorMap.size} vectors`);
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      path.dirname(this.storageConfig.vectorStorePath),
      path.dirname(this.storageConfig.metadataStorePath)
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  private async initializeDatabase(): Promise<void> {
    this.metadataDb = new Database(this.storageConfig.metadataStorePath);
    
    // Create tables
    this.metadataDb.exec(`
      CREATE TABLE IF NOT EXISTS vectors (
        id INTEGER PRIMARY KEY,
        chunk_id TEXT UNIQUE NOT NULL,
        file_id TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_file_id ON vectors(file_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON vectors(timestamp);
      
      CREATE TABLE IF NOT EXISTS search_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT,
        search_time INTEGER,
        results_count INTEGER,
        timestamp INTEGER
      );
    `);
    
    console.log('📊 Metadata database initialized');
  }

  private async initializeIndex(): Promise<void> {
    const maxElements = this.vectorConfig.maxElements || 100000;
    
    this.index = new HierarchicalNSW('cosine', this.vectorConfig.dimensions);
    this.index.initIndex(
      maxElements,
      this.vectorConfig.efConstruction || 200,
      200, // M parameter for HNSW
      Math.floor(Math.random() * 100) // Random seed
    );
    
    // Set search parameters
    this.index.setEf(this.vectorConfig.efSearch || 50);
    
    console.log(`🔍 HNSW index initialized: ${this.vectorConfig.dimensions}D, max=${maxElements}`);
  }

  private async loadPersistedData(): Promise<void> {
    if (!this.metadataDb) return;
    
    console.log('📥 Loading persisted vectors...');
    
    const stmt = this.metadataDb.prepare(`
      SELECT id, chunk_id, file_id, content, metadata, timestamp
      FROM vectors
      ORDER BY id
    `);
    
    const rows = stmt.all() as any[];
    let loadedCount = 0;
    
    for (const row of rows) {
      const vectorEntry: VectorEntry = {
        id: uuidv4(),
        chunkId: row.chunk_id,
        fileId: row.file_id,
        vector: [], // Will be loaded from index if available
        content: row.content,
        metadata: JSON.parse(row.metadata),
        timestamp: row.timestamp
      };
      
      this.vectorMap.set(row.id, vectorEntry);
      this.nextId = Math.max(this.nextId, row.id + 1);
      loadedCount++;
    }
    
    // Try to load the vector index
    try {
      if (await this.fileExists(this.storageConfig.vectorStorePath)) {
        (this.index as any).loadIndex(this.storageConfig.vectorStorePath);
        console.log(`📥 Loaded vector index with ${loadedCount} vectors`);
      }
    } catch (error) {
      console.warn('Failed to load vector index, will rebuild:', error);
      // Index will be rebuilt as vectors are added
    }
    
    console.log(`✅ Loaded ${loadedCount} persisted vectors`);
  }

  async addEmbeddings(embeddings: Array<{
    chunkId: string;
    vector: number[];
    content: string;
    metadata: Record<string, unknown>;
  }>, fileId: string): Promise<void> {
    if (!this.isInitialized || !this.index || !this.metadataDb) {
      throw new Error('Vector store not initialized');
    }

    console.log(`➕ Adding ${embeddings.length} embeddings for file: ${fileId}`);
    const startTime = Date.now();

    const insertStmt = this.metadataDb.prepare(`
      INSERT OR REPLACE INTO vectors (id, chunk_id, file_id, content, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.metadataDb.transaction(() => {
      for (const embedding of embeddings) {
        const id = this.nextId++;
        const timestamp = Date.now();
        
        const vectorEntry: VectorEntry = {
          id: uuidv4(),
          chunkId: embedding.chunkId,
          fileId,
          vector: embedding.vector,
          content: embedding.content,
          metadata: embedding.metadata,
          timestamp
        };

        // Add to HNSW index
        this.index!.addPoint(embedding.vector, id);
        
        // Store in memory map
        this.vectorMap.set(id, vectorEntry);
        
        // Store in database
        insertStmt.run(
          id,
          embedding.chunkId,
          fileId,
          embedding.content,
          JSON.stringify(embedding.metadata),
          timestamp
        );
      }
    });

    transaction();
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Added ${embeddings.length} vectors in ${processingTime}ms`);
    
    // Auto-save if persistence is enabled
    if (this.storageConfig.enablePersistence) {
      await this.save();
    }
  }

  async search(
    queryVector: number[],
    topK: number,
    threshold?: number,
    filters?: Record<string, unknown>
  ): Promise<SearchResult[]> {
    if (!this.isInitialized || !this.index) {
      throw new Error('Vector store not initialized');
    }

    const startTime = Date.now();
    
    // Perform similarity search
    const searchResults = this.index.searchKnn(queryVector, Math.min(topK * 2, 100)); // Get more candidates for filtering
    
    const results: SearchResult[] = [];
    const actualThreshold = threshold || this.vectorConfig.similarityThreshold;
    
    for (const result of searchResults.neighbors) {
      const vectorEntry = this.vectorMap.get(result);
      
      if (!vectorEntry) {
        continue; // Skip if vector entry not found
      }
      
      const similarity = 1 - searchResults.distances[searchResults.neighbors.indexOf(result)];
      
      // Apply similarity threshold
      if (similarity < actualThreshold) {
        continue;
      }
      
      // Apply filters if provided
      if (filters && !this.matchesFilters(vectorEntry, filters)) {
        continue;
      }
      
      results.push({
        chunkId: vectorEntry.chunkId,
        fileId: vectorEntry.fileId,
        content: vectorEntry.content,
        score: similarity,
        metadata: vectorEntry.metadata,
        distance: searchResults.distances[searchResults.neighbors.indexOf(result)]
      });
      
      if (results.length >= topK) {
        break;
      }
    }
    
    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);
    
    const searchTime = Date.now() - startTime;
    this.updateSearchStats(searchTime, results.length);
    
    console.log(`🔍 Search completed: ${results.length} results in ${searchTime}ms (threshold: ${actualThreshold})`);
    
    return results.slice(0, topK);
  }

  async findSimilar(fileId?: string, chunkId?: string, topK: number = 5): Promise<SearchResult[]> {
    if (!fileId && !chunkId) {
      throw new Error('Either fileId or chunkId must be provided');
    }

    // Find the reference vector
    let referenceVector: VectorEntry | undefined;
    
    Array.from(this.vectorMap.entries()).forEach(([, vectorEntry]) => {
      if ((fileId && vectorEntry.fileId === fileId) || 
          (chunkId && vectorEntry.chunkId === chunkId)) {
        referenceVector = vectorEntry;
      }
    });

    if (!referenceVector) {
      return [];
    }

    // Search for similar vectors
    return this.search(referenceVector.vector, topK + 1, 0.1) // Lower threshold for similarity
      .then(results => results.filter(r => r.chunkId !== referenceVector!.chunkId)); // Exclude self
  }

  async removeByFileId(fileId: string): Promise<number> {
    if (!this.metadataDb) {
      throw new Error('Vector store not initialized');
    }

    console.log(`🗑️ Removing vectors for file: ${fileId}`);
    
    // Find vectors to remove
    const vectorsToRemove: number[] = [];
    
    Array.from(this.vectorMap.entries()).forEach(([id, vectorEntry]) => {
      if (vectorEntry.fileId === fileId) {
        vectorsToRemove.push(id);
      }
    });
    
    // Remove from memory map
    for (const id of vectorsToRemove) {
      this.vectorMap.delete(id);
    }
    
    // Remove from database
    const deleteStmt = this.metadataDb.prepare('DELETE FROM vectors WHERE file_id = ?');
    const result = deleteStmt.run(fileId);
    
    console.log(`✅ Removed ${vectorsToRemove.length} vectors for file: ${fileId}`);
    
    return result.changes || 0;
  }

  async optimize(): Promise<void> {
    if (!this.index) {
      throw new Error('Vector store not initialized');
    }

    console.log('🔧 Optimizing vector index...');
    const startTime = Date.now();
    
    // Rebuild index for better performance
    const vectors: Array<{ vector: number[], id: number }> = [];
    
    Array.from(this.vectorMap.entries()).forEach(([id, vectorEntry]) => {
      vectors.push({ vector: vectorEntry.vector, id });
    });
    
    // Create new optimized index
    const maxElements = Math.max(this.vectorConfig.maxElements || 100000, vectors.length * 2);
    
    this.index = new HierarchicalNSW('cosine', this.vectorConfig.dimensions);
    this.index.initIndex(maxElements, this.vectorConfig.efConstruction || 200, 200);
    this.index.setEf(this.vectorConfig.efSearch || 50);
    
    // Re-add all vectors
    for (const { vector, id } of vectors) {
      this.index.addPoint(vector, id);
    }
    
    this.lastOptimization = Date.now();
    const optimizationTime = this.lastOptimization - startTime;
    
    console.log(`✅ Index optimization completed in ${optimizationTime}ms`);
  }

  async save(): Promise<void> {
    if (!this.storageConfig.enablePersistence || !this.index) {
      return;
    }

    console.log('💾 Saving vector store to disk...');
    const startTime = Date.now();
    
    try {
      // Save vector index
      this.index.writeIndex(this.storageConfig.vectorStorePath);
      
      // Database is automatically persisted with better-sqlite3
      
      const saveTime = Date.now() - startTime;
      console.log(`✅ Vector store saved in ${saveTime}ms`);
      
    } catch (error) {
      console.error('Failed to save vector store:', error);
      throw error;
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    const memoryUsage = this.estimateMemoryUsage();
    
    return {
      totalVectors: this.vectorMap.size,
      totalFiles: new Set(Array.from(this.vectorMap.values()).map(v => v.fileId)).size,
      indexSize: this.vectorMap.size,
      memoryUsage,
      searchesPerformed: this.searchCount,
      averageSearchTime: this.searchCount > 0 ? this.totalSearchTime / this.searchCount : 0,
      lastOptimization: this.lastOptimization
    };
  }

  async clear(): Promise<void> {
    if (!this.metadataDb) return;
    
    console.log('🧹 Clearing vector store...');
    
    // Clear memory structures
    this.vectorMap.clear();
    this.nextId = 0;
    
    // Clear database
    this.metadataDb.exec('DELETE FROM vectors');
    this.metadataDb.exec('DELETE FROM search_stats');
    
    // Reinitialize index
    await this.initializeIndex();
    
    // Reset stats
    this.searchCount = 0;
    this.totalSearchTime = 0;
    this.lastOptimization = 0;
    
    console.log('✅ Vector store cleared');
  }

  private matchesFilters(vectorEntry: VectorEntry, filters: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      const metadataValue = vectorEntry.metadata[key];
      
      if (metadataValue !== value) {
        return false;
      }
    }
    
    return true;
  }

  private updateSearchStats(searchTime: number, resultsCount: number): void {
    this.searchCount++;
    this.totalSearchTime += searchTime;
    
    // Store in database for analytics (optional)
    if (this.metadataDb && this.searchCount % 10 === 0) { // Store every 10th search
      const stmt = this.metadataDb.prepare(`
        INSERT INTO search_stats (query_hash, search_time, results_count, timestamp)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run('unknown', searchTime, resultsCount, Date.now());
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation in MB
    const vectorCount = this.vectorMap.size;
    const dimensions = this.vectorConfig.dimensions;
    
    // Each vector: dimensions * 4 bytes (float32) + metadata overhead
    const vectorMemory = vectorCount * dimensions * 4;
    const metadataMemory = vectorCount * 1000; // Rough estimate for metadata
    const indexMemory = vectorCount * 50; // HNSW index overhead
    
    return Math.round((vectorMemory + metadataMemory + indexMemory) / 1024 / 1024);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Getters for external access
  get totalVectors(): number {
    return this.vectorMap.size;
  }

  get dimensions(): number {
    return this.vectorConfig.dimensions;
  }

  get isReady(): boolean {
    return this.isInitialized && this.index !== null;
  }
}