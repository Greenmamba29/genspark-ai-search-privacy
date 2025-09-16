import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import chokidar from 'chokidar';
import { BaseAgent } from '@/shared/interfaces/BaseAgent.js';
import { MessageBus } from '@/shared/communication/MessageBus.js';
import ContentExtractorFactory, {
  type ExtractionOptions,
  type ExtractionResult
} from './extractors/ContentExtractorFactory.js';
import { PrivacyManager } from '../../services/SimStudioIntegration.js';
import { ModelRegistry } from '../../ai/ModelRegistry.js';
import { SyncEngine } from '../../sync/SyncEngine.js';
import type {
  AgentMessage,
  AgentConfig,
  FileItem,
  ExtractedContent,
  ContentChunk,
  FileMetadata,
} from '@/shared/types/index.js';

// Enhanced types for privacy-aware processing
export interface PrivacyAwareFileItem extends FileItem {
  privacyLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
  privacyTags?: string[];
  modelRecommendation?: string;
}

export interface PrivacyAwareExtractedContent extends ExtractedContent {
  privacyClassification?: {
    level: 'public' | 'internal' | 'confidential' | 'restricted';
    confidence: number;
    tags: string[];
    reasoning: string;
  };
  selectedModel?: string;
  processingFlags?: {
    requiresSecureProcessing: boolean;
    allowCloudProcessing: boolean;
    localOnly: boolean;
  };
}

export interface FileProcessingConfig extends AgentConfig {
  messageBusConfig: {
    redisUrl: string;
    channelPrefix: string;
    requestTimeout: number;
    maxRetries: number;
  };
  watchDirectories: string[];
  maxFileSize: number; // in bytes
  supportedExtensions: string[];
  chunkSize: number; // characters per chunk
  chunkOverlap: number; // overlap between chunks
  extractionOptions?: ExtractionOptions; // Enhanced extraction options
  defaultPersona?: string; // Default persona for model selection
  qualityThreshold?: number; // Minimum confidence threshold
}

export class FileProcessingAgent extends BaseAgent {
  private messageBus: MessageBus;
  private orchestratorId: string = 'master-orchestrator';
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private processingQueue: Set<string> = new Set();
  private contentExtractorFactory: ContentExtractorFactory;
  
  // SimStudio services
  private privacyManager: PrivacyManager;
  private modelRegistry: ModelRegistry;
  private syncEngine: SyncEngine;
  
  constructor(config: FileProcessingConfig) {
    super(config);
    this.messageBus = new MessageBus(config.messageBusConfig);
    this.contentExtractorFactory = new ContentExtractorFactory();
    
    // Initialize SimStudio services
    this.privacyManager = new PrivacyManager();
    this.modelRegistry = new ModelRegistry();
    this.syncEngine = new SyncEngine();
  }

