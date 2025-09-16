/**
 * Enhanced Synchronization Engine
 * Offline-first data synchronization inspired by SimStudio with conflict resolution
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as cron from 'node-cron';
import { createLogger } from '../../shared/utils/logger.js';
import type {
  SyncEngine,
  SyncOperation,
  SyncResult,
  SyncBatch,
  SyncStats,
  SyncConfiguration,
  ConflictData,
  ConflictResolutionStrategy,
  SyncStatus,
  OfflineStorage,
  CloudSync,
  SyncEvents
} from '../../shared/types/sync.js';

const logger = createLogger('SyncEngine');

export class EnhancedSyncEngine extends EventEmitter implements SyncEngine {
  private config: SyncConfiguration;
  private _isRunning = false;
  private isPaused = false;
  private syncTimer?: cron.ScheduledTask;
  private currentBatch?: SyncBatch;
  private offlineStorage: OfflineStorage;
  private cloudSync: CloudSync;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    offlineStorage: OfflineStorage,
    cloudSync: CloudSync,
    config: Partial<SyncConfiguration> = {}
  ) {
    super();
    
    this.offlineStorage = offlineStorage;
    this.cloudSync = cloudSync;
    this.config = {
      enabled: true,
      autoSync: true,
      syncInterval: 30000, // 30 seconds
      batchSize: 50,
      maxRetries: 3,
      backoffMultiplier: 2,
      maxBackoffDelay: 60000, // 1 minute
      conflictResolution: 'TIMESTAMP_BASED',
      prioritizeUploads: true,
      compressData: false,
      encryptSensitive: true,
      offlineRetention: 30, // 30 days
      ...config
    };

    this.setupEventHandlers();
    logger.info('SyncEngine initialized', { config: this.config });
  }

  private setupEventHandlers(): void {
    // Monitor online status
    setInterval(async () => {
      const wasOnline = (await this.getStats()).isOnline;
      const isOnline = await this.cloudSync.isOnline();
      
      if (wasOnline !== isOnline) {
        this.emit('online_status_changed', { isOnline });
        
        if (isOnline && this.config.autoSync) {
          logger.info('Connection restored - starting sync');
          this.processQueue().catch(err => 
            logger.error('Auto-sync failed after connection restore', { error: err.message })
          );
        }
      }
    }, 5000); // Check every 5 seconds
  }

  async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status' | 'attempts'>): Promise<string> {
    const syncOperation: SyncOperation = {
      id: uuidv4(),
      timestamp: new Date(),
      status: 'PENDING',
      attempts: 0,
      ...operation
    };

    await this.offlineStorage.saveOperation(syncOperation);
    
    logger.debug('Operation queued', { 
      id: syncOperation.id, 
      type: syncOperation.type, 
      entityType: syncOperation.entityType 
    });

    // If auto-sync is enabled and we're online, trigger immediate sync
    if (this.config.autoSync && await this.cloudSync.isOnline()) {
      setImmediate(() => this.processQueue().catch(err => 
        logger.error('Auto-sync failed', { error: err.message })
      ));
    }

    return syncOperation.id;
  }

  async processQueue(): Promise<SyncBatch> {
    if (!this.config.enabled || this.isPaused) {
      logger.debug('Sync disabled or paused, skipping queue processing');
      return this.createEmptyBatch();
    }

    const isOnline = await this.cloudSync.isOnline();
    if (!isOnline) {
      logger.debug('Offline - cannot process sync queue');
      return this.createEmptyBatch();
    }

    const operations = await this.getQueuedOperations(this.config.batchSize);
    if (operations.length === 0) {
      logger.debug('No operations in queue');
      return this.createEmptyBatch();
    }

    const batch = this.createBatch(operations);
    this.currentBatch = batch;
    
    logger.info(`Starting sync batch`, { 
      batchId: batch.id, 
      operations: batch.totalOperations 
    });

    this.emit('sync_started', { 
      batchId: batch.id, 
      operationCount: batch.totalOperations 
    });

    try {
      const processedBatch = await this.processBatch(batch);
      
      this.emit('sync_completed', { 
        batchId: processedBatch.id, 
        results: processedBatch 
      });

      logger.info(`Sync batch completed`, {
        batchId: processedBatch.id,
        successful: processedBatch.successfulOperations,
        failed: processedBatch.failedOperations,
        conflicts: processedBatch.conflicts
      });

      return processedBatch;
    } catch (error) {
      batch.status = 'FAILED';
      batch.completedAt = new Date();
      
      this.emit('sync_failed', { 
        batchId: batch.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      logger.error(`Sync batch failed`, { 
        batchId: batch.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      throw error;
    } finally {
      this.currentBatch = undefined;
    }
  }

  async processOperation(operation: SyncOperation): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Update operation status
      await this.offlineStorage.updateOperation(operation.id, {
        status: 'IN_PROGRESS',
        lastAttempt: new Date()
      });

      // Check for conflicts before processing
      const conflict = await this.detectConflicts(operation);
      if (conflict) {
        return await this.handleConflict(operation, conflict, startTime);
      }

      // Process the operation based on type
      let result: SyncResult;
      switch (operation.type) {
        case 'CREATE':
        case 'UPDATE':
        case 'DELETE':
          result = await this.processDataOperation(operation, startTime);
          break;
        case 'UPLOAD_FILE':
          result = await this.processFileUpload(operation, startTime);
          break;
        case 'DOWNLOAD_FILE':
          result = await this.processFileDownload(operation, startTime);
          break;
        case 'PROCESS_DOCUMENT':
          result = await this.processDocument(operation, startTime);
          break;
        case 'UPDATE_EMBEDDINGS':
          result = await this.processEmbeddingUpdate(operation, startTime);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      // Mark operation as completed
      await this.offlineStorage.updateOperation(operation.id, {
        status: 'COMPLETED'
      });

      this.emit('operation_completed', { 
        operationId: operation.id, 
        result 
      });

      return result;
    } catch (error) {
      const result = await this.handleOperationError(operation, error, startTime);
      
      this.emit('operation_failed', { 
        operationId: operation.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return result;
    }
  }

  createBatch(operations: SyncOperation[]): SyncBatch {
    // Sort by priority (high to low), then by timestamp (old to new)
    const sortedOperations = [...operations].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp.getTime() - b.timestamp.getTime(); // Older first
    });

    return {
      id: uuidv4(),
      operations: sortedOperations,
      status: 'PENDING',
      results: [],
      totalOperations: sortedOperations.length,
      successfulOperations: 0,
      failedOperations: 0,
      conflicts: 0
    };
  }

  async processBatch(batch: SyncBatch): Promise<SyncBatch> {
    batch.status = 'IN_PROGRESS';
    batch.startedAt = new Date();

    const results: SyncResult[] = [];
    let completed = 0;

    for (const operation of batch.operations) {
      try {
        const result = await this.processOperation(operation);
        results.push(result);
        
        if (result.success) {
          batch.successfulOperations++;
        } else {
          batch.failedOperations++;
        }

        if (result.conflictDetected) {
          batch.conflicts++;
        }

        completed++;
        
        // Emit progress
        this.emit('sync_progress', {
          batchId: batch.id,
          completed,
          total: batch.totalOperations
        });

      } catch (error) {
        logger.error(`Batch operation failed`, {
          batchId: batch.id,
          operationId: operation.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        batch.failedOperations++;
        results.push({
          operationId: operation.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          syncedAt: new Date(),
          duration: 0
        });
      }
    }

    batch.results = results;
    batch.status = 'COMPLETED';
    batch.completedAt = new Date();

    return batch;
  }

  async detectConflicts(operation: SyncOperation): Promise<ConflictData | null> {
    try {
      const operationData = JSON.parse(operation.operation);
      return await this.cloudSync.checkForConflicts(
        operation.entityType,
        operation.entityId,
        operationData
      );
    } catch (error) {
      logger.error('Conflict detection failed', {
        operationId: operation.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async resolveConflict(operation: SyncOperation, strategy: ConflictResolutionStrategy): Promise<any> {
    const conflict = operation.conflictData;
    if (!conflict) {
      throw new Error('No conflict data available');
    }

    let resolvedData: any;

    switch (strategy) {
      case 'LOCAL_WINS':
        resolvedData = conflict.localVersion;
        break;
      
      case 'REMOTE_WINS':
        resolvedData = conflict.remoteVersion;
        break;
      
      case 'TIMESTAMP_BASED':
        const localTime = new Date(conflict.localVersion.updatedAt || 0);
        const remoteTime = new Date(conflict.remoteVersion.updatedAt || 0);
        resolvedData = localTime > remoteTime ? conflict.localVersion : conflict.remoteVersion;
        break;
      
      case 'MERGE':
        resolvedData = await this.mergeConflictedData(conflict);
        break;
      
      case 'MANUAL':
        throw new Error('Manual conflict resolution not implemented');
      
      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }

    // Update conflict data with resolution
    const updatedConflict: ConflictData = {
      ...conflict,
      resolutionStrategy: strategy,
      resolvedData,
      resolvedAt: new Date()
    };

    await this.offlineStorage.updateOperation(operation.id, {
      conflictData: updatedConflict
    });

    return resolvedData;
  }

  async getQueuedOperations(limit?: number): Promise<SyncOperation[]> {
    const operations = await this.offlineStorage.listOperations({
      status: 'PENDING'
    });

    const sortedOperations = operations
      .filter(op => !this.hasUnresolvedDependencies(op, operations))
      .sort((a, b) => {
        // Priority-based sorting
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

    return limit ? sortedOperations.slice(0, limit) : sortedOperations;
  }

  async getOperationsByStatus(status: SyncStatus): Promise<SyncOperation[]> {
    return this.offlineStorage.listOperations({ status });
  }

  async clearQueue(): Promise<void> {
    const operations = await this.offlineStorage.listOperations();
    for (const op of operations) {
      if (op.status === 'PENDING' || op.status === 'FAILED') {
        await this.offlineStorage.deleteOperation(op.id);
      }
    }
    logger.info('Sync queue cleared');
  }

  async cancelOperation(operationId: string): Promise<boolean> {
    try {
      await this.offlineStorage.updateOperation(operationId, {
        status: 'CANCELLED'
      });
      
      // Clear any retry timeout
      const timeout = this.retryTimeouts.get(operationId);
      if (timeout) {
        clearTimeout(timeout);
        this.retryTimeouts.delete(operationId);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to cancel operation', { operationId, error });
      return false;
    }
  }

  async getStats(): Promise<SyncStats> {
    const [pending, inProgress, completed, failed, conflicted] = await Promise.all([
      this.getOperationsByStatus('PENDING'),
      this.getOperationsByStatus('IN_PROGRESS'),
      this.getOperationsByStatus('COMPLETED'),
      this.getOperationsByStatus('FAILED'),
      this.getOperationsByStatus('CONFLICTED')
    ]);

    const isOnline = await this.cloudSync.isOnline();
    const bytesQueued = await this.calculateQueuedBytes(pending);
    const lastSyncTime = await this.offlineStorage.getLastSyncTime('global');

    return {
      totalPending: pending.length,
      totalInProgress: inProgress.length,
      totalCompleted: completed.length,
      totalFailed: failed.length,
      totalConflicts: conflicted.length,
      lastSyncAt: lastSyncTime,
      nextSyncAt: this.calculateNextSyncTime(),
      isOnline,
      syncEnabled: this.config.enabled,
      bytesQueued,
      estimatedSyncTime: this.estimateSyncTime(pending, bytesQueued)
    };
  }

  getConfiguration(): SyncConfiguration {
    return { ...this.config };
  }

  async updateConfiguration(config: Partial<SyncConfiguration>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Restart scheduling if interval changed
    if (config.syncInterval && this._isRunning) {
      await this.stop();
      await this.start();
    }
    
    logger.info('Sync configuration updated', { config: this.config });
  }

  async start(): Promise<void> {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;
    this.isPaused = false;

    // Set up periodic sync
    if (this.config.autoSync && this.config.syncInterval > 0) {
      const cronExpression = this.intervalToCron(this.config.syncInterval);
      this.syncTimer = cron.schedule(cronExpression, async () => {
        if (!this.isPaused) {
          await this.processQueue().catch(err =>
            logger.error('Scheduled sync failed', { error: err.message })
          );
        }
      });
    }

    logger.info('SyncEngine started');
  }

  async stop(): Promise<void> {
    this._isRunning = false;
    
    if (this.syncTimer) {
      this.syncTimer.stop();
      this.syncTimer = undefined;
    }

    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();

    logger.info('SyncEngine stopped');
  }

  async pause(): Promise<void> {
    this.isPaused = true;
    logger.info('SyncEngine paused');
  }

  async resume(): Promise<void> {
    this.isPaused = false;
    logger.info('SyncEngine resumed');
    
    // Trigger sync if we have pending operations
    if (this.config.autoSync) {
      setImmediate(() => this.processQueue().catch(err =>
        logger.error('Resume sync failed', { error: err.message })
      ));
    }
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  // Private helper methods

  private createEmptyBatch(): SyncBatch {
    return {
      id: uuidv4(),
      operations: [],
      status: 'COMPLETED',
      results: [],
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      conflicts: 0,
      startedAt: new Date(),
      completedAt: new Date()
    };
  }

  private async handleConflict(operation: SyncOperation, conflict: ConflictData, startTime: number): Promise<SyncResult> {
    logger.warn('Conflict detected', { operationId: operation.id });
    
    this.emit('conflict_detected', { 
      operationId: operation.id, 
      conflict 
    });

    try {
      const resolvedData = await this.resolveConflict(operation, this.config.conflictResolution);
      
      // Update operation with resolved data
      const updatedOperation = {
        ...operation,
        operation: JSON.stringify(resolvedData),
        conflictData: conflict
      };

      await this.offlineStorage.updateOperation(operation.id, {
        operation: updatedOperation.operation,
        conflictData: conflict,
        status: 'COMPLETED'
      });

      return {
        operationId: operation.id,
        success: true,
        conflictDetected: true,
        conflictData: conflict,
        syncedAt: new Date(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      await this.offlineStorage.updateOperation(operation.id, {
        status: 'CONFLICTED',
        conflictData: conflict
      });

      return {
        operationId: operation.id,
        success: false,
        error: error instanceof Error ? error.message : 'Conflict resolution failed',
        conflictDetected: true,
        conflictData: conflict,
        syncedAt: new Date(),
        duration: Date.now() - startTime
      };
    }
  }

  private async handleOperationError(operation: SyncOperation, error: any, startTime: number): Promise<SyncResult> {
    const attempts = operation.attempts + 1;
    const maxAttempts = operation.maxAttempts || this.config.maxRetries;

    if (attempts < maxAttempts) {
      // Schedule retry with exponential backoff
      const delay = Math.min(
        1000 * Math.pow(this.config.backoffMultiplier, attempts - 1),
        this.config.maxBackoffDelay
      );

      const timeout = setTimeout(async () => {
        this.retryTimeouts.delete(operation.id);
        await this.processOperation({
          ...operation,
          attempts,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }).catch(err => 
          logger.error('Retry failed', { operationId: operation.id, error: err.message })
        );
      }, delay);

      this.retryTimeouts.set(operation.id, timeout);

      await this.offlineStorage.updateOperation(operation.id, {
        attempts,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        status: 'PENDING' // Reset to pending for retry
      });

      logger.info(`Scheduling retry for operation`, { 
        operationId: operation.id, 
        attempt: attempts, 
        delay 
      });
    } else {
      await this.offlineStorage.updateOperation(operation.id, {
        status: 'FAILED',
        attempts,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return {
      operationId: operation.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      syncedAt: new Date(),
      duration: Date.now() - startTime
    };
  }

  private async processDataOperation(operation: SyncOperation, startTime: number): Promise<SyncResult> {
    const data = JSON.parse(operation.operation);
    
    switch (operation.type) {
      case 'CREATE':
      case 'UPDATE':
        await this.cloudSync.uploadData(data, operation.entityType, operation.entityId);
        break;
      case 'DELETE':
        await this.cloudSync.deleteData(operation.entityType, operation.entityId);
        break;
    }

    return {
      operationId: operation.id,
      success: true,
      syncedAt: new Date(),
      duration: Date.now() - startTime,
      bytesTransferred: JSON.stringify(data).length
    };
  }

  private async processFileUpload(operation: SyncOperation, startTime: number): Promise<SyncResult> {
    // File upload implementation would go here
    // This is a placeholder for the actual file upload logic
    
    return {
      operationId: operation.id,
      success: true,
      syncedAt: new Date(),
      duration: Date.now() - startTime
    };
  }

  private async processFileDownload(operation: SyncOperation, startTime: number): Promise<SyncResult> {
    // File download implementation would go here
    
    return {
      operationId: operation.id,
      success: true,
      syncedAt: new Date(),
      duration: Date.now() - startTime
    };
  }

  private async processDocument(operation: SyncOperation, startTime: number): Promise<SyncResult> {
    // Document processing implementation would go here
    
    return {
      operationId: operation.id,
      success: true,
      syncedAt: new Date(),
      duration: Date.now() - startTime
    };
  }

  private async processEmbeddingUpdate(operation: SyncOperation, startTime: number): Promise<SyncResult> {
    // Embedding update implementation would go here
    
    return {
      operationId: operation.id,
      success: true,
      syncedAt: new Date(),
      duration: Date.now() - startTime
    };
  }

  private hasUnresolvedDependencies(operation: SyncOperation, allOperations: SyncOperation[]): boolean {
    if (!operation.dependencies || operation.dependencies.length === 0) {
      return false;
    }

    return operation.dependencies.some(depId => {
      const dep = allOperations.find(op => op.id === depId);
      return dep && dep.status !== 'COMPLETED';
    });
  }

  private async mergeConflictedData(conflict: ConflictData): Promise<any> {
    // Simple merge strategy - in practice, this would be more sophisticated
    const merged = { ...conflict.remoteVersion };
    
    // Merge non-conflicting fields from local version
    for (const field in conflict.localVersion) {
      if (!conflict.conflictFields.includes(field)) {
        merged[field] = conflict.localVersion[field];
      }
    }

    return merged;
  }

  private async calculateQueuedBytes(operations: SyncOperation[]): Promise<number> {
    return operations.reduce((total, op) => total + op.operation.length, 0);
  }

  private calculateNextSyncTime(): Date | undefined {
    if (!this.config.autoSync || !this.isRunning) {
      return undefined;
    }
    
    return new Date(Date.now() + this.config.syncInterval);
  }

  private estimateSyncTime(operations: SyncOperation[], totalBytes: number): number | undefined {
    if (operations.length === 0) {
      return undefined;
    }

    // Simple estimation: 1KB per second + 100ms per operation
    const bytesPerSecond = 1024;
    const msPerOperation = 100;
    
    return Math.ceil((totalBytes / bytesPerSecond * 1000) + (operations.length * msPerOperation));
  }

  private intervalToCron(interval: number): string {
    // Convert milliseconds to cron expression
    const seconds = Math.floor(interval / 1000);
    
    if (seconds < 60) {
      return `*/${seconds} * * * * *`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `0 */${minutes} * * * *`;
    } else {
      const hours = Math.floor(seconds / 3600);
      return `0 0 */${hours} * * *`;
    }
  }
}

export default EnhancedSyncEngine;