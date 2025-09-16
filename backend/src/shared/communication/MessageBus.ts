import { EventEmitter } from 'events';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import type { AgentMessage } from '@/shared/types/index.js';

export interface MessageBusConfig {
  redisUrl: string;
  channelPrefix: string;
  requestTimeout: number;
  maxRetries: number;
}

export interface MessageHandler {
  (message: AgentMessage): Promise<AgentMessage | void>;
}

export interface PendingRequest {
  resolve: (value: AgentMessage) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

export class MessageBus extends EventEmitter {
  private config: MessageBusConfig;
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private connected: boolean = false;
  private handlers: Map<string, MessageHandler> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private subscriptions: Set<string> = new Set();

  constructor(config: MessageBusConfig) {
    super();
    this.config = config;
    
    // Create Redis clients
    this.publisher = createClient({ url: config.redisUrl });
    this.subscriber = createClient({ url: config.redisUrl });
    
    // Set up error handlers
    this.publisher.on('error', this.handleRedisError.bind(this, 'publisher'));
    this.subscriber.on('error', this.handleRedisError.bind(this, 'subscriber'));
    
    // Set up message handling - Redis v4 uses different event pattern
    // this.subscriber.on('message', this.handleIncomingMessage.bind(this));
  }

  public async connect(): Promise<void> {
    try {
      await Promise.all([
        this.publisher.connect(),
        this.subscriber.connect()
      ]);
      
      this.connected = true;
      this.emit('connected');
      console.log('MessageBus connected to Redis');
    } catch (error) {
      console.error('Failed to connect MessageBus to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      // Clear all pending requests
      for (const [id, request] of this.pendingRequests) {
        clearTimeout(request.timeout);
        request.reject(new Error('MessageBus disconnecting'));
      }
      this.pendingRequests.clear();
      
      // Safely disconnect Redis clients
      const disconnectPromises = [];
      
      if (this.publisher.isOpen) {
        disconnectPromises.push(this.publisher.quit());
      }
      
      if (this.subscriber.isOpen) {
        disconnectPromises.push(this.subscriber.quit());
      }
      
      if (disconnectPromises.length > 0) {
        await Promise.all(disconnectPromises);
      }
      
      this.connected = false;
      this.emit('disconnected');
      console.log('MessageBus disconnected from Redis');
    } catch (error) {
      console.error('Error disconnecting MessageBus:', error);
      throw error;
    }
  }

  public async subscribe(agentId: string, handler: MessageHandler): Promise<void> {
    if (!this.connected) {
      throw new Error('MessageBus not connected');
    }

    const channel = this.getAgentChannel(agentId);
    
    // Store handler
    this.handlers.set(agentId, handler);
    
    // Subscribe to agent-specific channel
    if (!this.subscriptions.has(channel)) {
      await this.subscriber.subscribe(channel, (message, channel) => {
        this.handleChannelMessage(message, channel).catch(error => {
          console.error('Error handling message:', error);
        });
      });
      this.subscriptions.add(channel);
    }
    
    // Subscribe to broadcast channel
    const broadcastChannel = this.getBroadcastChannel();
    if (!this.subscriptions.has(broadcastChannel)) {
      await this.subscriber.subscribe(broadcastChannel, (message, channel) => {
        this.handleChannelMessage(message, channel).catch(error => {
          console.error('Error handling broadcast message:', error);
        });
      });
      this.subscriptions.add(broadcastChannel);
    }

    console.log(`Agent ${agentId} subscribed to MessageBus`);
  }

  public async unsubscribe(agentId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('MessageBus not connected');
    }

    const channel = this.getAgentChannel(agentId);
    
    // Remove handler
    this.handlers.delete(agentId);
    
    // Unsubscribe from channel
    if (this.subscriptions.has(channel)) {
      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(channel);
    }

    console.log(`Agent ${agentId} unsubscribed from MessageBus`);
  }

  public async sendMessage(message: AgentMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('MessageBus not connected');
    }

