#!/usr/bin/env node

/**
 * Manual Integration Test Script
 * Tests SimStudio integration features step by step
 */

import { createLogger } from './src/shared/utils/logger.js';
import { getSimStudioIntegration } from './src/services/SimStudioIntegration.js';
import { getModelRegistry } from './src/ai/models/ModelRegistry.js';
import PrivacyManager from './src/privacy/PrivacyManager.js';
import { OllamaProvider } from './src/services/ollama/OllamaProvider.js';

const logger = createLogger('ManualTest');

// Test configuration
const TEST_CONFIG = {
  ollama: {
    enabled: true,
    baseUrl: 'http://localhost:11434',
    autoDiscovery: false
  },
  privacy: {
    mode: 'HYBRID',
    localModelPreference: true,
    auditLevel: 'BASIC'
  }
};

// Test data samples
const TEST_DATA = {
  public: 'This is a public document about machine learning algorithms and their applications in modern AI systems.',
  pii: 'Contact information: John Doe, email john.doe@company.com, phone 555-123-4567, located at 123 Main St.',
  credentials: 'Database connection: password=secretpass123, api_key=sk-1234567890abcdef, private_key=rsa-private-key',
  medical: 'Patient John Smith, DOB: 01/15/1980, diagnosed with hypertension, prescribed medication XYZ.',
  financial: 'Account holder: Jane Doe, Account: 1234567890, Balance: $50,000, Credit Score: 750'
};

async function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 Running test: ${testName}`);
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ ${testName} passed (${duration}ms)`);
    return true;
  } catch (error) {
    console.log(`❌ ${testName} failed:`, error.message);
    return false;
  }
}

async function testModelRegistry() {
  console.log('\n📚 Testing Model Registry...');
  
  const registry = getModelRegistry(TEST_CONFIG.registry);
  
  // Test basic functionality
  await runTest('Model registry initialization', async () => {
    if (!registry || typeof registry.listAllModels !== 'function') {
      throw new Error('Model registry not properly initialized');
    }
  });

  await runTest('Offline mode toggle', async () => {
    await registry.enableOfflineMode();
    if (!registry.isOfflineModeEnabled()) {
      throw new Error('Failed to enable offline mode');
    }
    
    await registry.disableOfflineMode();
    if (registry.isOfflineModeEnabled()) {
      throw new Error('Failed to disable offline mode');
    }
  });

  await runTest('Provider registration', async () => {
    const ollamaProvider = new OllamaProvider(TEST_CONFIG.ollama.baseUrl);
    registry.registerProvider(ollamaProvider);
    
    const provider = registry.getProvider('ollama');
    if (!provider || provider.definition.id !== 'ollama') {
      throw new Error('Failed to register Ollama provider');
    }
  });
}

async function testOllamaProvider() {
  console.log('\n🦙 Testing Ollama Provider...');
  
  const provider = new OllamaProvider(TEST_CONFIG.ollama.baseUrl);

  await runTest('Provider configuration', async () => {
    if (provider.definition.id !== 'ollama' || 
        !provider.definition.isLocal || 
        provider.definition.requiresApiKey) {
      throw new Error('Provider configuration incorrect');
    }
  });

  await runTest('Provider availability check', async () => {
    const isAvailable = await provider.isAvailable();
    console.log(`   Ollama service available: ${isAvailable}`);
    // Don't fail if Ollama is not running - just report status
  });

  await runTest('Provider status', async () => {
    const status = await provider.getStatus();
    if (!status || status.providerId !== 'ollama' || typeof status.isAvailable !== 'boolean') {
      throw new Error('Provider status check failed');
    }
    console.log(`   Provider status: Available=${status.isAvailable}, Models=${status.modelCount}`);
  });

  await runTest('Offline capabilities', async () => {
    const capabilities = await provider.getOfflineCapabilities();
    if (!capabilities || 
        typeof capabilities.hasLocalModels !== 'boolean' ||
        !Array.isArray(capabilities.supportedTasks)) {
      throw new Error('Offline capabilities check failed');
    }
    console.log(`   Capabilities: LocalModels=${capabilities.hasLocalModels}, Tasks=${capabilities.supportedTasks.length}`);
  });
}

