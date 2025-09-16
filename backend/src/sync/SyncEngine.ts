// Re-export SyncEngine from services directory
export { EnhancedSyncEngine as SyncEngine } from '../services/sync/SyncEngine.js';
export type {
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
} from '../shared/types/sync.js';