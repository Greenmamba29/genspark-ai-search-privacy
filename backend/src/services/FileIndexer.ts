import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EmbeddingModelManager } from '../agents/vector-embedding/EmbeddingModelManager.js';
import ContentExtractorFactory from '../agents/file-processing/extractors/ContentExtractorFactory.js';
import chokidar from 'chokidar';

export interface IndexedFile {
  id: string;
  title: string;
  content: string;
  type: string;
  path: string;
  size: number;
  lastModified: string;
  relevanceScore?: number;
  embedding?: number[];
  metadata: Record<string, any>;
  chunks: ContentChunk[];
}

export interface ContentChunk {
  id: string;
  content: string;
  embedding?: number[];
  startIndex: number;
  endIndex: number;
}

export interface SearchOptions {
  query: string;
  filters?: {
    type?: string[];
    dateRange?: { start: string; end: string };
    sizeRange?: { min: number; max: number };
  };
  sortBy?: 'relevance' | 'date' | 'size' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export class FileIndexer {
  private files: Map<string, IndexedFile> = new Map();
  private modelManager: EmbeddingModelManager;
  private extractorFactory: ContentExtractorFactory;
  private watchDirectories: string[] = [];
  private watchers: chokidar.FSWatcher[] = [];
  private chunkSize = 1000;
  private chunkOverlap = 200;

  constructor(
    modelManager: EmbeddingModelManager,
    watchDirectories: string[] = []
  ) {
    this.modelManager = modelManager;
    this.extractorFactory = new ContentExtractorFactory();
    this.watchDirectories = watchDirectories;
  }

  /**
   * Initialize the file indexer and start watching directories
   */
  async initialize(): Promise<void> {
    console.log('🗂️  Initializing FileIndexer...');
    
    // Index existing files
    for (const directory of this.watchDirectories) {
      await this.scanDirectory(directory);
    }

    // Start watching for changes
    await this.startFileWatching();
    
    console.log(`✅ FileIndexer initialized with ${this.files.size} files indexed`);
  }

  /**
   * Scan a directory and index all supported files
   */
  async scanDirectory(directoryPath: string): Promise<void> {
    try {
      console.log(`📂 Scanning directory: ${directoryPath}`);
      
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);
        
        if (entry.isFile()) {
          await this.indexFile(fullPath);
        } else if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await this.scanDirectory(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning directory ${directoryPath}:`, error);
    }
  }

  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<IndexedFile | null> {
    try {
      const startTime = Date.now();
      
      // Check if extractor is available for this file
      const extractor = this.extractorFactory.getExtractor(filePath);
      if (!extractor) {
        console.log(`⚠️  No extractor available for: ${filePath}`);
        return null;
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Extract content
      console.log(`📄 Processing file: ${path.basename(filePath)}`);
      const extractionResult = await this.extractorFactory.extractContent(filePath);
      
      // Create chunks
      const chunks = this.createChunks(extractionResult.content);
      
      // Generate embeddings for chunks
      for (const chunk of chunks) {
        try {
          chunk.embedding = await this.modelManager.generateEmbedding(chunk.content);
        } catch (error) {
          console.warn(`⚠️  Failed to generate embedding for chunk in ${filePath}:`, error);
        }
      }

      // Generate main embedding (first chunk or full content if short)
      const mainContent = extractionResult.content.length <= this.chunkSize 
        ? extractionResult.content 
        : chunks[0]?.content || extractionResult.content.substring(0, this.chunkSize);
      
      const mainEmbedding = await this.modelManager.generateEmbedding(mainContent);

      // Determine file type
      const fileType = this.determineFileType(filePath, extractionResult.content);

      // Create indexed file
      const indexedFile: IndexedFile = {
        id: uuidv4(),
        title: this.extractTitle(filePath, extractionResult.content),
        content: extractionResult.content,
        type: fileType,
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        embedding: mainEmbedding,
        metadata: {
          ...extractionResult.metadata,
          documentStructure: extractionResult.documentStructure,
          modelSelected: extractionResult.modelSelected,
          processingTime: extractionResult.processingTime,
          wordCount: extractionResult.wordCount,
          pageCount: extractionResult.pageCount,
          language: extractionResult.language
        },
        chunks
      };

      // Store in index
      this.files.set(filePath, indexedFile);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Indexed ${path.basename(filePath)} in ${processingTime}ms (${chunks.length} chunks)`);
      
      return indexedFile;
      
    } catch (error) {
      console.error(`❌ Failed to index file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Search indexed files using semantic similarity
   */
  async search(options: SearchOptions): Promise<{
    results: IndexedFile[];
    totalResults: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.modelManager.generateEmbedding(options.query);
      
      // Get all files and calculate similarity
      let results: (IndexedFile & { relevanceScore: number })[] = [];
      
      for (const file of this.files.values()) {
        if (!file.embedding) continue;
        
        // Calculate similarity with main file embedding
        const mainSimilarity = this.calculateCosineSimilarity(queryEmbedding, file.embedding);
        
        // Also check chunk similarities for better matching
        let maxChunkSimilarity = 0;
        for (const chunk of file.chunks) {
          if (chunk.embedding) {
            const chunkSimilarity = this.calculateCosineSimilarity(queryEmbedding, chunk.embedding);
            maxChunkSimilarity = Math.max(maxChunkSimilarity, chunkSimilarity);
          }
        }
        
        // Use the better of main or chunk similarity
        const relevanceScore = Math.max(mainSimilarity, maxChunkSimilarity);
        
        // Also include keyword matching as fallback
        const keywordScore = this.calculateKeywordSimilarity(options.query, file.content, file.title);
        const finalScore = Math.max(relevanceScore, keywordScore * 0.7); // Weight semantic higher
        
        results.push({
          ...file,
          relevanceScore: finalScore
        });
      }
      
      // Apply filters
      if (options.filters?.type && options.filters.type.length > 0) {
        results = results.filter(file => 
          options.filters!.type!.includes(file.type)
        );
      }
      
      if (options.filters?.dateRange) {
        const { start, end } = options.filters.dateRange;
        results = results.filter(file => {
          const fileDate = new Date(file.lastModified);
          return fileDate >= new Date(start) && fileDate <= new Date(end);
        });
      }
      
      if (options.filters?.sizeRange) {
        const { min, max } = options.filters.sizeRange;
        results = results.filter(file => 
          file.size >= min && file.size <= max
        );
      }
      
      // Sort results
      results.sort((a, b) => {
        switch (options.sortBy || 'relevance') {
          case 'relevance':
            return (options.sortOrder === 'asc' ? 1 : -1) * (b.relevanceScore - a.relevanceScore);
          case 'date':
            const dateA = new Date(a.lastModified).getTime();
            const dateB = new Date(b.lastModified).getTime();
            return (options.sortOrder === 'asc' ? 1 : -1) * (dateB - dateA);
          case 'size':
            return (options.sortOrder === 'asc' ? 1 : -1) * (b.size - a.size);
          case 'name':
            return (options.sortOrder === 'asc' ? 1 : -1) * b.title.localeCompare(a.title);
          default:
            return b.relevanceScore - a.relevanceScore;
        }
      });
      
      // Apply limit
      const limit = options.limit || 50;
      const limitedResults = results.slice(0, limit);
      
      const processingTime = Date.now() - startTime;
      
      return {
        results: limitedResults,
        totalResults: results.length,
        processingTime
      };
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Start watching directories for file changes
   */
  private async startFileWatching(): Promise<void> {
    for (const directory of this.watchDirectories) {
      console.log(`👀 Starting to watch directory: ${directory}`);
      
      const watcher = chokidar.watch(directory, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true // we already scanned initially
      });

      watcher
        .on('add', async (filePath) => {
          console.log(`📁 New file detected: ${filePath}`);
          await this.indexFile(filePath);
        })
        .on('change', async (filePath) => {
          console.log(`📝 File changed: ${filePath}`);
          await this.indexFile(filePath); // Re-index changed file
        })
        .on('unlink', (filePath) => {
          console.log(`🗑️  File removed: ${filePath}`);
          this.files.delete(filePath);
        });

      this.watchers.push(watcher);
    }
  }

  /**
   * Create text chunks for better search granularity
   */
  private createChunks(content: string): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    
    if (content.length <= this.chunkSize) {
      // Content is small enough, create single chunk
      chunks.push({
        id: uuidv4(),
        content: content.trim(),
        startIndex: 0,
        endIndex: content.length
      });
      return chunks;
    }
    
    // Split into overlapping chunks
    let startIndex = 0;
    let chunkIndex = 0;
    
    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, content.length);
      const chunkContent = content.substring(startIndex, endIndex).trim();
      
      if (chunkContent.length > 0) {
        chunks.push({
          id: `${uuidv4()}-${chunkIndex}`,
          content: chunkContent,
          startIndex,
          endIndex
        });
      }
      
      // Move start index forward, accounting for overlap
      startIndex += this.chunkSize - this.chunkOverlap;
      chunkIndex++;
    }
    
    return chunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += (a[i] || 0) * (b[i] || 0);
      normA += (a[i] || 0) * (a[i] || 0);
      normB += (b[i] || 0) * (b[i] || 0);
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Simple keyword-based similarity for fallback
   */
  private calculateKeywordSimilarity(query: string, content: string, title: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = (content + ' ' + title).toLowerCase();
    
    let matches = 0;
    for (const word of queryWords) {
      if (word.length > 2 && contentWords.includes(word)) {
        matches++;
      }
    }
    
    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  /**
   * Determine file type based on extension and content
   */
  private determineFileType(filePath: string, content: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const typeMap: Record<string, string> = {
      '.pdf': 'document',
      '.doc': 'document',
      '.docx': 'document',
      '.txt': 'document',
      '.md': 'document',
      '.html': 'document',
      '.htm': 'document',
      '.rtf': 'document',
      '.csv': 'data',
      '.xlsx': 'data',
      '.xls': 'data',
      '.json': 'data',
      '.xml': 'data',
      '.js': 'code',
      '.ts': 'code',
      '.py': 'code',
      '.java': 'code',
      '.cpp': 'code',
      '.c': 'code',
      '.go': 'code',
      '.rs': 'code',
      '.php': 'code',
      '.rb': 'code',
      '.swift': 'code',
      '.kt': 'code',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.bmp': 'image',
      '.svg': 'image',
      '.mp4': 'video',
      '.avi': 'video',
      '.mov': 'video',
      '.wmv': 'video',
      '.mp3': 'audio',
      '.wav': 'audio',
      '.flac': 'audio'
    };
    
    return typeMap[ext] || 'other';
  }

  /**
   * Extract a meaningful title from file path and content
   */
  private extractTitle(filePath: string, content: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Try to extract title from content
    const lines = content.split('\n').slice(0, 10); // Look at first 10 lines
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Markdown heading
      if (trimmed.match(/^#+\s+(.+)$/)) {
        return trimmed.replace(/^#+\s+/, '');
      }
      
      // HTML title
      if (trimmed.match(/<title>(.+)<\/title>/i)) {
        return trimmed.replace(/<\/?title>/gi, '');
      }
      
      // First significant line
      if (trimmed.length > 10 && trimmed.length < 100 && !trimmed.includes('```')) {
        return trimmed;
      }
    }
    
    // Fallback to filename with better formatting
    return fileName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get current index statistics
   */
  getStats(): {
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    lastIndexed: string | null;
  } {
    const files = Array.from(this.files.values());
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    const fileTypes: Record<string, number> = {};
    files.forEach(file => {
      fileTypes[file.type] = (fileTypes[file.type] || 0) + 1;
    });
    
    const lastIndexed = files.length > 0 
      ? Math.max(...files.map(f => new Date(f.lastModified).getTime()))
      : null;
    
    return {
      totalFiles: files.length,
      totalSize,
      fileTypes,
      lastIndexed: lastIndexed ? new Date(lastIndexed).toISOString() : null
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up FileIndexer...');
    
    // Close file watchers
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    
    this.watchers = [];
    this.files.clear();
    
    console.log('✅ FileIndexer cleanup complete');
  }
}