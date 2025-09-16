import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from '@/shared/interfaces/BaseAgent.js';
import { MessageBus } from '@/shared/communication/MessageBus.js';
import type {
  AgentMessage,
  AgentConfig,
  AgentRegistry,
  AgentHealth,
  AgentType,
} from '@/shared/types/index.js';

export interface OrchestratorConfig extends AgentConfig {
  messageBusConfig: {
    redisUrl: string;
    channelPrefix: string;
    requestTimeout: number;
    maxRetries: number;
  };
}

export class MasterOrchestratorAgent extends BaseAgent {
  private messageBus: MessageBus;
  private registeredAgents: Map<string, AgentRegistry> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor(config: OrchestratorConfig) {
    super(config);
    
    // Initialize message bus
    this.messageBus = new MessageBus(config.messageBusConfig);
    
    // Initialize SimStudio services for privacy-aware coordination
    this.privacyManager = new PrivacyManager();
    this.modelRegistry = new ModelRegistry();
    this.syncEngine = new SyncEngine();
    
    this.messageBus.on('disconnected', () => {
      console.log('Master Orchestrator: MessageBus disconnected');
    });
    
    this.messageBus.on('message-received', (message: AgentMessage) => {
      this.incrementMetric('total_messages_processed');
    });
  }

  protected async onInitialize(): Promise<void> {
    // Connect to message bus
    await this.messageBus.connect();
    
    // Subscribe to messages
    await this.messageBus.subscribe(this.id, this.handleMessage.bind(this));
    
    // Start health monitoring of registered agents
    this.startAgentHealthMonitoring();
    
    console.log('Master Orchestrator initialized and ready');
  }

  protected async onStart(): Promise<void> {
    // Broadcast system startup
    await this.messageBus.broadcast({
      event: 'system-startup',
      orchestratorId: this.id,
      timestamp: Date.now()
    }, this.id);
    
    console.log('Master Orchestrator started and announced system startup');
  }

  protected async onStop(): Promise<void> {
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    // Broadcast system shutdown
    await this.messageBus.broadcast({
      event: 'system-shutdown',
      orchestratorId: this.id,
      timestamp: Date.now()
    }, this.id);
    
    // Disconnect from message bus
    await this.messageBus.disconnect();
    
    console.log('Master Orchestrator stopped');
  }

  protected async onHandleMessage(message: AgentMessage): Promise<AgentMessage | void> {
    switch (message.type) {
      case 'request':
        return await this.handleRequest(message);
      
      case 'event':
        await this.handleEvent(message);
        break;
        
      case 'heartbeat':
        await this.handleHeartbeat(message);
        break;
        
      default:
        console.warn(`Unknown message type received: ${message.type}`);
    }
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    await this.messageBus.sendMessage(message);
  }

  protected async onConfigUpdate(config: Partial<AgentConfig>): Promise<void> {
    console.log('Master Orchestrator config updated:', config);
    // Handle config updates if needed
  }

