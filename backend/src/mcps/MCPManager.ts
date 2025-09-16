import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface MCPConfig {
  version: string;
  mcps: Record<string, MCPInstance>;
  communication: CommunicationConfig;
}

export interface MCPInstance {
  name: string;
  path: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface CommunicationConfig {
  protocol: 'stdio' | 'tcp' | 'websocket';
  timeout: number;
  retry_attempts: number;
  health_check_interval: number;
}

export class MCPManager extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private config: MCPConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(configPath: string = './src/mcps/mcp-config.json') {
    super();
    this.config = JSON.parse(readFileSync(configPath, 'utf8'));
  }

  async initialize(): Promise<void> {
    console.log('🔌 Initializing MCP Manager...');
    
    for (const [name, instance] of Object.entries(this.config.mcps)) {
      if (instance.enabled) {
        await this.startMCP(name, instance);
      }
    }

    this.startHealthCheck();
    console.log('✅ MCP Manager initialized successfully');
  }

  private async startMCP(name: string, instance: MCPInstance): Promise<void> {
    try {
      console.log(`🚀 Starting MCP: ${name}`);
      
      const process = spawn('node', [instance.path], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '../..'),
        env: {
          ...process.env,
          MCP_CONFIG: JSON.stringify(instance.config)
        }
      });

      process.on('error', (error) => {
        console.error(`❌ MCP ${name} error:`, error);
        this.emit('mcp_error', name, error);
      });

      process.on('exit', (code) => {
        console.log(`🛑 MCP ${name} exited with code ${code}`);
        this.processes.delete(name);
        this.emit('mcp_exit', name, code);
      });

      this.processes.set(name, process);
      this.emit('mcp_started', name);
      
    } catch (error) {
      console.error(`Failed to start MCP ${name}:`, error);
      throw error;
    }
  }

  async sendRequest(mcpName: string, request: any): Promise<any> {
    const process = this.processes.get(mcpName);
    if (!process || !process.stdin) {
      throw new Error(`MCP ${mcpName} not available`);
    }

    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      const message = JSON.stringify({ ...request, id: requestId });

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for MCP ${mcpName}`));
      }, this.config.communication.timeout);

      const responseHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === requestId) {
            clearTimeout(timeout);
            process.stdout?.off('data', responseHandler);
            resolve(response);
          }
        } catch (error) {
          // Ignore parse errors, might be partial data
        }
      };

      process.stdout?.on('data', responseHandler);
      process.stdin.write(message + '\n');
    });
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, process] of this.processes) {
        try {
          await this.sendRequest(name, { method: 'health_check' });
        } catch (error) {
          console.warn(`⚠️  Health check failed for MCP ${name}:`, error);
          // Could restart MCP here if needed
        }
      }
    }, this.config.communication.health_check_interval);
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down MCP Manager...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const shutdownPromises = Array.from(this.processes.entries()).map(([name, process]) => {
      return new Promise<void>((resolve) => {
        process.on('exit', () => resolve());
        process.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    });

    await Promise.all(shutdownPromises);
    this.processes.clear();
    console.log('✅ MCP Manager shutdown complete');
  }

  getMCPStatus(): Record<string, { running: boolean; pid?: number }> {
    const status: Record<string, { running: boolean; pid?: number }> = {};
    
    for (const [name, process] of this.processes) {
      status[name] = {
        running: !process.killed,
        pid: process.pid
      };
    }

    return status;
  }
}
