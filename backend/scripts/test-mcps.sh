#!/bin/bash
set -e

echo "🧪 Testing MCP integrations for GenSpark AI Search..."

# Ensure we're in the backend directory
cd "$(dirname "$0")/.."

# Build the project first
echo "📦 Building project..."
npm run build

# Test 1: MCP Manager initialization
echo "🔌 Testing MCP Manager initialization..."
node -e "
const { MCPManager } = require('./dist/mcps/MCPManager.js');
async function test() {
  try {
    const manager = new MCPManager('./src/mcps/mcp-config.json');
    console.log('✅ MCP Manager initialized successfully');
    
    const status = manager.getMCPStatus();
    console.log('📊 MCP Status:', status);
    
    // Test shutdown
    await manager.shutdown();
    console.log('✅ MCP Manager shutdown successful');
    
  } catch (error) {
    console.error('❌ MCP Manager test failed:', error.message);
    process.exit(1);
  }
}
test();
"

# Test 2: MCP Integration utilities
echo "🤝 Testing MCP Integration utilities..."
node -e "
const { MCPManager } = require('./dist/mcps/MCPManager.js');
const { MCPIntegration } = require('./dist/mcps/MCPIntegration.js');

async function test() {
  try {
    const manager = new MCPManager('./src/mcps/mcp-config.json');
    const integration = new MCPIntegration(manager);
    
    console.log('✅ MCP Integration utilities loaded successfully');
    
    // Test methods exist
    if (typeof integration.searchFiles === 'function') {
      console.log('✅ searchFiles method available');
    }
    if (typeof integration.readFileContent === 'function') {
      console.log('✅ readFileContent method available');
    }
    if (typeof integration.analyzeContent === 'function') {
      console.log('✅ analyzeContent method available');
    }
    
    await manager.shutdown();
    
  } catch (error) {
    console.error('❌ MCP Integration test failed:', error.message);
    process.exit(1);
  }
}
test();
"

# Test 3: Configuration validation
echo "⚙️ Testing MCP configuration..."
node -e "
const fs = require('fs');
const path = require('path');

try {
  const configPath = './src/mcps/mcp-config.json';
  
  if (!fs.existsSync(configPath)) {
    throw new Error('MCP configuration file not found');
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // Validate configuration structure
  if (!config.version) throw new Error('Missing version in config');
  if (!config.mcps) throw new Error('Missing mcps section in config');
  if (!config.communication) throw new Error('Missing communication section in config');
  
  // Check each MCP configuration
  for (const [name, mcp] of Object.entries(config.mcps)) {
    if (!mcp.name) throw new Error(\`MCP \${name} missing name\`);
    if (!mcp.path) throw new Error(\`MCP \${name} missing path\`);
    if (typeof mcp.enabled !== 'boolean') throw new Error(\`MCP \${name} missing enabled flag\`);
  }
  
  console.log('✅ MCP configuration is valid');
  console.log(\`📊 Configured MCPs: \${Object.keys(config.mcps).length}\`);
  console.log(\`📊 Enabled MCPs: \${Object.values(config.mcps).filter(m => m.enabled).length}\`);
  
} catch (error) {
  console.error('❌ MCP configuration test failed:', error.message);
  process.exit(1);
}
"

# Test 4: MCP directory structure
echo "📁 Testing MCP directory structure..."
required_dirs=(
  "src/mcps"
  "src/mcps/filesystem" 
  "src/mcps/search"
  "src/mcps/nlp-models"
  "src/mcps/vector-db"
  "data/mcps"
  "logs/mcps"
)

for dir in "${required_dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "✅ Directory $dir exists"
  else
    echo "❌ Directory $dir missing"
    exit 1
  fi
done

# Test 5: Check for MCP server installations (if they exist)
echo "🔍 Checking MCP server installations..."
mcp_servers=(
  "src/mcps/filesystem/filesystem-mcp-server"
  "src/mcps/search/file-search-mcp" 
  "src/mcps/search/mcp-filesystem-server-ai-enhanced"
  "src/mcps/nlp-models/seta-mcp"
)

installed_count=0
for server_dir in "${mcp_servers[@]}"; do
  if [ -d "$server_dir" ]; then
    echo "✅ MCP server installed: $(basename $server_dir)"
    installed_count=$((installed_count + 1))
  else
    echo "⚠️  MCP server not installed: $(basename $server_dir) (run 'npm run setup-mcps' to install)"
  fi
done

echo "📊 MCP servers installed: $installed_count/4"

# Test 6: TypeScript compilation check
echo "🔨 Testing TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
  echo "✅ TypeScript compilation successful"
else
  echo "❌ TypeScript compilation failed"
  exit 1
fi

# Test 7: MCP files exist in dist
echo "📦 Checking compiled MCP files..."
mcp_files=(
  "dist/mcps/MCPManager.js"
  "dist/mcps/MCPIntegration.js"
)

for file in "${mcp_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ Compiled file exists: $file"
  else
    echo "❌ Compiled file missing: $file"
    exit 1
  fi
done

echo ""
echo "🎉 All MCP tests passed successfully!"
echo ""
echo "📋 Summary:"
echo "  ✅ MCP Manager initialization"
echo "  ✅ MCP Integration utilities"
echo "  ✅ Configuration validation"
echo "  ✅ Directory structure"
echo "  ✅ TypeScript compilation"
echo "  ✅ Compiled files check"
echo "  📊 MCP servers available: $installed_count/4"
echo ""
echo "💡 Next steps:"
echo "  1. Run 'npm run setup-mcps' to install MCP servers"
echo "  2. Start the backend with 'npm run dev'"
echo "  3. MCPs will be automatically initialized with the agent system"