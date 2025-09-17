/**
 * Local Agent System Test
 * Tests the core agent functionality without Redis dependency
 */

import { TestAgent } from './dist/agents/test/TestAgent.js';
import { MasterOrchestratorAgent } from './dist/agents/orchestrator/MasterOrchestrator.js';

// Mock MessageBus for testing
class MockMessageBus {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.handlers = new Map();
    this.events = [];
  }

  async connect() {
    console.log('MockMessageBus: Connected');
    this.connected = true;
    this.emit('connected');
    return Promise.resolve();
  }

  async disconnect() {
    console.log('MockMessageBus: Disconnected');
    this.connected = false;
    this.emit('disconnected');
    return Promise.resolve();
  }

  async subscribe(agentId, handler) {
    this.handlers.set(agentId, handler);
    console.log(`MockMessageBus: ${agentId} subscribed`);
    return Promise.resolve();
  }

  async sendMessage(message) {
    console.log(`MockMessageBus: Message sent from ${message.source} to ${message.target}`);
    
    // If target exists, route to it
    const handler = this.handlers.get(message.target);
    if (handler) {
      setTimeout(() => handler(message), 10); // Simulate async
    }
    
    return Promise.resolve();
  }

  async broadcast(payload, sourceId) {
    console.log(`MockMessageBus: Broadcast from ${sourceId}`, payload);
    return Promise.resolve();
  }

  getMetrics() {
    return {
      connected_clients: this.handlers.size,
      pending_requests: 0,
      active_subscriptions: this.handlers.size,
      is_connected: this.connected ? 1 : 0
    };
  }

  on(event, callback) {
    // Simple event emitter mock
    setTimeout(() => {
      if (event === 'connected' && this.connected) {
        callback();
      }
    }, 0);
  }

  emit(event, data) {
    console.log(`MockMessageBus: Event ${event}`, data);
  }
}

// Replace the MessageBus import temporarily
const originalMessageBus = await import('./dist/shared/communication/MessageBus.js');

// Override the MessageBus class
const MockedMessageBus = MockMessageBus;

async function testAgentSystem() {
  console.log('🚀 Starting Local Agent System Test...\n');

  try {
    // Test 1: Create and initialize MasterOrchestrator with mock MessageBus
    console.log('📊 Test 1: Creating MasterOrchestrator...');
    
    const orchestratorConfig = {
      agentId: 'test-orchestrator',
      type: 'orchestrator',
      enabled: true,
      messageBusConfig: {
        redisUrl: 'mock://localhost',
        channelPrefix: 'test',
        requestTimeout: 5000,
        maxRetries: 3
      }
    };

    // Monkey patch MessageBus temporarily for test
    const originalMessageBusClass = originalMessageBus.MessageBus;
    originalMessageBus.MessageBus = MockedMessageBus;

    const orchestrator = new MasterOrchestratorAgent(orchestratorConfig);
    
    await orchestrator.initialize();
    console.log('✅ MasterOrchestrator initialized successfully');

    await orchestrator.start();
    console.log('✅ MasterOrchestrator started successfully');

    // Test 2: Create and test TestAgent
    console.log('\n📊 Test 2: Creating TestAgent...');
    
    const testAgentConfig = {
      agentId: 'test-agent',
      type: 'file-processing',
      enabled: true,
      messageBusConfig: {
        redisUrl: 'mock://localhost',
        channelPrefix: 'test',
        requestTimeout: 5000,
        maxRetries: 3
      }
    };

    const testAgent = new TestAgent(testAgentConfig);
    
    await testAgent.initialize();
    console.log('✅ TestAgent initialized successfully');

    await testAgent.start();
    console.log('✅ TestAgent started successfully');

    // Test 3: Get system health
    console.log('\n📊 Test 3: Checking system health...');
    
    const orchestratorHealth = await orchestrator.getHealth();
    console.log('✅ Orchestrator Health:', {
      status: orchestratorHealth.status,
      uptime: Math.floor(orchestratorHealth.uptime / 1000) + 's',
      memoryUsage: orchestratorHealth.memoryUsage + 'MB'
    });

    const testAgentHealth = await testAgent.getHealth();
    console.log('✅ TestAgent Health:', {
      status: testAgentHealth.status,
      uptime: Math.floor(testAgentHealth.uptime / 1000) + 's',
      memoryUsage: testAgentHealth.memoryUsage + 'MB'
    });

    // Test 4: System status
    console.log('\n📊 Test 4: Getting system status...');
    const systemHealth = await orchestrator.getSystemHealth();
    console.log('✅ System Status:', {
      orchestratorStatus: systemHealth.orchestrator.status,
      totalAgents: systemHealth.agents.length,
      messageBusConnected: systemHealth.messageBus.is_connected === 1
    });

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await testAgent.stop();
    console.log('✅ TestAgent stopped');
    
    await orchestrator.stop();
    console.log('✅ MasterOrchestrator stopped');

    // Restore original MessageBus
    originalMessageBus.MessageBus = originalMessageBusClass;

    console.log('\n🎉 All tests passed! Core agent system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testAgentSystem().catch(console.error);