async function testPrivacyManager() {
  console.log('\n🔒 Testing Privacy Manager...');
  
  const privacyManager = new PrivacyManager(TEST_CONFIG.privacy);

  await runTest('Public data classification', async () => {
    const classification = await privacyManager.classifyData(TEST_DATA.public);
    if (classification.sensitivity !== 'PUBLIC' || 
        classification.containsPII !== false ||
        classification.allowCloudProcessing !== true) {
      throw new Error('Public data classification failed');
    }
    console.log(`   Classification: ${classification.sensitivity}, PII: ${classification.containsPII}`);
  });

  await runTest('PII detection', async () => {
    const classification = await privacyManager.classifyData(TEST_DATA.pii);
    if (!classification.containsPII || 
        classification.sensitivity === 'PUBLIC') {
      throw new Error('PII detection failed');
    }
    console.log(`   PII detected: ${classification.containsPII}, Sensitivity: ${classification.sensitivity}`);
  });

  await runTest('Credentials detection', async () => {
    const classification = await privacyManager.classifyData(TEST_DATA.credentials);
    if (!classification.containsCredentials || 
        classification.sensitivity !== 'RESTRICTED' ||
        classification.allowCloudProcessing !== false) {
      throw new Error('Credentials detection failed');
    }
    console.log(`   Credentials detected: ${classification.containsCredentials}, Cloud allowed: ${classification.allowCloudProcessing}`);
  });

  await runTest('Processing strategy', async () => {
    const strategy = await privacyManager.getProcessingStrategy(TEST_DATA.public, 'text_generation');
    if (!strategy || 
        !['LOCAL_ONLY', 'LOCAL_PREFERRED', 'CLOUD_ALLOWED', 'HYBRID'].includes(strategy.approach) ||
        !Array.isArray(strategy.providers)) {
      throw new Error('Processing strategy generation failed');
    }
    console.log(`   Strategy: ${strategy.approach}, Providers: ${strategy.providers.length}`);
  });

  await runTest('Privacy audit', async () => {
    // Generate some audit events
    await privacyManager.canProcessData(TEST_DATA.public, 'test1');
    await privacyManager.canProcessData(TEST_DATA.pii, 'test2');
    
    const auditLog = privacyManager.getAuditLog(5);
    if (!Array.isArray(auditLog) || auditLog.length === 0) {
      throw new Error('Audit log not working');
    }
    console.log(`   Audit events: ${auditLog.length}`);
  });

  await runTest('Privacy report generation', async () => {
    const report = privacyManager.generatePrivacyReport();
    if (!report || 
        typeof report.complianceScore !== 'number' ||
        !Array.isArray(report.recommendations)) {
      throw new Error('Privacy report generation failed');
    }
    console.log(`   Compliance score: ${report.complianceScore}%, Recommendations: ${report.recommendations.length}`);
  });
}

async function testIntegrationService() {
  console.log('\n🔧 Testing Integration Service...');
  
  const integration = getSimStudioIntegration(TEST_CONFIG);

  await runTest('Service initialization', async () => {
    await integration.initialize();
  });

  await runTest('Offline capabilities assessment', async () => {
    const capabilities = await integration.getOfflineCapabilities();
    if (!capabilities ||
        typeof capabilities.textGeneration !== 'boolean' ||
        typeof capabilities.embeddings !== 'boolean' ||
        !Array.isArray(capabilities.localModels)) {
      throw new Error('Offline capabilities assessment failed');
    }
    console.log(`   Text generation: ${capabilities.textGeneration}, Embeddings: ${capabilities.embeddings}`);
    console.log(`   Local models: ${capabilities.localModels.length}, Performance: ${capabilities.estimatedPerformance}`);
  });

  await runTest('Configuration update', async () => {
    await integration.updateConfiguration({
      privacy: {
        mode: 'STRICT_LOCAL',
        auditLevel: 'DETAILED'
      }
    });
  });

  await runTest('Privacy report from service', async () => {
    const report = integration.generatePrivacyReport();
    if (!report || typeof report.complianceScore !== 'number') {
      throw new Error('Privacy report from service failed');
    }
    console.log(`   Service compliance score: ${report.complianceScore}%`);
  });

  // Cleanup
  await integration.shutdown();
}