    try {
      const serialized = JSON.stringify(message);
      
      if (message.target === '*') {
        // Broadcast message
        const channel = this.getBroadcastChannel();
        await this.publisher.publish(channel, serialized);
      } else {
        // Direct message
        const channel = this.getAgentChannel(message.target);
        await this.publisher.publish(channel, serialized);
      }

      this.emit('message-sent', message);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  public async request(
    sourceAgentId: string,
    targetAgentId: string,
    payload: Record<string, unknown>,
    timeout: number = this.config.requestTimeout
  ): Promise<AgentMessage> {
    if (!this.connected) {
      throw new Error('MessageBus not connected');
    }

    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const correlationId = uuidv4();
      
      // Create timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
      
      // Store pending request
      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutHandle
      });
      
      // Send request message
      const message: AgentMessage = {
        id: requestId,
        type: 'request',
        source: sourceAgentId,
        target: targetAgentId,
        payload,
        timestamp: Date.now(),
        correlationId,
        priority: 'normal'
      };
      
      this.sendMessage(message).catch(error => {
        this.pendingRequests.delete(correlationId);
        clearTimeout(timeoutHandle);
      });
    });
  }

  public async broadcast(
    payload: Record<string, unknown>,
    sourceAgentId: string = 'message-bus'
  ): Promise<void> {
    const message: AgentMessage = {
      id: uuidv4(),
      type: 'event',
      source: sourceAgentId,
      target: '*',
      payload,
      timestamp: Date.now(),
      priority: 'normal'
    };

    await this.sendMessage(message);
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getMetrics(): Record<string, number> {
    return {
      connected_clients: this.handlers.size,
      pending_requests: this.pendingRequests.size,
      active_subscriptions: this.subscriptions.size,
      is_connected: this.connected ? 1 : 0
    };
  }

  private async handleChannelMessage(message: string, channel: string): Promise<void> {
    try {
      const agentMessage: AgentMessage = JSON.parse(message);
      
      // Handle response to pending request
      if (agentMessage.type === 'response' && agentMessage.correlationId) {
        const pending = this.pendingRequests.get(agentMessage.correlationId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(agentMessage.correlationId);
          pending.resolve(agentMessage);
          return;
        }
      }
      
      // Determine target agent(s)
      let targetAgents: string[] = [];
      
      if (channel === this.getBroadcastChannel()) {
        // Broadcast - send to all subscribed agents
        targetAgents = Array.from(this.handlers.keys());
      } else {
        // Direct message - extract agent ID from channel
        const agentId = this.extractAgentIdFromChannel(channel);
        if (agentId && this.handlers.has(agentId)) {
          targetAgents = [agentId];
        }
      }
      
      // Process message for each target agent
      for (const agentId of targetAgents) {
        const handler = this.handlers.get(agentId);
        if (handler) {
          try {
            const response = await handler(agentMessage);
            
            // Send response back if provided
            if (response && agentMessage.type === 'request') {
              response.correlationId = agentMessage.correlationId;
              await this.sendMessage(response);
            }
          } catch (error) {
            console.error(`Error handling message in agent ${agentId}:`, error);
            
            // Send error response for requests
            if (agentMessage.type === 'request') {
              const errorResponse: AgentMessage = {
                id: uuidv4(),
                type: 'response',
                source: agentId,
                target: agentMessage.source,
                payload: {
                  success: false,
                  error: (error as Error).message
                },
                timestamp: Date.now(),
                correlationId: agentMessage.correlationId,
                priority: 'normal'
              };
              await this.sendMessage(errorResponse);
            }
          }
        }
      }
      
      this.emit('message-received', agentMessage);
    } catch (error) {
      console.error('Error processing channel message:', error);
    }
  }

  private handleIncomingMessage(message: string, channel: string): void {
    // Delegate to async handler
    this.handleChannelMessage(message, channel).catch(error => {
      console.error('Error in handleIncomingMessage:', error);
    });
  }

  private handleRedisError(clientType: string, error: Error): void {
    console.error(`Redis ${clientType} error:`, error);
    this.emit('error', error);
  }

  private getAgentChannel(agentId: string): string {
    return `${this.config.channelPrefix}:agent:${agentId}`;
  }

  private getBroadcastChannel(): string {
    return `${this.config.channelPrefix}:broadcast`;
  }

  private extractAgentIdFromChannel(channel: string): string | null {
    const prefix = `${this.config.channelPrefix}:agent:`;
    if (channel.startsWith(prefix)) {
      return channel.substring(prefix.length);
    }
    return null;
  }
}