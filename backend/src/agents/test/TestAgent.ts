import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from '@/shared/interfaces/BaseAgent.js';
import { MessageBus } from '@/shared/communication/MessageBus.js';
import type {
  AgentMessage,
  AgentConfig,
  AgentType,
} from '@/shared/types/index.js';

export interface TestAgentConfig extends AgentConfig {
  messageBusConfig: {
    redisUrl: string;
    channelPrefix: string;
    requestTimeout: number;
    maxRetries: number;
  };
}

export class TestAgent extends BaseAgent {
  private messageBus: MessageBus;
  private orchestratorId: string = 'master-orchestrator';
  
  constructor(config: TestAgentConfig) {
    super(config);
    this.messageBus = new MessageBus(config.messageBusConfig);
  }

  protected async onInitialize(): Promise<void> {
    // Connect to message bus
    await this.messageBus.connect();
    
    // Subscribe to messages
    await this.messageBus.subscribe(this.id, this.handleMessage.bind(this));
    
    console.log(`Test Agent ${this.id} initialized`);
  }

  protected async onStart(): Promise<void> {
    // Register with orchestrator
    try {
      const response = await this.messageBus.request(this.id, this.orchestratorId, {
        action: 'register-agent',
        agentId: this.id,
        type: this.type,
        version: this.version,
        capabilities: ['test', 'ping', 'echo'],
        endpoints: [],
        metadata: {
          description: 'Test agent for validating communication framework'
        }
      });
      
      console.log('Test Agent registration response:', response.payload);
      
      // Start sending periodic test messages
      this.startPeriodicTesting();
      
    } catch (error) {
      console.error('Failed to register Test Agent:', error);
      throw error;
    }
  }

  protected async onStop(): Promise<void> {
    // Unregister from orchestrator
    try {
      await this.messageBus.request(this.id, this.orchestratorId, {
        action: 'unregister-agent',
        agentId: this.id
      });
      
      console.log('Test Agent unregistered');
    } catch (error) {
      console.error('Failed to unregister Test Agent:', error);
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
        console.log(`Test Agent received ${message.type} message from ${message.source}`);
    }
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    await this.messageBus.sendMessage(message);
  }

  protected async onConfigUpdate(config: Partial<AgentConfig>): Promise<void> {
    console.log('Test Agent config updated:', config);
  }

  private async handleRequest(message: AgentMessage): Promise<AgentMessage> {
    const { payload } = message;
    
    try {
      switch (payload.action) {
        case 'ping':
          return this.handlePing(message);
          
        case 'echo':
          return this.handleEcho(message);
          
        case 'status':
          return this.handleStatus(message);
          
        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }
    } catch (error) {
      return {
        id: uuidv4(),
        type: 'response',
        source: this.id,
        target: message.source,
        payload: {
          success: false,
          error: (error as Error).message
        },
        timestamp: Date.now(),
        correlationId: message.correlationId,
        priority: 'normal'
      };
    }
  }

  private async handleEvent(message: AgentMessage): Promise<void> {
    const { payload } = message;
    
    switch (payload.event) {
      case 'system-startup':
        console.log('Test Agent: System startup detected');
        this.incrementMetric('system_startups_seen');
        break;
        
      case 'system-shutdown':
        console.log('Test Agent: System shutdown detected');
        this.incrementMetric('system_shutdowns_seen');
        break;
        
      default:
        console.log(`Test Agent received event: ${payload.event}`);
    }
  }

  private handlePing(message: AgentMessage): AgentMessage {
    this.incrementMetric('pings_received');
    
    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        message: 'pong',
        timestamp: Date.now(),
        agentId: this.id
      },
      timestamp: Date.now(),
      correlationId: message.correlationId,
      priority: 'normal'
    };
  }

  private handleEcho(message: AgentMessage): AgentMessage {
    this.incrementMetric('echoes_received');
    
    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        echo: message.payload.data,
        originalMessage: message.payload
      },
      timestamp: Date.now(),
      correlationId: message.correlationId,
      priority: 'normal'
    };
  }

  private async handleStatus(message: AgentMessage): Promise<AgentMessage> {
    const health = await this.getHealth();
    
    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        health,
        capabilities: ['test', 'ping', 'echo'],
        status: 'operational'
      },
      timestamp: Date.now(),
      correlationId: message.correlationId,
      priority: 'normal'
    };
  }

  private startPeriodicTesting(): void {
    // Send a test message every 60 seconds
    const testInterval = setInterval(async () => {
      try {
        console.log('Test Agent: Requesting system status...');
        
        const response = await this.messageBus.request(this.id, this.orchestratorId, {
          action: 'get-system-status'
        }, 5000); // 5 second timeout
        
        if (response.payload.success) {
          const { systemStatus } = response.payload;
          console.log(`System Status: ${(systemStatus as any).totalAgents} agents registered`);
          this.incrementMetric('status_checks_completed');
        }
        
      } catch (error) {
        console.error('Test Agent: Failed to get system status:', error);
        this.incrementMetric('status_checks_failed');
      }
    }, 60000);
    
    // Clean up on stop
    this.once('stopped', () => {
      clearInterval(testInterval);
    });
  }
}