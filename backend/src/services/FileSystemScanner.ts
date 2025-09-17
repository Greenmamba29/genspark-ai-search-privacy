/**
 * File System Scanner Service
 * Scans test-files directory and maintains an index of available files
 * Part of P1.1: Real File Indexing implementation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createLogger } from '../shared/utils/logger.js';

const logger = createLogger('FileSystemScanner');

export interface FileIndexEntry {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  type: 'document' | 'code' | 'data' | 'config';
  extension: string;
  size: number;
  lastModified: Date;
  contentHash: string;
  isIndexed: boolean;
  indexedAt?: Date;
  content?: string; // Extracted text content
  metadata: Record<string, any>;
}

export interface ScanOptions {
  includeContent?: boolean;
  forceRescan?: boolean;
  maxFileSize?: number; // bytes
  supportedExtensions?: string[];
}

export class FileSystemScanner {
  private baseDirectory: string;
  private fileIndex: Map<string, FileIndexEntry> = new Map();
  private isInitialized = false;

  // Default supported file types for MVP
  private readonly DEFAULT_EXTENSIONS = [
    '.txt', '.md', '.json', '.csv', '.py', '.js', '.ts', 
    '.java', '.cpp', '.html', '.xml', '.yaml', '.yml'
    // Note: PDF, DOCX support will be added in content extraction phase
  ];

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit for MVP

  constructor(baseDirectory: string) {
    this.baseDirectory = path.resolve(baseDirectory);
    logger.info('FileSystemScanner initialized', { baseDirectory: this.baseDirectory });
  }

  /**
   * Initialize the scanner and perform initial scan
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Scanner already initialized');
      return;
    }

    try {
      // Verify base directory exists
      const stats = await fs.stat(this.baseDirectory);
      if (!stats.isDirectory()) {
        throw new Error(`Base path is not a directory: ${this.baseDirectory}`);
      }

      logger.info('Starting initial file system scan...');
      await this.scanDirectory();
      
      this.isInitialized = true;
      logger.info(`File system scan completed`, {
        totalFiles: this.fileIndex.size,
        indexedFiles: Array.from(this.fileIndex.values()).filter(f => f.isIndexed).length
      });

    } catch (error) {
      logger.error('Failed to initialize FileSystemScanner', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Scan directory and update file index
   */
  async scanDirectory(options: ScanOptions = {}): Promise<FileIndexEntry[]> {
    const {
      includeContent = true,
      forceRescan = false,
      maxFileSize = this.MAX_FILE_SIZE,
      supportedExtensions = this.DEFAULT_EXTENSIONS
    } = options;

    const newFiles: FileIndexEntry[] = [];
    
    try {
      const entries = await this.scanDirectoryRecursive(
        this.baseDirectory, 
        '', 
        supportedExtensions,
        maxFileSize
      );

      for (const entry of entries) {
        const existingEntry = this.fileIndex.get(entry.id);
        
        // Check if file needs updating
        if (!existingEntry || forceRescan || 
            existingEntry.contentHash !== entry.contentHash ||
            existingEntry.lastModified.getTime() !== entry.lastModified.getTime()) {
          
          // Extract content if requested and file is text-based
          if (includeContent && this.isTextFile(entry.extension)) {
            try {
              entry.content = await this.extractTextContent(entry.path);
              entry.isIndexed = true;
              entry.indexedAt = new Date();
            } catch (error) {
              logger.warn(`Failed to extract content from ${entry.relativePath}`, {
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              entry.isIndexed = false;
            }
          }

          this.fileIndex.set(entry.id, entry);
          newFiles.push(entry);
        }
      }

      // Remove entries for files that no longer exist
      const currentPaths = new Set(entries.map(e => e.path));
      for (const [id, entry] of this.fileIndex) {
        if (!currentPaths.has(entry.path)) {
          this.fileIndex.delete(id);
          logger.info(`Removed deleted file from index: ${entry.relativePath}`);
        }
      }

      logger.info(`Scan completed`, {
        totalFiles: entries.length,
        newFiles: newFiles.length,
        indexSize: this.fileIndex.size
      });

      return newFiles;
    } catch (error) {
      logger.error('Directory scan failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get all indexed files
   */
  getIndexedFiles(): FileIndexEntry[] {
    return Array.from(this.fileIndex.values()).filter(f => f.isIndexed);
  }

  /**
   * Get all files (indexed and unindexed)
   */
  getAllFiles(): FileIndexEntry[] {
    return Array.from(this.fileIndex.values());
  }

  /**
   * Get file by ID
   */
  getFileById(id: string): FileIndexEntry | undefined {
    return this.fileIndex.get(id);
  }

  /**
   * Search files by content (simple text search for MVP)
   */
  searchFiles(query: string, options: { 
    limit?: number, 
    type?: string[], 
    includeUnindexed?: boolean 
  } = {}): FileIndexEntry[] {
    const { limit = 50, type = [], includeUnindexed = false } = options;
    const queryLower = query.toLowerCase();
    
    let files = includeUnindexed ? this.getAllFiles() : this.getIndexedFiles();
    
    // Filter by type
    if (type.length > 0) {
      files = files.filter(f => type.includes(f.type));
    }
    
    // Simple text search in content and metadata
    const results = files.filter(file => {
      const searchableText = [
        file.name,
        file.content || '',
        JSON.stringify(file.metadata)
      ].join(' ').toLowerCase();
      
      return searchableText.includes(queryLower);
    });

    // Sort by relevance (simple scoring for MVP)
    results.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, queryLower);
      const scoreB = this.calculateRelevanceScore(b, queryLower);
      return scoreB - scoreA;
    });

    return results.slice(0, limit);
  }

  /**
   * Get file statistics
   */
  getStatistics() {
    const files = this.getAllFiles();
    const indexedFiles = files.filter(f => f.isIndexed);
    
    const typeStats = files.reduce((acc, file) => {
      acc[file.type] = (acc[file.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const extensionStats = files.reduce((acc, file) => {
      acc[file.extension] = (acc[file.extension] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFiles: files.length,
      indexedFiles: indexedFiles.length,
      unindexedFiles: files.length - indexedFiles.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      typeBreakdown: typeStats,
      extensionBreakdown: extensionStats,
      lastScanTime: new Date().toISOString()
    };
  }

  // Private helper methods

  private async scanDirectoryRecursive(
    dirPath: string, 
    relativePath: string, 
    supportedExtensions: string[],
    maxFileSize: number
  ): Promise<FileIndexEntry[]> {
    const files: FileIndexEntry[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const currentRelativePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip hidden directories and common ignore patterns
          if (entry.name.startsWith('.') || 
              ['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
            continue;
          }
          
          // Recursively scan subdirectory
          const subFiles = await this.scanDirectoryRecursive(
            fullPath, 
            currentRelativePath, 
            supportedExtensions,
            maxFileSize
          );
          files.push(...subFiles);
          
        } else if (entry.isFile()) {
          const extension = path.extname(entry.name).toLowerCase();
          
          // Check if file type is supported
          if (!supportedExtensions.includes(extension)) {
            continue;
          }
          
          const stats = await fs.stat(fullPath);
          
          // Check file size limit
          if (stats.size > maxFileSize) {
            logger.warn(`Skipping large file: ${currentRelativePath}`, { 
              size: stats.size, 
              maxSize: maxFileSize 
            });
            continue;
          }
          
          // Generate content hash for change detection
          const contentHash = await this.generateFileHash(fullPath);
          
          const fileEntry: FileIndexEntry = {
            id: contentHash, // Use hash as unique ID
            name: entry.name,
            path: fullPath,
            relativePath: currentRelativePath,
            type: this.determineFileType(extension),
            extension,
            size: stats.size,
            lastModified: stats.mtime,
            contentHash,
            isIndexed: false,
            metadata: {
              basename: path.basename(entry.name, extension),
              directory: path.dirname(currentRelativePath) || '.',
              created: stats.birthtime,
              accessed: stats.atime
            }
          };
          
          files.push(fileEntry);
        }
      }
    } catch (error) {
      logger.error(`Failed to scan directory: ${dirPath}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
    
    return files;
  }

  private async extractTextContent(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      logger.error(`Failed to read file content: ${filePath}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async generateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      logger.error(`Failed to generate hash for: ${filePath}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Fallback to path-based hash
      return crypto.createHash('md5').update(filePath).digest('hex');
    }
  }

  private determineFileType(extension: string): FileIndexEntry['type'] {
    const docExtensions = ['.txt', '.md', '.html', '.xml'];
    const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs'];
    const dataExtensions = ['.csv', '.json', '.yaml', '.yml'];
    const configExtensions = ['.json', '.yaml', '.yml', '.xml'];

    if (codeExtensions.includes(extension)) return 'code';
    if (dataExtensions.includes(extension)) return 'data';
    if (configExtensions.includes(extension)) return 'config';
    return 'document'; // default
  }

  private isTextFile(extension: string): boolean {
    const textExtensions = [
      '.txt', '.md', '.json', '.csv', '.py', '.js', '.ts', '.java', 
      '.cpp', '.html', '.xml', '.yaml', '.yml', '.go', '.rs', '.c'
    ];
    return textExtensions.includes(extension);
  }

  private calculateRelevanceScore(file: FileIndexEntry, queryLower: string): number {
    let score = 0;
    
    // Title match gets highest score
    if (file.name.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Content match gets medium score
    if (file.content && file.content.toLowerCase().includes(queryLower)) {
      score += 5;
      // Boost score for multiple matches
      const matches = (file.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
      score += Math.min(matches - 1, 5); // Cap bonus at 5
    }
    
    // Recent files get small boost
    const daysSinceModified = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 2 - daysSinceModified * 0.1);
    
    return score;
  }
}