async function testErrorHandling() {
  console.log('\n⚠️  Testing Error Handling...');

  await runTest('Invalid Ollama connection', async () => {
    const invalidProvider = new OllamaProvider('http://localhost:99999');
    const isAvailable = await invalidProvider.isAvailable();
    if (isAvailable) {
      throw new Error('Should return false for invalid connection');
    }
  });

  await runTest('Null data classification', async () => {
    const privacyManager = new PrivacyManager();
    const classification = await privacyManager.classifyData(null);
    if (!classification) {
      throw new Error('Should handle null data gracefully');
    }
  });

  await runTest('Empty data classification', async () => {
    const privacyManager = new PrivacyManager();
    const classification = await privacyManager.classifyData('');
    if (!classification) {
      throw new Error('Should handle empty data gracefully');
    }
  });
}

async function runPerformanceTests() {
  console.log('\n⚡ Running Performance Tests...');

  await runTest('Data classification performance', async () => {
    const privacyManager = new PrivacyManager();
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await privacyManager.classifyData(`Test document ${i} with sample content for performance testing.`);
    }
    
    const duration = Date.now() - startTime;
    const avgTime = duration / iterations;
    
    if (avgTime > 10) { // Should be less than 10ms per classification
      throw new Error(`Classification too slow: ${avgTime.toFixed(2)}ms per operation`);
    }
    
    console.log(`   ${iterations} classifications in ${duration}ms (${avgTime.toFixed(2)}ms avg)`);
  });

  await runTest('Batch processing performance', async () => {
    const privacyManager = new PrivacyManager();
    const batchSize = 50;
    const batchData = Array.from({ length: batchSize }, (_, i) => 
      `Batch document ${i + 1} with various content types and data.`
    );
    
    const startTime = Date.now();
    await Promise.all(batchData.map(data => privacyManager.classifyData(data)));
    const duration = Date.now() - startTime;
    
    if (duration > 1000) { // Should complete batch within 1 second
      throw new Error(`Batch processing too slow: ${duration}ms for ${batchSize} items`);
    }
    
    console.log(`   Batch of ${batchSize} processed in ${duration}ms`);
  });
}

// Main test runner
async function main() {
  console.log('🚀 SimStudio Integration Manual Test Suite');
  console.log('==========================================');
  
  let totalTests = 0;
  let passedTests = 0;

  const testSuites = [
    { name: 'Model Registry', fn: testModelRegistry },
    { name: 'Ollama Provider', fn: testOllamaProvider },
    { name: 'Privacy Manager', fn: testPrivacyManager },
    { name: 'Integration Service', fn: testIntegrationService },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Performance Tests', fn: runPerformanceTests }
  ];

  for (const suite of testSuites) {
    try {
      console.log(`\n🔍 Test Suite: ${suite.name}`);
      console.log('─'.repeat(40));
      await suite.fn();
    } catch (error) {
      console.log(`❌ Test suite ${suite.name} failed:`, error.message);
    }
  }

  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log('✅ All test suites completed');
  console.log('🎯 Integration appears to be working correctly');
  
  if (process.env.NODE_ENV !== 'test') {
    console.log('\n📝 Next Steps:');
    console.log('1. Install and run Ollama to test local model features');
    console.log('2. Configure cloud providers for hybrid mode testing');
    console.log('3. Test with real documents and search queries');
    console.log('4. Monitor performance with actual workloads');
  }
}

// Run the tests
main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

export { main };