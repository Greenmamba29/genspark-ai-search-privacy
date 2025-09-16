import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  AgentMessage,
  AgentHealth,
  AgentError,
  AgentType,
  AgentStatus,
  AgentConfig,
} from '@/shared/types/index.js';

export interface IAgent {
  readonly id: string;
  readonly type: AgentType;
  readonly version: string;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  
  // Communication methods
  sendMessage(message: AgentMessage): Promise<void>;
  handleMessage(message: AgentMessage): Promise<AgentMessage | void>;
  
  // Health and monitoring
  getHealth(): Promise<AgentHealth>;
  reportError(error: AgentError): void;
  
  // Configuration
  updateConfig(config: Partial<AgentConfig>): Promise<void>;
  getConfig(): AgentConfig;
}

export abstract class BaseAgent extends EventEmitter implements IAgent {
  public readonly id: string;
  public readonly type: AgentType;
  public readonly version: string;
  
  protected status: AgentStatus = 'starting';
  protected config: AgentConfig;
  protected errors: AgentError[] = [];
  protected metrics: Record<string, number> = {};
  protected startTime: number = 0;
  
  private healthInterval?: NodeJS.Timeout;
  private lastHeartbeat: number = 0;

  constructor(config: AgentConfig) {
    super();
    this.id = config.agentId;
    this.type = config.type;
    this.version = '1.0.0';
    this.config = config;
    
    // Set up error handling
    this.on('error', this.handleInternalError.bind(this));
    
    // Set up graceful shutdown
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
  }

  public async initialize(): Promise<void> {
    try {
      this.status = 'starting';
      this.startTime = Date.now();
      this.lastHeartbeat = Date.now();
      
      await this.onInitialize();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.status = 'ready';
      this.emit('initialized', { agentId: this.id });
      
      console.log(`Agent ${this.id} (${this.type}) initialized successfully`);
    } catch (error) {
      this.status = 'failed';
      const agentError: AgentError = {
        id: uuidv4(),
        agentId: this.id,
        type: 'fatal',
        message: `Failed to initialize: ${(error as Error).message}`,
        stack: (error as Error).stack,
        timestamp: Date.now(),
        context: { phase: 'initialization' }
      };
      this.reportError(agentError);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      if (this.status !== 'ready') {
        throw new Error(`Cannot start agent in ${this.status} state`);
      }
      
      await this.onStart();
      this.emit('started', { agentId: this.id });
      
      console.log(`Agent ${this.id} started successfully`);
    } catch (error) {
      this.status = 'failed';
      this.reportError({
        id: uuidv4(),
        agentId: this.id,
        type: 'fatal',
        message: `Failed to start: ${(error as Error).message}`,
        stack: (error as Error).stack,
        timestamp: Date.now(),
        context: { phase: 'start' }
      });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.status = 'stopped';
      
      // Stop health monitoring
      if (this.healthInterval) {
        clearInterval(this.healthInterval);
        this.healthInterval = undefined;
      }
      
      await this.onStop();
      this.emit('stopped', { agentId: this.id });
      
      console.log(`Agent ${this.id} stopped successfully`);
    } catch (error) {
      this.reportError({
        id: uuidv4(),
        agentId: this.id,
        type: 'error',
        message: `Error during stop: ${(error as Error).message}`,
        stack: (error as Error).stack,
        timestamp: Date.now(),
        context: { phase: 'stop' }
      });
      throw error;
    }
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.initialize();
    await this.start();
  }

  public async sendMessage(message: AgentMessage): Promise<void> {
    try {
      await this.onSendMessage(message);
      this.incrementMetric('messages_sent');
    } catch (error) {
      this.reportError({
        id: uuidv4(),
        agentId: this.id,
        type: 'error',
        message: `Failed to send message: ${(error as Error).message}`,
        timestamp: Date.now(),
        context: { messageId: message.id, target: message.target }
      });
      throw error;
    }
  }

  public async handleMessage(message: AgentMessage): Promise<AgentMessage | void> {
    try {
      this.incrementMetric('messages_received');
      this.lastHeartbeat = Date.now();
      
      const response = await this.onHandleMessage(message);
      
      if (response) {
        this.incrementMetric('messages_responded');
      }
      
      return response;
    } catch (error) {
      this.reportError({
        id: uuidv4(),
        agentId: this.id,
        type: 'error',
        message: `Failed to handle message: ${(error as Error).message}`,
        timestamp: Date.now(),
        context: { messageId: message.id, source: message.source }
      });
      
      // Return error response
      return {
        id: uuidv4(),
        type: 'error',
        source: this.id,
        target: message.source,
        payload: {
          error: (error as Error).message,
          originalMessageId: message.id
        },
        timestamp: Date.now(),
        correlationId: message.correlationId,
        priority: 'normal'
      };
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    const now = Date.now();
    const uptime = this.startTime > 0 ? now - this.startTime : 0;
    
    return {
      agentId: this.id,
      status: this.status === 'ready' ? 'healthy' : (this.status === 'degraded' || this.status === 'failed' ? this.status : 'healthy'),
      uptime,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      lastHeartbeat: this.lastHeartbeat,
      errors: this.errors.slice(-10), // Last 10 errors
      metrics: { ...this.metrics }
    };
  }

  public reportError(error: AgentError): void {
    this.errors.push(error);
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
    
    this.emit('error', error);
    
    // Log error
    console.error(`Agent ${this.id} error:`, error);
    
    // Update status if fatal
    if (error.type === 'fatal') {
      this.status = 'failed';
    } else if (error.type === 'error' && this.status === 'ready') {
      this.status = 'degraded';
    }
  }

  public async updateConfig(config: Partial<AgentConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.onConfigUpdate(config);
    this.emit('config-updated', { agentId: this.id, config });
  }

  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  // Abstract methods to be implemented by concrete agents
  protected abstract onInitialize(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onHandleMessage(message: AgentMessage): Promise<AgentMessage | void>;
  protected abstract onSendMessage(message: AgentMessage): Promise<void>;
  protected abstract onConfigUpdate(config: Partial<AgentConfig>): Promise<void>;

  // Protected utility methods
  protected incrementMetric(key: string, value: number = 1): void {
    this.metrics[key] = (this.metrics[key] || 0) + value;
  }

  protected setMetric(key: string, value: number): void {
    this.metrics[key] = value;
  }

  protected getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }

  protected getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100; // MB
  }

  protected getCpuUsage(): number {
    // Simple CPU usage estimation - in production, use more sophisticated methods
    const usage = process.cpuUsage();
    return Math.round(((usage.user + usage.system) / 1000000) * 100) / 100; // Percentage approximation
  }

  private startHealthMonitoring(): void {
    this.healthInterval = setInterval(() => {
      this.lastHeartbeat = Date.now();
      this.emit('heartbeat', { agentId: this.id, timestamp: this.lastHeartbeat });
    }, 30000); // Every 30 seconds
  }

  private handleInternalError(error: AgentError): void {
    // Already handled by reportError, but ensure we don't crash
    if (error.type === 'fatal') {
      console.error(`Fatal error in agent ${this.id}, initiating shutdown...`);
      this.gracefulShutdown();
    }
  }

  private async gracefulShutdown(): Promise<void> {
    console.log(`Graceful shutdown initiated for agent ${this.id}`);
    try {
      await this.stop();
      process.exit(0);
    } catch (error) {
      console.error(`Error during graceful shutdown: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}