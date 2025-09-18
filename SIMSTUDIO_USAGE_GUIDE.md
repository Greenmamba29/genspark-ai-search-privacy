# SimStudio Integration Usage Guide

## Overview

This guide demonstrates how to use the enhanced offline capabilities in Grahmos-AI-Search powered by SimStudio components.

## Quick Start

### 1. Initialize the Integration

```typescript
import { getSimStudioIntegration } from './src/services/SimStudioIntegration.js';

// Initialize with default configuration
const integration = getSimStudioIntegration({
  ollama: {
    enabled: true,
    baseUrl: 'http://localhost:11434',
    autoDiscovery: true
  },
  privacy: {
    mode: 'HYBRID',
    localModelPreference: true,
    encryptSensitiveData: true
  }
});

// Initialize the service
await integration.initialize();
```

### 2. Check Offline Capabilities

```typescript
const capabilities = await integration.getOfflineCapabilities();
console.log('Offline capabilities:', capabilities);
// Output: {
//   textGeneration: true,
//   embeddings: true,
//   semanticSearch: true,
//   documentProcessing: true,
//   localModels: ['llama3.1:8b', 'nomic-embed-text'],
//   estimatedPerformance: 'MEDIUM'
// }
```

### 3. Perform Enhanced Search

```typescript
const documents = [
  { id: 1, title: 'AI Research Paper', content: 'Machine learning advances...' },
  { id: 2, title: 'Tech Report', content: 'Software engineering best practices...' }
];

const searchResult = await integration.enhancedSearch(
  'latest AI developments',
  documents,
  {
    privacyMode: 'HYBRID',
    preferLocal: true,
    maxTokens: 500
  }
);

console.log('Search results:', searchResult.results);
console.log('Privacy compliance:', searchResult.privacy);
console.log('Processing metadata:', searchResult.metadata);
```

## Privacy-First Features

### 1. Data Classification

```typescript
import PrivacyManager from './src/privacy/PrivacyManager.js';

const privacyManager = new PrivacyManager({
  mode: 'STRICT_LOCAL',
  sensitivityThreshold: 'CONFIDENTIAL'
});

// Classify data automatically
const classification = await privacyManager.classifyData(
  'Patient John Doe, SSN: 123-45-6789, has been diagnosed...'
);

console.log('Data classification:', classification);
// Output: {
//   sensitivity: 'RESTRICTED',
//   containsPII: true,
//   containsCredentials: false,
//   containsProprietaryData: false,
//   requiresEncryption: true,
//   allowCloudProcessing: false
// }
```

### 2. Private Inference

```typescript
// This will automatically use local models for sensitive data
const result = await integration.performPrivateInference(
  'Analyze this confidential business strategy document',
  {
    temperature: 0.7,
    maxTokens: 1000
  }
);

console.log('Inference result:', result.text);
console.log('Was processed offline:', result.wasOffline);
```

### 3. Privacy Reporting

```typescript
const report = integration.generatePrivacyReport();
console.log('Privacy compliance score:', report.complianceScore);
console.log('Local processing percentage:', report.processingStats.localPercentage);
console.log('Recommendations:', report.recommendations);
```

## Offline-First Synchronization

### 1. Check Sync Status

```typescript
const syncStatus = await integration.getSyncStatus();
if (syncStatus) {
  console.log('Pending operations:', syncStatus.totalPending);
  console.log('Is online:', syncStatus.isOnline);
  console.log('Last sync:', syncStatus.lastSyncAt);
}
```

### 2. Manual Sync

```typescript
// Force synchronization when online
try {
  await integration.forcSync();
  console.log('Synchronization completed');
} catch (error) {
  console.log('Sync failed:', error.message);
}
```

## Advanced Configuration

### 1. Strict Local Mode

```typescript
// Maximum privacy - everything processed locally
const strictIntegration = getSimStudioIntegration({
  privacy: {
    mode: 'STRICT_LOCAL',
    allowCloudProcessing: false,
    allowCloudStorage: false,
    encryptSensitiveData: true,
    auditLevel: 'DETAILED'
  },
  ollama: {
    enabled: true,
    baseUrl: 'http://localhost:11434',
    autoDiscovery: true
  }
});
```

### 2. Hybrid Mode with Approved Providers

