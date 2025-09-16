import { MasterOrchestratorAgent, type OrchestratorConfig } from '@/agents/orchestrator/MasterOrchestrator.js';
import { TestAgent, type TestAgentConfig } from '@/agents/test/TestAgent.js';
import type { SystemConfig } from '@/shared/types/index.js';

// System configuration
const systemConfig: SystemConfig = {
  agents: {
    'master-orchestrator': {
      agentId: 'master-orchestrator',
      type: 'orchestrator',
      enabled: true,
      restartOnFailure: true,
      dependencies: []
    },
    'test-agent-1': {
      agentId: 'test-agent-1',
      type: 'file-processing', // Using file-processing type for the test
      enabled: true,
      restartOnFailure: true,
      dependencies: ['master-orchestrator']
    },
  },
  mcps: {},
  database: {
    type: 'sqlite',
    path: process.env.DATABASE_PATH || './data/genspark.db'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    format: 'text',
    outputs: ['console']
  },
  performance: {
    maxConcurrentOperations: 100,
    requestTimeout: 30000,
    healthCheckInterval: 30000
  }
};

class AgentSystem {
  private orchestrator?: MasterOrchestratorAgent;
  private testAgent?: TestAgent;
  private shutdownGracefully = false;

  constructor() {
    // Handle graceful shutdown
    process.on('SIGTERM', this.handleShutdown.bind(this));
    process.on('SIGINT', this.handleShutdown.bind(this));
    process.on('uncaughtException', this.handleError.bind(this));
    process.on('unhandledRejection', this.handleError.bind(this));
  }

  async start(): Promise<void> {
    console.log('🚀 Starting GenSpark AI Search Agent System...');
    
    try {
      // Start Master Orchestrator
      await this.startOrchestrator();
      
      // Wait a moment for orchestrator to be ready
      await this.sleep(2000);
      
      // Start Test Agent
      await this.startTestAgent();
      
      console.log('✅ Agent System started successfully!');
      console.log('📊 System Status:');
      console.log(`   - Orchestrator: ${this.orchestrator?.id || 'Not started'}`);
      console.log(`   - Test Agent: ${this.testAgent?.id || 'Not started'}`);
      console.log(`   - Redis URL: ${systemConfig.redis.url}`);
      console.log(`   - Database: ${systemConfig.database.path}`);
      
      // Display system health every 30 seconds
      this.startStatusReporting();
      
    } catch (error) {
      console.error('❌ Failed to start Agent System:', error);
      await this.stop();
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping Agent System...');
    this.shutdownGracefully = true;
    
    try {
      // Stop agents in reverse order      
      if (this.testAgent) {
        console.log('Stopping Test Agent...');
        await this.testAgent.stop();
      }
      
      if (this.orchestrator) {
        console.log('Stopping Master Orchestrator...');
        await this.orchestrator.stop();
      }
      
      console.log('✅ Agent System stopped successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  private async startOrchestrator(): Promise<void> {
    const config: OrchestratorConfig = {
      agentId: 'master-orchestrator',
      type: 'orchestrator' as const,
      enabled: true,
      ...systemConfig.agents['master-orchestrator'],
      messageBusConfig: {
        redisUrl: systemConfig.redis.url,
        channelPrefix: 'genspark',
        requestTimeout: systemConfig.performance.requestTimeout,
        maxRetries: 3
      }
    };

    this.orchestrator = new MasterOrchestratorAgent(config);
    
    await this.orchestrator.initialize();
    await this.orchestrator.start();
    
    console.log('✅ Master Orchestrator started');
  }

  private async startTestAgent(): Promise<void> {
    const config: TestAgentConfig = {
      agentId: 'test-agent-1',
      type: 'file-processing' as const,
      enabled: true,
      ...systemConfig.agents['test-agent-1'],
      messageBusConfig: {
        redisUrl: systemConfig.redis.url,
        channelPrefix: 'genspark',
        requestTimeout: systemConfig.performance.requestTimeout,
        maxRetries: 3
      }
    };

    this.testAgent = new TestAgent(config);
    
    await this.testAgent.initialize();
    await this.testAgent.start();
    
    console.log('✅ Test Agent started');
  }


  private startStatusReporting(): void {
    const statusInterval = setInterval(async () => {
      if (this.shutdownGracefully) {
        clearInterval(statusInterval);
        return;
      }
      
      try {
        if (this.orchestrator) {
          const systemHealth = await this.orchestrator.getSystemHealth();
          
          console.log('\n📊 System Health Report:');
          console.log(`   Orchestrator Status: ${systemHealth.orchestrator.status}`);
          console.log(`   Uptime: ${Math.floor(systemHealth.orchestrator.uptime / 1000)}s`);
          console.log(`   Memory Usage: ${systemHealth.orchestrator.memoryUsage}MB`);
          console.log(`   Registered Agents: ${systemHealth.agents.length}`);
          console.log(`   Message Bus Connected: ${systemHealth.messageBus.is_connected ? 'Yes' : 'No'}`);
          console.log(`   Pending Requests: ${systemHealth.messageBus.pending_requests}`);
          
          if (systemHealth.agents.length > 0) {
            console.log('   Agents:');
            systemHealth.agents.forEach(agent => {
              console.log(`     - ${agent.agentId} (${agent.type}): ${agent.status}`);
            });
          }
          console.log('');
        }
      } catch (error) {
        console.error('Error getting system health:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private async handleShutdown(): Promise<void> {
    console.log('\n🔄 Received shutdown signal...');
    await this.stop();
    process.exit(0);
  }

  private async handleError(error: Error): Promise<void> {
    console.error('💥 Uncaught error:', error);
    await this.stop();
    process.exit(1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the system if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const system = new AgentSystem();
  
  system.start().catch(error => {
    console.error('Failed to start system:', error);
    process.exit(1);
  });
}

export { AgentSystem, systemConfig };