  protected async onInitialize(): Promise<void> {
    // Connect to message bus
    await this.messageBus.connect();
    
    // Subscribe to messages
    await this.messageBus.subscribe(this.id, this.handleMessage.bind(this));
    
    // Initialize SimStudio services
    await this.privacyManager.initialize();
    await this.modelRegistry.initialize();
    await this.syncEngine.initialize();
    
    console.log(`File Processing Agent ${this.id} initialized with SimStudio services`);
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
          'file-scanning',
          'content-extraction',
          'file-monitoring',
          'metadata-extraction',
          'content-chunking',
          'pdf-processing',
          'docx-processing',
          'auto-model-selection',
          'intelligent-content-analysis',
          'multi-format-support',
          'privacy-classification',
          'privacy-aware-processing',
          'local-model-support',
          'cloud-model-support',
          'sync-engine-integration',
          'offline-processing'
        ],
        endpoints: [],
        metadata: {
          description: 'Enhanced file processing agent with PDF/DOCX support and auto model selection',
          supportedFormats: [
            '.txt', '.md', '.pdf', '.docx', '.csv', '.xlsx', '.json', '.xml', '.html',
            '.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb'
          ],
          maxFileSize: (this.getConfig() as FileProcessingConfig).maxFileSize,
          autoModelSelection: true,
          intelligentContentAnalysis: true
        }
      });
      
      console.log('File Processing Agent registered successfully');
      
      // Start watching configured directories
      await this.startDirectoryWatching();
      
    } catch (error) {
      console.error('Failed to register File Processing Agent:', error);
      throw error;
    }
  }

  protected async onStop(): Promise<void> {
    // Stop all file watchers
    for (const [path, watcher] of this.watchers) {
      await watcher.close();
      console.log(`Stopped watching directory: ${path}`);
    }
    this.watchers.clear();
    
    // Unregister from orchestrator
    try {
      await this.messageBus.request(this.id, this.orchestratorId, {
        action: 'unregister-agent',
        agentId: this.id
      });
    } catch (error) {
      console.error('Failed to unregister File Processing Agent:', error);
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
        console.log(`File Processing Agent received ${message.type} message from ${message.source}`);
    }
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    await this.messageBus.sendMessage(message);
  }

  protected async onConfigUpdate(config: Partial<AgentConfig>): Promise<void> {
    console.log('File Processing Agent config updated:', config);
  }

  private async handleRequest(message: AgentMessage): Promise<AgentMessage> {
    const { payload } = message;
    
    try {
      switch (payload.action) {
        case 'scan-directory':
          return await this.handleScanDirectory(message);
        case 'process-file':
          return await this.handleProcessFile(message);
        case 'extract-content':
          return await this.handleExtractContent(message);
        case 'get-file-info':
          return await this.handleGetFileInfo(message);
        case 'get-processing-status':
          return await this.handleGetProcessingStatus(message);
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
      case 'system-startup':
        console.log('File Processing Agent: System startup detected');
        break;
      case 'system-shutdown':
        console.log('File Processing Agent: System shutdown detected');
        break;
      default:
        console.log(`File Processing Agent received event: ${payload.event}`);
    }
  }

  private async handleScanDirectory(message: AgentMessage): Promise<AgentMessage> {
    const { directoryPath, recursive = true, includeHidden = false } = message.payload as {
      directoryPath: string;
      recursive?: boolean;
      includeHidden?: boolean;
    };

    console.log(`Scanning directory: ${directoryPath}`);
    
    const files: FileItem[] = [];
    const startTime = Date.now();
    
    try {
      const scannedFiles = await this.scanDirectory(directoryPath, {
        recursive,
        includeHidden,
        supportedExtensions: (this.getConfig() as FileProcessingConfig).supportedExtensions
      });
      
      files.push(...scannedFiles);
      
      this.incrementMetric('directories_scanned');
      this.incrementMetric('files_discovered', files.length);
      
      const scanTime = Date.now() - startTime;
      console.log(`Directory scan completed: ${files.length} files found in ${scanTime}ms`);
      
      return {
        id: uuidv4(),
        type: 'response',
        source: this.id,
        target: message.source,
        payload: {
          success: true,
          files,
          statistics: {
            totalFiles: files.length,
            scanTimeMs: scanTime,
            directory: directoryPath
          }
        },
        timestamp: Date.now(),
        correlationId: message.correlationId || uuidv4(),
        priority: 'normal'
      };
    } catch (error) {
      throw new Error(`Failed to scan directory ${directoryPath}: ${(error as Error).message}`);
    }
  }

  private async handleProcessFile(message: AgentMessage): Promise<AgentMessage> {
    const { filePath } = message.payload as { filePath: string };
    
    console.log(`Processing file: ${filePath}`);
    
    try {
      const extractedContent = await this.processFile(filePath);
      
      this.incrementMetric('files_processed');
      
      return {
        id: uuidv4(),
        type: 'response',
        source: this.id,
        target: message.source,
        payload: {
          success: true,
          extractedContent
        },
        timestamp: Date.now(),
        correlationId: message.correlationId || uuidv4(),
        priority: 'normal'
      };
    } catch (error) {
      this.incrementMetric('files_failed');
      throw new Error(`Failed to process file ${filePath}: ${(error as Error).message}`);
    }
  }

  private async handleExtractContent(message: AgentMessage): Promise<AgentMessage> {
    const { filePath, extractionOptions = {} } = message.payload as {
      filePath: string;
      extractionOptions?: Record<string, unknown>;
    };
    
    try {
      const extractionResult = await this.extractFileContent(filePath, extractionOptions);
      
      return {
        id: uuidv4(),
        type: 'response',
        source: this.id,
        target: message.source,
        payload: {
          success: true,
          extractionResult
        },
        timestamp: Date.now(),
        correlationId: message.correlationId || uuidv4(),
        priority: 'normal'
      };
    } catch (error) {
      throw new Error(`Failed to extract content from ${filePath}: ${(error as Error).message}`);
    }
  }

  private async handleGetFileInfo(message: AgentMessage): Promise<AgentMessage> {
    const { filePath } = message.payload as { filePath: string };
    
    try {
      const fileInfo = await this.getFileInfo(filePath);
      
      return {
        id: uuidv4(),
        type: 'response',
        source: this.id,
        target: message.source,
        payload: {
          success: true,
          fileInfo
        },
        timestamp: Date.now(),
        correlationId: message.correlationId || uuidv4(),
        priority: 'normal'
      };
    } catch (error) {
      throw new Error(`Failed to get file info for ${filePath}: ${(error as Error).message}`);
    }
  }

  private async handleGetProcessingStatus(message: AgentMessage): Promise<AgentMessage> {
    const status = {
      queueSize: this.processingQueue.size,
      watchedDirectories: Array.from(this.watchers.keys()),
      supportedExtensions: this.getConfig().supportedExtensions,
      maxFileSize: this.getConfig().maxFileSize
    };

    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        status
      },
      timestamp: Date.now(),
        correlationId: message.correlationId || uuidv4(),
      priority: 'normal'
    };
  }

  private async startDirectoryWatching(): Promise<void> {
    const config = this.getConfig() as FileProcessingConfig;
    
    for (const directory of config.watchDirectories) {
      try {
        await this.startWatchingDirectory(directory);
        console.log(`Started watching directory: ${directory}`);
      } catch (error) {
        console.error(`Failed to watch directory ${directory}:`, error);
      }
    }
  }

  private async startWatchingDirectory(directoryPath: string): Promise<void> {
    if (this.watchers.has(directoryPath)) {
      console.warn(`Already watching directory: ${directoryPath}`);
      return;
    }

    const watcher = chokidar.watch(directoryPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      depth: 10 // limit recursive depth
    });

    watcher
      .on('add', (filePath) => this.handleFileAdded(filePath))
      .on('change', (filePath) => this.handleFileChanged(filePath))
      .on('unlink', (filePath) => this.handleFileDeleted(filePath))
      .on('error', (error) => console.error(`Watcher error for ${directoryPath}:`, error));

    this.watchers.set(directoryPath, watcher);
  }

  private async handleFileAdded(filePath: string): Promise<void> {
    console.log(`File added: ${filePath}`);
    this.incrementMetric('files_added');
    
    if (this.shouldProcessFile(filePath)) {
      await this.queueFileForProcessing(filePath, 'added');
    }
  }

  private async handleFileChanged(filePath: string): Promise<void> {
    console.log(`File changed: ${filePath}`);
    this.incrementMetric('files_changed');
    
    if (this.shouldProcessFile(filePath)) {
      await this.queueFileForProcessing(filePath, 'changed');
    }
  }

  private async handleFileDeleted(filePath: string): Promise<void> {
    console.log(`File deleted: ${filePath}`);
    this.incrementMetric('files_deleted');
    
    // Notify other agents about file deletion
    await this.messageBus.broadcast({
      event: 'file-deleted',
      filePath,
      agentId: this.id,
      timestamp: Date.now()
    }, this.id);
  }

  private shouldProcessFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    
    // Check if our enhanced factory can handle this file type
    const extractor = this.contentExtractorFactory.getExtractor(filePath);
    return extractor !== null;
  }

  private async queueFileForProcessing(filePath: string, changeType: 'added' | 'changed'): Promise<void> {
    if (this.processingQueue.has(filePath)) {
      console.log(`File already queued for processing: ${filePath}`);
      return;
    }

    this.processingQueue.add(filePath);
    
    try {
      const extractedContent = await this.processFile(filePath);
      
      // Broadcast file processed event
      await this.messageBus.broadcast({
        event: 'file-processed',
        filePath,
        changeType,
        extractedContent,
        agentId: this.id,
        timestamp: Date.now()
      }, this.id);
      
      this.incrementMetric('files_processed_automatically');
      
    } catch (error) {
      console.error(`Failed to process file ${filePath}:`, error);
      this.incrementMetric('files_failed_automatically');
    } finally {
      this.processingQueue.delete(filePath);
    }
  }

  private async scanDirectory(
    directoryPath: string,
    options: {
      recursive: boolean;
      includeHidden: boolean;
      supportedExtensions: string[];
    }
  ): Promise<FileItem[]> {
    const files: FileItem[] = [];
    
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }
        
        const fullPath = path.join(directoryPath, entry.name);
        
        if (entry.isDirectory() && options.recursive) {
          const subFiles = await this.scanDirectory(fullPath, options);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          
          if (options.supportedExtensions.includes(ext)) {
            const fileInfo = await this.getFileInfo(fullPath);
            files.push(fileInfo);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to scan directory ${directoryPath}: ${(error as Error).message}`);
    }
    
    return files;
  }

  private async getFileInfo(filePath: string): Promise<FileItem> {
    try {
      const stats = await fs.stat(filePath);
      const contentHash = await this.calculateFileHash(filePath);
      
      return {
        id: uuidv4(),
        path: filePath,
        name: path.basename(filePath),
        type: 'file',
        size: stats.size,
        extension: path.extname(filePath).toLowerCase(),
        mimeType: this.getMimeType(filePath) || 'application/octet-stream',
        lastModified: stats.mtime,
        created: stats.birthtime,
        metadata: {},
        contentHash,
        indexed: false
      };
    } catch (error) {
      throw new Error(`Failed to get file info for ${filePath}: ${(error as Error).message}`);
    }
  }

  private async processFile(filePath: string): Promise<PrivacyAwareExtractedContent> {
    console.log(`🔍 Privacy-aware processing file: ${path.basename(filePath)}`);
    
    const fileInfo = await this.getFileInfo(filePath) as PrivacyAwareFileItem;
    const config = this.getConfig() as FileProcessingConfig;
    
    // Check file size
    if (fileInfo.size > config.maxFileSize) {
      throw new Error(`File too large: ${fileInfo.size} bytes (max: ${config.maxFileSize})`);
    }
    
    // Step 1: Classify privacy level
    console.log(`🔐 Classifying privacy for: ${path.basename(filePath)}`);
    const privacyClassification = await this.privacyManager.classifyDocument(filePath);
    console.log(`   - Privacy Level: ${privacyClassification.level}`);
    console.log(`   - Confidence: ${privacyClassification.confidence}`);
    console.log(`   - Tags: ${privacyClassification.tags.join(', ')}`);
    
    // Step 2: Select appropriate model based on privacy and content
    const contentPreview = await this.getContentPreview(filePath);
    const selectedModel = await this.modelRegistry.selectModel(
      contentPreview, 
      privacyClassification.level
    );
    console.log(`🤖 Selected model: ${selectedModel} for privacy level: ${privacyClassification.level}`);
    
    // Step 3: Set processing flags based on privacy classification
    const processingFlags = {
      requiresSecureProcessing: ['confidential', 'restricted'].includes(privacyClassification.level),
      allowCloudProcessing: ['public', 'internal'].includes(privacyClassification.level),
      localOnly: ['restricted'].includes(privacyClassification.level)
    };
    
    console.log(`⚙️  Processing flags:`, processingFlags);
    
    // Enhanced content extraction with privacy-aware model selection
    const extractionOptions = {
      model: selectedModel,
      privacyLevel: privacyClassification.level,
      secureProcessing: processingFlags.requiresSecureProcessing
    };
    
    const extractionResult = await this.extractFileContent(filePath, extractionOptions);
    
    console.log(`📊 Privacy-aware extraction results for ${path.basename(filePath)}:`);
    console.log(`   - Method: ${extractionResult.extractionMethod}`);
    console.log(`   - Confidence: ${extractionResult.confidence}`);
    console.log(`   - Word Count: ${extractionResult.wordCount}`);
    console.log(`   - Model Selected: ${extractionResult.modelSelected}`);
    console.log(`   - Processing Time: ${extractionResult.processingTime}ms`);
    console.log(`   - Privacy Level: ${privacyClassification.level}`);
    if (extractionResult.documentStructure) {
      console.log(`   - Content Type: ${extractionResult.documentStructure.contentType}`);
      console.log(`   - Complexity: ${extractionResult.documentStructure.complexity}`);
      console.log(`   - Structure: ${JSON.stringify({
        headings: extractionResult.documentStructure.hasHeadings,
        tables: extractionResult.documentStructure.hasTables,
        images: extractionResult.documentStructure.hasImages,
        formulas: extractionResult.documentStructure.hasFormulas
      })}`);
    }
    
    // Extract file metadata
    const fileMetadata = await this.extractFileMetadata(filePath);
    
    // Merge extraction metadata with file metadata and privacy info
    const combinedMetadata = {
      ...fileMetadata,
      ...extractionResult.metadata,
      extractionStats: {
        confidence: extractionResult.confidence,
        processingTime: extractionResult.processingTime,
        wordCount: extractionResult.wordCount,
        modelSelected: extractionResult.modelSelected,
        documentStructure: extractionResult.documentStructure
      },
      privacy: {
        level: privacyClassification.level,
        confidence: privacyClassification.confidence,
        tags: privacyClassification.tags,
        reasoning: privacyClassification.reasoning
      }
    };
    
    // Create chunks with enhanced content
    const chunks = this.createContentChunks(
      fileInfo.id, 
      extractionResult.content, 
      config.chunkSize, 
      config.chunkOverlap,
      extractionResult.documentStructure
    );
    
    const extractedContent: PrivacyAwareExtractedContent = {
      fileId: fileInfo.id,
      content: extractionResult.content,
      contentType: this.getMimeType(filePath) || 'text/plain',
      chunks,
      metadata: combinedMetadata,
      extractedAt: new Date(),
      extractionMethod: extractionResult.extractionMethod,
      confidence: extractionResult.confidence,
      privacyClassification,
      selectedModel,
      processingFlags
    };
    
    // Step 4: Queue for sync if enabled
    if (!processingFlags.localOnly) {
      await this.syncEngine.queueForSync({
        fileId: fileInfo.id,
        filePath,
        privacyLevel: privacyClassification.level,
        extractedContent,
        timestamp: Date.now()
      });
    }
    
    return extractedContent;
  }

  private async extractFileContent(
    filePath: string, 
    options: Record<string, unknown> = {}
  ): Promise<ExtractionResult> {
    const config = this.getConfig() as FileProcessingConfig;
    
    const extractionOptions: ExtractionOptions = {
      ...config.extractionOptions,
      persona: config.defaultPersona,
      ...options // Allow override of default options
    } as ExtractionOptions;
    
    try {
      const result = await this.contentExtractorFactory.extractContent(filePath, extractionOptions);
      
      // Check if extraction meets quality threshold
      const qualityThreshold = config.qualityThreshold || 0.7;
      if (result.confidence < qualityThreshold) {
        console.warn(`Low confidence extraction for ${filePath}: ${result.confidence}`);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Enhanced content extraction failed for ${filePath}: ${(error as Error).message}`);
    }
  }

  private async extractFileMetadata(filePath: string): Promise<FileMetadata> {
    // Basic metadata extraction - will be enhanced later
    const stats = await fs.stat(filePath);
    
    return {
      creationDate: stats.birthtime,
      modificationDate: stats.mtime,
      // Additional metadata will be added by specific extractors
    };
  }

  private createContentChunks(
    fileId: string,
    content: string,
    chunkSize: number,
    overlap: number,
    documentStructure?: any
  ): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    
    // Smart chunking based on document structure
    if (documentStructure?.hasHeadings) {
      // Try to chunk by sections/headings when possible
      const sectionChunks = this.createStructuredChunks(fileId, content, chunkSize, overlap);
      if (sectionChunks.length > 0) {
        return sectionChunks;
      }
    }
    
    // Fallback to sliding window chunking
    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const chunkContent = content.slice(i, i + chunkSize);
      
      chunks.push({
        id: uuidv4(),
        fileId,
        content: chunkContent,
        startOffset: i,
        endOffset: Math.min(i + chunkSize, content.length),
        chunkIndex: chunks.length,
        metadata: {
          chunkType: 'sliding-window',
          hasStructure: !!documentStructure,
          contentType: documentStructure?.contentType || 'unknown'
        }
      });
    }
    
    return chunks;
  }
  
  private createStructuredChunks(
    fileId: string,
    content: string,
    maxChunkSize: number,
    overlap: number
  ): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    
    // Split by markdown headers or similar structure markers
    const sections = content.split(/(^#{1,6}.*$|^=+$|^-+$)/m);
    let currentChunk = '';
    let startOffset = 0;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section) continue;
      
      if (currentChunk.length + section.length > maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          id: uuidv4(),
          fileId,
          content: currentChunk.trim(),
          startOffset,
          endOffset: startOffset + currentChunk.length,
          chunkIndex: chunks.length,
          metadata: {
            chunkType: 'structured-section',
            sectionIndex: i
          }
        });
        
        // Start new chunk with overlap
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + section;
        startOffset = startOffset + currentChunk.length - overlapText.length;
      } else {
        currentChunk += section;
      }
    }
    
    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: uuidv4(),
        fileId,
        content: currentChunk.trim(),
        startOffset,
        endOffset: startOffset + currentChunk.length,
        chunkIndex: chunks.length,
        metadata: {
          chunkType: 'structured-section',
          sectionIndex: sections.length - 1
        }
      });
    }
    
    return chunks;
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private getMimeType(filePath: string): string | undefined {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.html': 'text/html',
      '.json': 'application/json',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
      '.go': 'text/x-go'
    };
    
    return mimeTypes[ext];
  }
  
  private async getContentPreview(filePath: string): Promise<string> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // For text files, read first 1000 characters
      if (['.txt', '.md', '.json', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.go'].includes(ext)) {
        const buffer = await fs.readFile(filePath);
        const content = buffer.toString('utf8');
        return content.substring(0, 1000);
      }
      
      // For other file types, return metadata
      const stats = await fs.stat(filePath);
      return `File: ${path.basename(filePath)}, Size: ${stats.size} bytes, Extension: ${ext}, Modified: ${stats.mtime}`;
    } catch (error) {
      return `Unable to preview file: ${path.basename(filePath)}`;
    }
  }

  // getExtractionMethod is now handled by ContentExtractorFactory

  // Content extractors are now handled by the ContentExtractorFactory

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

// Old extractor implementations removed - now using ContentExtractorFactory
