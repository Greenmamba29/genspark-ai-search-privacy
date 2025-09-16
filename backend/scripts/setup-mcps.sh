#!/bin/bash
set -e

echo "🔌 Setting up MCP integrations for GenSpark AI Search..."

# Create MCP directory structure
mkdir -p src/mcps/{filesystem,search,vector-db,nlp-models}
mkdir -p data/mcps
mkdir -p logs/mcps

# 1. Install Filesystem MCP Server
echo "📁 Installing Filesystem MCP Server..."
cd src/mcps/filesystem
if [ ! -d "filesystem-mcp-server" ]; then
    git clone https://github.com/cyanheads/filesystem-mcp-server.git
    cd filesystem-mcp-server
    npm install
    cd ..
fi

# 2. Install File Search MCP
echo "🔍 Installing File Search MCP..."
cd ../search
if [ ! -d "file-search-mcp" ]; then
    git clone https://github.com/Kurogoma4D/file-search-mcp.git
    cd file-search-mcp
    npm install
    cd ..
fi

# 3. Install AI-Enhanced Filesystem MCP
echo "🤖 Installing AI-Enhanced Filesystem MCP..."
if [ ! -d "mcp-filesystem-server-ai-enhanced" ]; then
    git clone https://github.com/canfieldjuan/mcp-filesystem-server-ai-enhanced.git
    cd mcp-filesystem-server-ai-enhanced
    npm install
    cd ..
fi

# 4. Install Local Documentation MCP
echo "📚 Installing Local Documentation MCP..."
cd ../nlp-models
if [ ! -d "seta-mcp" ]; then
    git clone https://github.com/techformist/seta-mcp.git
    cd seta-mcp
    npm install
    cd ..
fi

# Return to backend root
cd ../../..

# Create MCP configuration
echo "⚙️ Creating MCP configuration..."
cat > src/mcps/mcp-config.json << 'EOF'
{
  "version": "1.0.0",
  "mcps": {
    "filesystem": {
      "name": "filesystem-mcp-server",
      "path": "./src/mcps/filesystem/filesystem-mcp-server",
      "enabled": true,
      "config": {
        "max_file_size": "100MB",
        "allowed_extensions": [".pdf", ".docx", ".txt", ".md", ".js", ".ts", ".py", ".json", ".csv", ".xlsx"],
        "watch_directories": ["../../../test-files"],
        "search_depth": 10,
        "enable_search": true,
        "enable_replace": false
      }
    },
    "search": {
      "name": "file-search-mcp",
      "path": "./src/mcps/search/file-search-mcp",
      "enabled": true,
      "config": {
        "index_path": "../../data/mcps/search-index",
        "supported_formats": ["txt", "md", "js", "ts", "py", "json", "csv"],
        "max_results": 100,
        "fuzzy_search": true,
        "semantic_search": true
      }
    },
    "ai_filesystem": {
      "name": "mcp-filesystem-server-ai-enhanced",
      "path": "./src/mcps/search/mcp-filesystem-server-ai-enhanced",
      "enabled": true,
      "config": {
        "ai_model": "local",
        "semantic_threshold": 0.7,
        "content_analysis": true,
        "batch_size": 32
      }
    },
    "documentation": {
      "name": "seta-mcp",
      "path": "./src/mcps/nlp-models/seta-mcp",
      "enabled": true,
      "config": {
        "docs_path": "../../../docs",
        "index_interval": 300000,
        "embedding_model": "all-MiniLM-L6-v2"
      }
    }
  },
  "communication": {
    "protocol": "stdio",
    "timeout": 30000,
    "retry_attempts": 3,
    "health_check_interval": 60000
  }
}
EOF

# Create MCP manager
echo "🏗️ Creating MCP Manager..."
cat > src/mcps/MCPManager.ts << 'EOF'
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
EOF

# Create MCP integration for existing agents
echo "🤝 Creating MCP integration utilities..."
cat > src/mcps/MCPIntegration.ts << 'EOF'
import { MCPManager } from './MCPManager.js';
import type { FileContent, SearchQuery, SearchResult } from '../shared/types/index.js';

export class MCPIntegration {
  private mcpManager: MCPManager;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
  }

  // File system operations
  async searchFiles(query: SearchQuery): Promise<SearchResult[]> {
    try {
      const response = await this.mcpManager.sendRequest('search', {
        method: 'search',
        params: {
          query: query.text,
          path: query.path || './test-files',
          options: {
            fuzzy: true,
            semantic: true,
            max_results: query.limit || 50
          }
        }
      });

      return response.results || [];
    } catch (error) {
      console.error('MCP file search error:', error);
      return [];
    }
  }

  // Enhanced file content reading
  async readFileContent(filePath: string): Promise<FileContent | null> {
    try {
      const response = await this.mcpManager.sendRequest('filesystem', {
        method: 'read_file',
        params: {
          path: filePath,
          options: {
            extract_metadata: true,
            content_analysis: true
          }
        }
      });

      return response.content || null;
    } catch (error) {
      console.error('MCP file read error:', error);
      return null;
    }
  }

  // AI-enhanced content analysis
  async analyzeContent(content: string, contentType: string): Promise<any> {
    try {
      const response = await this.mcpManager.sendRequest('ai_filesystem', {
        method: 'analyze_content',
        params: {
          content,
          content_type: contentType,
          options: {
            extract_entities: true,
            classify_intent: true,
            generate_summary: true
          }
        }
      });

      return response.analysis || {};
    } catch (error) {
      console.error('MCP content analysis error:', error);
      return {};
    }
  }

  // Documentation search
  async searchDocumentation(query: string): Promise<any[]> {
    try {
      const response = await this.mcpManager.sendRequest('documentation', {
        method: 'search_docs',
        params: {
          query,
          options: {
            semantic_threshold: 0.7,
            max_results: 20
          }
        }
      });

      return response.results || [];
    } catch (error) {
      console.error('MCP documentation search error:', error);
      return [];
    }
  }
}
EOF

# Create package.json dependencies for MCPs
echo "📦 Adding MCP dependencies to package.json..."
npm install --save-dev @types/node

echo "✅ MCP setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Run the MCP setup: npm run setup-mcps"
echo "2. Update your agents to use MCP integration"
echo "3. Test MCP functionality with: npm run test-mcps"
echo ""
echo "📁 Created files:"
echo "  - src/mcps/mcp-config.json (MCP configuration)"
echo "  - src/mcps/MCPManager.ts (MCP process manager)"
echo "  - src/mcps/MCPIntegration.ts (Integration utilities)"
echo "  - scripts/setup-mcps.sh (This setup script)"