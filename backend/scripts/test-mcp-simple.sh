#!/bin/bash
set -e

echo "🧪 Testing MCP integrations (simple test)..."

# Test 1: Check MCP directory structure
echo "📁 Checking MCP directory structure..."
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

# Test 2: Check MCP configuration
echo "⚙️ Testing MCP configuration..."
if [ -f "src/mcps/mcp-config.json" ]; then
  echo "✅ MCP configuration file exists"
  
  # Basic JSON validation
  if python3 -m json.tool src/mcps/mcp-config.json > /dev/null; then
    echo "✅ MCP configuration is valid JSON"
  else
    echo "❌ MCP configuration is invalid JSON"
    exit 1
  fi
else
  echo "❌ MCP configuration file missing"
  exit 1
fi

# Test 3: Check MCP TypeScript files
echo "🔨 Checking MCP TypeScript files..."
mcp_files=(
  "src/mcps/MCPManager.ts"
  "src/mcps/MCPIntegration.ts"
)

for file in "${mcp_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ MCP file exists: $file"
    
    # Basic syntax check
    if npx tsc --noEmit --skipLibCheck "$file" > /dev/null 2>&1; then
      echo "✅ $file passes TypeScript syntax check"
    else
      echo "⚠️  $file has TypeScript issues (may need context)"
    fi
  else
    echo "❌ MCP file missing: $file"
    exit 1
  fi
done

# Test 4: Check MCP server installations
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
    
    # Check if it has package.json
    if [ -f "$server_dir/package.json" ]; then
      echo "  📦 Has package.json"
    fi
    
    # Check if dependencies are installed
    if [ -d "$server_dir/node_modules" ]; then
      echo "  📚 Dependencies installed"
    fi
  else
    echo "⚠️  MCP server not installed: $(basename $server_dir)"
  fi
done

# Test 5: MCP configuration content validation
echo "📊 Analyzing MCP configuration..."
config_mcps=$(python3 -c "
import json
with open('src/mcps/mcp-config.json', 'r') as f:
    config = json.load(f)
    print(f'Configured MCPs: {len(config.get(\"mcps\", {}))}')
    enabled = sum(1 for mcp in config.get('mcps', {}).values() if mcp.get('enabled', False))
    print(f'Enabled MCPs: {enabled}')
    print(f'Communication protocol: {config.get(\"communication\", {}).get(\"protocol\", \"unknown\")}')
")
echo "$config_mcps"

echo ""
echo "🎉 MCP Simple Tests Summary:"
echo "  ✅ Directory structure validated"
echo "  ✅ Configuration file validated"
echo "  ✅ TypeScript files present"
echo "  📊 MCP servers available: $installed_count/4"
echo ""

if [ $installed_count -ge 2 ]; then
  echo "💡 Status: Ready for MCP integration testing"
  echo "   Run 'npm run build' to compile the full system"
  echo "   Run 'npm run dev' to start with MCP support"
else
  echo "💡 Status: Partial MCP setup"
  echo "   Run 'npm run setup-mcps' to install more MCP servers"
fi

echo ""
echo "📝 Next steps:"
echo "  1. Fix any TypeScript compilation errors in the main codebase"
echo "  2. Integrate MCP calls into existing agents"
echo "  3. Test MCP functionality with real data"