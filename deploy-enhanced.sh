#!/bin/bash

echo "🚀 Deploying Enhanced GenSpark AI Search..."

# Navigate to project root
cd /Users/paco/Downloads/GenSpark-AI-Search

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the enhanced UI..."
npm run build

# Start the development server to test
echo "🎯 Starting enhanced search interface..."
echo "✨ The enhanced UI with:"
echo "   - Modern search interface with categories"
echo "   - Advanced Left Panel (Control Center)"
echo "   - Smart Insights Right Panel" 
echo "   - Real-time analytics and history"
echo "   - Beautiful animations and dark mode"
echo ""
echo "🌐 Opening at http://localhost:3000"

npm run dev