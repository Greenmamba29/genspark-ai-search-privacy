import { MessageBus } from '@/shared/communication/MessageBus.js';
import { v4 as uuidv4 } from 'uuid';
import type { AgentMessage } from '@/shared/types/index.js';

async function testMessageBus() {
  console.log('🧪 Testing MessageBus communication...');
  
  const config = {
    redisUrl: 'redis://localhost:6379',
    channelPrefix: 'test',
    requestTimeout: 5000,
    maxRetries: 3
  };
  
  // Create two message bus instances to simulate different agents
  const orchestratorBus = new MessageBus(config);
  const agentBus = new MessageBus(config);
  
  try {
    // Connect both buses
    await orchestratorBus.connect();
    await agentBus.connect();
    console.log('✅ Both MessageBus instances connected');
    
    // Subscribe orchestrator to handle requests
    await orchestratorBus.subscribe('orchestrator', async (message: AgentMessage): Promise<void> => {
      console.log('📨 Orchestrator received:', message.type, message.payload);
      
      if (message.type === 'request' && message.payload.action === 'ping') {
        // Send response
        const response: AgentMessage = {
          id: uuidv4(),
          type: 'response',
          source: 'orchestrator',
          target: message.source,
          payload: {
            success: true,
            message: 'pong',
            timestamp: Date.now()
          },
          timestamp: Date.now(),
          correlationId: message.correlationId,
          priority: 'normal'
        };
        
        console.log('📤 Orchestrator sending response:', response);
        await orchestratorBus.sendMessage(response);
        await orchestratorBus.sendMessage(response);
      }
    });
    
    // Subscribe agent to receive responses
    await agentBus.subscribe('test-agent', async (message: AgentMessage) => {
      console.log('📨 Agent received:', message.type, message.payload);
    });
    
    console.log('✅ Both agents subscribed');
    
    // Wait a moment for subscriptions to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test request/response
    console.log('🔄 Testing request/response...');
    
    try {
      const response = await agentBus.request('test-agent', 'orchestrator', {
        action: 'ping',
        data: 'test data'
      }, 3000);
      
      console.log('✅ Request successful! Response:', response.payload);
    } catch (error) {
      console.error('❌ Request failed:', error);
    }
    
    // Test broadcast
    console.log('🔄 Testing broadcast...');
    await orchestratorBus.broadcast({
      event: 'test-broadcast',
      message: 'Hello all agents!'
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    await orchestratorBus.disconnect();
    await agentBus.disconnect();
    console.log('✅ Test completed');
  }
}

// Run the test
testMessageBus().catch(console.error);