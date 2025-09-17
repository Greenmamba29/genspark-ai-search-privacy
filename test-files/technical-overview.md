# Grahmos AI Search - Technical Overview

## Architecture

The Grahmos AI Search system follows a **microservices architecture** with specialized AI agents:

### Core Agents

1. **Master Orchestrator Agent**
   - Coordinates all system operations
   - Manages agent registry and health monitoring
   - Routes queries between agents

2. **File Processing Agent**
   - Monitors file system changes
   - Extracts content from various formats
   - Chunks documents for optimal search

3. **Vector Embedding Agent**  
   - Generates semantic embeddings
   - Processes text, images, and code
   - Uses transformer models locally

4. **Search Agent**
   - Executes vector similarity searches
   - Combines semantic and keyword search
   - Ranks and filters results

## Key Technologies

- **Redis**: Message bus for inter-agent communication
- **SQLite + FTS5**: Metadata storage and full-text search
- **Chroma DB**: Vector storage and similarity search
- **Transformers.js**: Local AI model inference
- **TypeScript**: Type-safe development

## Benefits

✅ **Privacy-First**: All processing happens locally  
✅ **Offline Capable**: No internet connection required  
✅ **Fast**: Optimized for local hardware  
✅ **Scalable**: Modular agent architecture  
✅ **Extensible**: Easy to add new file formats and agents

## Code Example

```typescript
// Example of agent communication
const response = await messageBus.request(sourceAgent, targetAgent, {
  action: 'process-file',
  filePath: '/path/to/document.pdf'
});

if (response.payload.success) {
  console.log('File processed:', response.payload.extractedContent);
}
```

This markdown document tests the system's ability to process structured content with headers, lists, code blocks, and formatting.