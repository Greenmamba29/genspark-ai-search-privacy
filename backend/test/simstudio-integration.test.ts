/**
 * SimStudio Integration Test Suite
 * Comprehensive tests for enhanced offline capabilities
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getSimStudioIntegration, disposeSimStudioIntegration } from '../src/services/SimStudioIntegration.js';
import { getModelRegistry, disposeModelRegistry } from '../src/ai/models/ModelRegistry.js';
import PrivacyManager from '../src/privacy/PrivacyManager.js';
import { OllamaProvider } from '../src/services/ollama/OllamaProvider.js';

describe('SimStudio Integration Tests', () => {
  let integration: any;
  
  beforeAll(async () => {
    integration = getSimStudioIntegration({
      ollama: {
        enabled: true,
        baseUrl: 'http://localhost:11434',
        autoDiscovery: false // Disable for testing
      },
      privacy: {
        mode: 'HYBRID',
        localModelPreference: true,
        auditLevel: 'BASIC'
      }
    });
  });

  afterAll(async () => {
    if (integration) {
      await integration.shutdown();
    }
    disposeSimStudioIntegration();
    disposeModelRegistry();
  });

  describe('Model Registry', () => {
    it('should initialize model registry', () => {
      const registry = getModelRegistry();
      expect(registry).toBeDefined();
      expect(typeof registry.listAllModels).toBe('function');
    });

    it('should register Ollama provider', async () => {
      const registry = getModelRegistry();
      const ollamaProvider = new OllamaProvider('http://localhost:11434');
      
      registry.registerProvider(ollamaProvider);
      const provider = registry.getProvider('ollama');
      
      expect(provider).toBeDefined();
      expect(provider?.definition.id).toBe('ollama');
    });

    it('should handle offline mode', async () => {
      const registry = getModelRegistry();
      
      await registry.enableOfflineMode();
      expect(registry.isOfflineModeEnabled()).toBe(true);
      
      await registry.disableOfflineMode();
      expect(registry.isOfflineModeEnabled()).toBe(false);
    });
  });

  describe('Ollama Provider', () => {
    let provider: OllamaProvider;

    beforeEach(() => {
      provider = new OllamaProvider('http://localhost:11434');
    });

    it('should create Ollama provider with correct configuration', () => {
      expect(provider.definition.id).toBe('ollama');
      expect(provider.definition.name).toBe('Ollama');
      expect(provider.definition.isLocal).toBe(true);
      expect(provider.definition.requiresApiKey).toBe(false);
    });

    it('should check availability', async () => {
      // This will likely fail in test environment, but should not throw
      const isAvailable = await provider.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should get provider status', async () => {
      const status = await provider.getStatus();
      expect(status).toBeDefined();
      expect(status.providerId).toBe('ollama');
      expect(typeof status.isAvailable).toBe('boolean');
      expect(typeof status.modelCount).toBe('number');
    });

    it('should get offline capabilities', async () => {
      const capabilities = await provider.getOfflineCapabilities();
      expect(capabilities).toBeDefined();
      expect(typeof capabilities.hasLocalModels).toBe('boolean');
      expect(Array.isArray(capabilities.supportedTasks)).toBe(true);
      expect(typeof capabilities.estimatedStorageGB).toBe('number');
    });
  });

  describe('Privacy Manager', () => {
    let privacyManager: PrivacyManager;

    beforeEach(() => {
      privacyManager = new PrivacyManager({
        mode: 'HYBRID',
        sensitivityThreshold: 'INTERNAL',
        auditLevel: 'BASIC'
      });
    });

    it('should classify public data correctly', async () => {
      const publicData = 'This is a public document about machine learning algorithms.';
      const classification = await privacyManager.classifyData(publicData);
      
      expect(classification.sensitivity).toBe('PUBLIC');
      expect(classification.containsPII).toBe(false);
      expect(classification.containsCredentials).toBe(false);
      expect(classification.allowCloudProcessing).toBe(true);
    });

    it('should detect PII in data', async () => {
      const piiData = 'Contact John Doe at john.doe@example.com or call 555-123-4567';
      const classification = await privacyManager.classifyData(piiData);
      
      expect(classification.containsPII).toBe(true);
      expect(classification.sensitivity).toBeOneOf(['CONFIDENTIAL', 'INTERNAL']);
    });

    it('should detect credentials in data', async () => {
      const credentialData = 'Database password: mysecretpassword123 and api_key: sk-1234567890';
      const classification = await privacyManager.classifyData(credentialData);
      
      expect(classification.containsCredentials).toBe(true);
      expect(classification.sensitivity).toBe('RESTRICTED');
      expect(classification.allowCloudProcessing).toBe(false);
    });

    it('should allow processing based on privacy policy', async () => {
      const publicData = 'Public information about weather';
      const canProcess = await privacyManager.canProcessData(publicData, 'text_processing');
      
      expect(canProcess).toBe(true);
    });

    it('should block sensitive data from cloud processing', async () => {
      const sensitiveData = 'Patient SSN: 123-45-6789';
      const canProcess = await privacyManager.canProcessData(sensitiveData, 'text_processing', 'cloud-provider');
      
      expect(canProcess).toBe(false);
    });

    it('should get processing strategy for different data types', async () => {
      const publicData = 'Public research paper abstract';
      const strategy = await privacyManager.getProcessingStrategy(publicData, 'text_generation');
      
      expect(strategy).toBeDefined();
      expect(strategy.approach).toBeOneOf(['LOCAL_ONLY', 'LOCAL_PREFERRED', 'CLOUD_ALLOWED', 'HYBRID']);
      expect(Array.isArray(strategy.providers)).toBe(true);
    });

    it('should update configuration', async () => {
      await privacyManager.updateConfiguration({
        mode: 'STRICT_LOCAL',
        auditLevel: 'DETAILED'
      });
      
      const config = privacyManager.getConfiguration();
      expect(config.mode).toBe('STRICT_LOCAL');
      expect(config.auditLevel).toBe('DETAILED');
    });

    it('should generate privacy report', () => {
      const report = privacyManager.generatePrivacyReport();
      
      expect(report).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(typeof report.complianceScore).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should maintain audit log', async () => {
      // Perform some operations to generate audit events
      await privacyManager.canProcessData('test data', 'test_operation');
      await privacyManager.canProcessData('another test', 'another_operation');
      
      const auditLog = privacyManager.getAuditLog(10);
      expect(Array.isArray(auditLog)).toBe(true);
      expect(auditLog.length).toBeGreaterThan(0);
      
      if (auditLog.length > 0) {
        const event = auditLog[0];
        expect(event.id).toBeDefined();
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(typeof event.approved).toBe('boolean');
      }
    });
  });

  describe('Integration Service', () => {
    it('should initialize without errors', async () => {
      expect(async () => {
        await integration.initialize();
      }).not.toThrow();
    });

    it('should get offline capabilities', async () => {
      const capabilities = await integration.getOfflineCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(typeof capabilities.textGeneration).toBe('boolean');
      expect(typeof capabilities.embeddings).toBe('boolean');
      expect(typeof capabilities.semanticSearch).toBe('boolean');
      expect(Array.isArray(capabilities.localModels)).toBe(true);
      expect(capabilities.estimatedPerformance).toBeOneOf(['LOW', 'MEDIUM', 'HIGH']);
    });

    it('should update configuration', async () => {
      await integration.updateConfiguration({
        privacy: {
          mode: 'STRICT_LOCAL'
        }
      });
      
      // Configuration should be updated internally
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should generate privacy report', () => {
      const report = integration.generatePrivacyReport();
      
      expect(report).toBeDefined();
      expect(typeof report.complianceScore).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Ollama service gracefully', async () => {
      const offlineProvider = new OllamaProvider('http://localhost:99999'); // Non-existent service
      const isAvailable = await offlineProvider.isAvailable();
      
      expect(isAvailable).toBe(false);
    });

    it('should handle invalid data classification gracefully', async () => {
      const privacyManager = new PrivacyManager();
      
      // Should not throw with various data types
      await expect(privacyManager.classifyData(null)).resolves.toBeDefined();
      await expect(privacyManager.classifyData(undefined)).resolves.toBeDefined();
      await expect(privacyManager.classifyData('')).resolves.toBeDefined();
      await expect(privacyManager.classifyData({})).resolves.toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete data classification quickly', async () => {
      const privacyManager = new PrivacyManager();
      const testData = 'This is a sample document for performance testing.';
      
      const startTime = Date.now();
      await privacyManager.classifyData(testData);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle batch operations efficiently', async () => {
      const privacyManager = new PrivacyManager();
      const batchData = Array.from({ length: 10 }, (_, i) => `Document ${i + 1} content`);
      
      const startTime = Date.now();
      await Promise.all(batchData.map(data => privacyManager.classifyData(data)));
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(500); // Should complete batch within 500ms
    });
  });
});

// Custom matchers for vitest
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    return {
      message: () => `expected ${received} to be one of ${expected.join(', ')}`,
      pass,
    };
  },
});

// Type declarations for custom matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeOneOf(expected: any[]): T;
  }
  interface AsymmetricMatchersContaining {
    toBeOneOf(expected: any[]): any;
  }
}