  private async handleRequest(message: AgentMessage): Promise<AgentMessage> {
    const { payload } = message;
    
    try {
      switch (payload.action) {
        case 'register-agent':
          return await this.handleAgentRegistration(message);
          
        case 'unregister-agent':
          return await this.handleAgentUnregistration(message);
          
        case 'get-system-status':
          return await this.handleSystemStatusRequest(message);
          
        case 'get-agent-list':
          return await this.handleAgentListRequest(message);
          
        case 'route-query':
          return await this.handleQueryRouting(message);
          
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
      case 'agent-started':
        console.log(`Agent started: ${message.source}`);
        this.incrementMetric('agents_started');
        break;
        
      case 'agent-stopped':
        console.log(`Agent stopped: ${message.source}`);
        this.incrementMetric('agents_stopped');
        this.registeredAgents.delete(message.source);
        break;
        
      case 'agent-error':
        console.error(`Agent error from ${message.source}:`, payload.error);
        this.incrementMetric('agent_errors');
        await this.handleAgentError(message.source, payload.error);
        break;
        
      default:
        console.log(`Received event: ${payload.event} from ${message.source}`);
    }
  }

  private async handleHeartbeat(message: AgentMessage): Promise<void> {
    const agentId = message.source;
    const agent = this.registeredAgents.get(agentId);
    
    if (agent) {
      agent.lastSeen = Date.now();
      agent.status = 'ready'; // Assume healthy if sending heartbeat
      this.registeredAgents.set(agentId, agent);
    }
    
    this.incrementMetric('heartbeats_received');
  }

  private async handleAgentRegistration(message: AgentMessage): Promise<AgentMessage> {
    const { agentId, type, version, capabilities, endpoints } = message.payload as {
      agentId: string;
      type: AgentType;
      version: string;
      capabilities: string[];
      endpoints: string[];
    };

    const registration: AgentRegistry = {
      agentId,
      type,
      version,
      capabilities,
      endpoints,
      status: 'ready',
      registeredAt: Date.now(),
      lastSeen: Date.now(),
      metadata: (message.payload.metadata as Record<string, unknown>) || { description: 'No metadata provided' }
    };

    this.registeredAgents.set(agentId, registration);
    this.incrementMetric('registered_agents');
    
    console.log(`Agent registered: ${agentId} (${type})`);

    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        registration
      },
      timestamp: Date.now(),
      correlationId: message.correlationId,
      priority: 'normal'
    };
  }

  private async handleAgentUnregistration(message: AgentMessage): Promise<AgentMessage> {
    const { agentId } = message.payload as { agentId: string };
    
    const existed = this.registeredAgents.delete(agentId);
    
    if (existed) {
      this.incrementMetric('unregistered_agents');
      console.log(`Agent unregistered: ${agentId}`);
    }

    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        existed
      },
      timestamp: Date.now(),
      correlationId: message.correlationId,
      priority: 'normal'
    };
  }

  private async handleSystemStatusRequest(message: AgentMessage): Promise<AgentMessage> {
    const health = await this.getHealth();
    const busMetrics = this.messageBus.getMetrics();
    
    const systemStatus = {
      orchestrator: health,
      messageBus: busMetrics,
      registeredAgents: Array.from(this.registeredAgents.values()),
      totalAgents: this.registeredAgents.size,
      timestamp: Date.now()
    };

    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        systemStatus
      },
      timestamp: Date.now(),
      correlationId: message.correlationId,
      priority: 'normal'
    };
  }

  private async handleAgentListRequest(message: AgentMessage): Promise<AgentMessage> {
    const agents = Array.from(this.registeredAgents.values());

    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: true,
        agents
      },
      timestamp: Date.now(),
      correlationId: message.correlationId,
      priority: 'normal'
    };
  }

  private async handleQueryRouting(message: AgentMessage): Promise<AgentMessage> {
    // This will be implemented when we have other agents
    // For now, return a placeholder response
    
    return {
      id: uuidv4(),
      type: 'response',
      source: this.id,
      target: message.source,
      payload: {
        success: false,
        error: 'Query routing not yet implemented'
      },
      timestamp: Date.now(),
      correlationId: message.correlationId,
      priority: 'normal'
    };
  }

  private async handleAgentError(agentId: string, error: any): Promise<void> {
    const agent = this.registeredAgents.get(agentId);
    
    if (agent) {
      // Mark agent as degraded
      agent.status = 'degraded';
      this.registeredAgents.set(agentId, agent);
      
      // Check if restart is needed (implement restart logic here)
      console.warn(`Agent ${agentId} reported error, marked as degraded`);
    }
  }

  private startAgentHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      const now = Date.now();
      const staleThreshold = 60000; // 60 seconds
      
      for (const [agentId, agent] of this.registeredAgents) {
        if (now - agent.lastSeen > staleThreshold) {
          agent.status = 'failed';
          this.registeredAgents.set(agentId, agent);
          console.warn(`Agent ${agentId} appears to be stale (last seen ${Math.floor((now - agent.lastSeen) / 1000)}s ago)`);
        }
      }
      
      this.setMetric('healthy_agents', Array.from(this.registeredAgents.values()).filter(a => a.status === 'ready').length);
      this.setMetric('total_registered_agents', this.registeredAgents.size);
      
    }, 30000); // Check every 30 seconds
  }

  // Public methods for API access
  public async getRegisteredAgents(): Promise<AgentRegistry[]> {
    return Array.from(this.registeredAgents.values());
  }

  public async getSystemHealth(): Promise<{
    orchestrator: AgentHealth;
    messageBus: Record<string, number>;
    agents: AgentRegistry[];
  }> {
    return {
      orchestrator: await this.getHealth(),
      messageBus: this.messageBus.getMetrics(),
      agents: Array.from(this.registeredAgents.values())
    };
  }
}