```typescript
const hybridIntegration = getSimStudioIntegration({
  privacy: {
    mode: 'HYBRID',
    allowCloudProcessing: true,
    approvedCloudProviders: ['openai', 'anthropic'],
    blockedCloudProviders: ['untrusted-provider'],
    sensitivityThreshold: 'INTERNAL'
  }
});
```

### 3. Custom Model Management

```typescript
import { getModelRegistry } from './src/ai/models/ModelRegistry.js';

const registry = getModelRegistry();

// List all available models
const allModels = await registry.listAllModels();
const localModels = await registry.getLocalModels();

// Get offline fallbacks for a model
const fallbacks = await registry.getOfflineFallbacks('gpt-4o');

// Enable offline mode
await registry.enableOfflineMode();
```

## Integration with Existing Grahmos Components

### 1. Enhanced File Processing

```typescript
import { FileProcessingAgent } from './src/agents/file-processing/FileProcessingAgent.js';

// The file processing agent can now use local models
const fileProcessor = new FileProcessingAgent();

// Process documents with privacy controls
const processedDoc = await fileProcessor.processDocument(
  '/path/to/document.pdf',
  {
    useLocalModels: true,
    privacyMode: 'STRICT_LOCAL'
  }
);
```

### 2. Enhanced Search Capabilities

```typescript
import { SearchAgent } from './src/agents/search/SearchAgent.js';

const searchAgent = new SearchAgent();

// Semantic search with local embeddings
const searchResults = await searchAgent.semanticSearch(
  'find documents about machine learning',
  {
    useLocalEmbeddings: true,
    maxResults: 10
  }
);
```

## Performance Optimization

### 1. Model Preloading

```typescript
// Preload frequently used models
const registry = getModelRegistry();
const ollamaProvider = registry.getProvider('ollama');

if (ollamaProvider) {
  await ollamaProvider.loadModel('llama3.1:8b');
  await ollamaProvider.loadModel('nomic-embed-text');
}
```

### 2. Batch Processing

```typescript
// Process multiple texts efficiently
const texts = [
  'Document 1 content...',
  'Document 2 content...',
  'Document 3 content...'
];

const embeddings = await integration.generatePrivateEmbeddings(texts, {
  batchSize: 10,
  offlineOnly: true
});
```

## Monitoring and Debugging

### 1. Privacy Audit Log

```typescript
const auditEvents = privacyManager.getAuditLog(100);
auditEvents.forEach(event => {
  console.log(`${event.timestamp}: ${event.eventType} - ${event.approved ? 'APPROVED' : 'BLOCKED'}`);
  console.log(`Reason: ${event.reason}`);
});
```

### 2. Model Registry Status

```typescript
const registry = getModelRegistry();
const providers = await registry.getAvailableProviders();

providers.forEach(async (provider) => {
  const status = await provider.getStatus();
  console.log(`${provider.definition.name}: ${status.isAvailable ? 'Available' : 'Unavailable'}`);
  console.log(`Models: ${status.modelCount}`);
});
```

## Error Handling

```typescript
try {
  const result = await integration.enhancedSearch(query, documents, options);
  // Process result
} catch (error) {
  if (error.message.includes('privacy constraints')) {
    // Handle privacy-related errors
    console.log('Processing blocked by privacy policy');
  } else if (error.message.includes('No local models')) {
    // Handle missing local models
    console.log('Local models required but not available');
  } else {
    // Handle other errors
    console.log('Search failed:', error.message);
  }
}
```

## Best Practices

### 1. Privacy Configuration

- Use `STRICT_LOCAL` mode for sensitive data
- Configure appropriate sensitivity thresholds
- Regularly review privacy audit logs
- Enable encryption for sensitive data

### 2. Performance Optimization

- Preload frequently used models
- Use batch processing for multiple operations
- Enable model caching
- Monitor memory usage for large models

### 3. Offline Capabilities

- Test functionality in offline mode
- Implement fallback strategies
- Monitor sync queue status
- Handle sync conflicts appropriately

### 4. Integration Patterns

- Initialize integration service once at startup
- Use singleton pattern for model registry
- Implement proper error handling
- Clean up resources on shutdown

## Cleanup

```typescript
// Proper cleanup when shutting down
await integration.shutdown();
```

This integration provides a robust foundation for privacy-first, offline-capable AI search with the flexibility to scale from fully local processing to hybrid cloud scenarios as needed.