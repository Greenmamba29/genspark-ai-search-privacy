/**
 * Synchronization types for offline-first data management
 * Inspired by SimStudio's sync capabilities and enhanced for Grahmos
 */

export type SyncOperationType = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'UPLOAD_FILE' 
  | 'DOWNLOAD_FILE'
  | 'PROCESS_DOCUMENT'
  | 'UPDATE_EMBEDDINGS';

export type SyncStatus = 
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CONFLICTED'
  | 'CANCELLED';

export type ConflictResolutionStrategy = 
  | 'LOCAL_WINS'
  | 'REMOTE_WINS'
  | 'MERGE'
  | 'MANUAL'
  | 'TIMESTAMP_BASED';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entityType: string; // 'document', 'file', 'search_result', etc.
  entityId: string;
  operation: string; // JSON stringified operation data
  metadata: Record<string, any>;
  timestamp: Date;
  status: SyncStatus;
  attempts: number;
  maxAttempts: number;
  lastAttempt?: Date;
  lastError?: string;
  priority: number; // Higher number = higher priority
  dependencies?: string[]; // IDs of operations that must complete first
  conflictData?: ConflictData;
}

export interface ConflictData {
  localVersion: any;
  remoteVersion: any;
  conflictFields: string[];
  resolutionStrategy?: ConflictResolutionStrategy;
  resolvedData?: any;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SyncResult {
  operationId: string;
  success: boolean;
  error?: string;
  conflictDetected?: boolean;
  conflictData?: ConflictData;
  syncedAt: Date;
  duration: number;
  bytesTransferred?: number;
}

export interface SyncBatch {
  id: string;
  operations: SyncOperation[];
  status: SyncStatus;
  startedAt?: Date;
  completedAt?: Date;
  results: SyncResult[];
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  conflicts: number;
}

export interface SyncStats {
  totalPending: number;
  totalInProgress: number;
  totalCompleted: number;
  totalFailed: number;
  totalConflicts: number;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  isOnline: boolean;
  syncEnabled: boolean;
  bytesQueued: number;
  estimatedSyncTime?: number;
}

export interface SyncConfiguration {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // milliseconds
  batchSize: number;
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffDelay: number;
  conflictResolution: ConflictResolutionStrategy;
  prioritizeUploads: boolean;
  compressData: boolean;
  encryptSensitive: boolean;
  offlineRetention: number; // days to keep offline data
}

export interface SyncEngine {
  // Core sync operations
  queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status' | 'attempts'>): Promise<string>;
  processQueue(): Promise<SyncBatch>;
  processOperation(operation: SyncOperation): Promise<SyncResult>;
  
  // Queue management
  getQueuedOperations(limit?: number): Promise<SyncOperation[]>;
  getOperationsByStatus(status: SyncStatus): Promise<SyncOperation[]>;
  clearQueue(): Promise<void>;
  cancelOperation(operationId: string): Promise<boolean>;
  
  // Batch processing
  createBatch(operations: SyncOperation[]): SyncBatch;
  processBatch(batch: SyncBatch): Promise<SyncBatch>;
  
  // Conflict resolution
  detectConflicts(operation: SyncOperation): Promise<ConflictData | null>;
  resolveConflict(operation: SyncOperation, strategy: ConflictResolutionStrategy): Promise<any>;
  
  // Status and monitoring
  getStats(): Promise<SyncStats>;
  getConfiguration(): SyncConfiguration;
  updateConfiguration(config: Partial<SyncConfiguration>): Promise<void>;
  
  // Control
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  isRunning(): boolean;
  
  // Events
  on(event: 'sync_started' | 'sync_completed' | 'sync_failed' | 'conflict_detected', callback: Function): void;
  off(event: string, callback: Function): void;
}

export interface OfflineStorage {
  // Operation persistence
  saveOperation(operation: SyncOperation): Promise<void>;
  updateOperation(operationId: string, updates: Partial<SyncOperation>): Promise<void>;
  deleteOperation(operationId: string): Promise<void>;
  getOperation(operationId: string): Promise<SyncOperation | null>;
  listOperations(filter?: Partial<SyncOperation>): Promise<SyncOperation[]>;
  
  // Data caching
  cacheData(key: string, data: any, ttl?: number): Promise<void>;
  getCachedData(key: string): Promise<any>;
  deleteCachedData(key: string): Promise<void>;
  clearCache(): Promise<void>;
  
  // Metadata
  getLastSyncTime(entityType: string): Promise<Date | null>;
  setLastSyncTime(entityType: string, timestamp: Date): Promise<void>;
  
  // Storage management
  getStorageSize(): Promise<number>;
  cleanup(olderThan: Date): Promise<number>; // Returns number of items cleaned
}

export interface CloudSync {
  // Data synchronization
  uploadData(data: any, entityType: string, entityId: string): Promise<void>;
  downloadData(entityType: string, entityId: string): Promise<any>;
  deleteData(entityType: string, entityId: string): Promise<void>;
  
  // Batch operations
  uploadBatch(operations: SyncOperation[]): Promise<SyncResult[]>;
  downloadChanges(entityType: string, since: Date): Promise<any[]>;
  
  // Conflict detection
  checkForConflicts(entityType: string, entityId: string, localData: any): Promise<ConflictData | null>;
  
  // Status
  isOnline(): Promise<boolean>;
  testConnection(): Promise<boolean>;
}

// Event types for sync monitoring
export interface SyncEvents {
  'sync_started': { batchId: string; operationCount: number };
  'sync_progress': { batchId: string; completed: number; total: number };
  'sync_completed': { batchId: string; results: SyncBatch };
  'sync_failed': { batchId: string; error: string };
  'conflict_detected': { operationId: string; conflict: ConflictData };
  'operation_completed': { operationId: string; result: SyncResult };
  'operation_failed': { operationId: string; error: string };
  'online_status_changed': { isOnline: boolean };
}

// Utility types for common sync scenarios
export interface DocumentSyncOperation extends Omit<SyncOperation, 'entityType'> {
  entityType: 'document';
  documentData?: {
    title: string;
    content: string;
    metadata: Record<string, any>;
    embeddings?: number[];
  };
}

export interface FileSyncOperation extends Omit<SyncOperation, 'entityType'> {
  entityType: 'file';
  fileData?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    checksum: string;
  };
}

export interface SearchSyncOperation extends Omit<SyncOperation, 'entityType'> {
  entityType: 'search';
  searchData?: {
    query: string;
    results: any[];
    filters: Record<string, any>;
    timestamp: Date;
  };
}