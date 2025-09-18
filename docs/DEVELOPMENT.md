# Development Guidelines

This document outlines development practices, coding standards, and workflow procedures for the Grahmos AI Search Engine project.

## 🏗️ Project Architecture

### Agent-Based System Design
The system follows a distributed agent architecture where each agent has specific responsibilities:

```typescript
interface Agent {
  id: string;
  type: AgentType;
  capabilities: string[];
  lifecycle: 'starting' | 'ready' | 'busy' | 'stopping' | 'stopped';
  communicate: (message: AgentMessage) => Promise<void>;
}
```

### Core Principles
1. **Single Responsibility**: Each agent handles one primary concern
2. **Event-Driven Communication**: Agents communicate via message bus
3. **Graceful Degradation**: System continues operating if agents fail
4. **Horizontal Scaling**: Agents can be distributed across processes
5. **Type Safety**: Comprehensive TypeScript typing throughout

## 📝 Coding Standards

### TypeScript Guidelines

#### Type Definitions
```typescript
// ✅ Good: Explicit, descriptive types
interface FileProcessingConfig extends AgentConfig {
  watchDirectories: string[];
  maxFileSize: number;
  supportedExtensions: string[];
  extractionOptions?: ExtractionOptions;
}

// ❌ Avoid: Vague or any types
interface Config {
  options: any;
  settings: Record<string, unknown>;
}
```

#### Error Handling
```typescript
// ✅ Good: Specific error types with context
try {
  const result = await this.processFile(filePath);
} catch (error) {
  throw new Error(`Failed to process file ${filePath}: ${(error as Error).message}`);
}

// ❌ Avoid: Generic error swallowing
try {
  await this.processFile(filePath);
} catch (error) {
  console.log('Something went wrong');
}
```

#### Async/Await Patterns
```typescript
// ✅ Good: Proper async/await with error handling
public async processFiles(files: string[]): Promise<ExtractedContent[]> {
  const results: ExtractedContent[] = [];
  
  for (const file of files) {
    try {
      const content = await this.processFile(file);
      results.push(content);
    } catch (error) {
      this.logError(`Failed to process ${file}`, error);
    }
  }
  
  return results;
}
```

### Agent Development Patterns

#### Agent Structure
```typescript
export class CustomAgent extends BaseAgent {
  private messagebus: MessageBus;
  private config: CustomAgentConfig;
  
  constructor(config: CustomAgentConfig) {
    super(config);
    this.messageBus = new MessageBus(config.messageBusConfig);
  }
  
  protected async onInitialize(): Promise<void> {
    // Setup connections, load models, etc.
  }
  
  protected async onStart(): Promise<void> {
    // Register with orchestrator, start processing
  }
  
  protected async onStop(): Promise<void> {
    // Cleanup resources, close connections
  }
  
  protected async onHandleMessage(message: AgentMessage): Promise<AgentMessage | void> {
    // Process incoming messages
  }
}
```

#### Message Handling
```typescript
// ✅ Good: Structured message processing
protected async onHandleMessage(message: AgentMessage): Promise<AgentMessage | void> {
  switch (message.type) {
    case 'request':
      return await this.handleRequest(message);
    case 'event':
      await this.handleEvent(message);
      break;
    case 'response':
      await this.handleResponse(message);
      break;
    default:
      this.logWarning(`Unknown message type: ${message.type}`);
  }
}
```

### Logging Standards

#### Log Levels and Format
```typescript
// ✅ Good: Structured logging with context
console.log(`🔍 Enhanced processing file: ${path.basename(filePath)}`);
console.log(`📊 Extraction results for ${path.basename(filePath)}:`);
console.log(`   - Method: ${result.extractionMethod}`);
console.log(`   - Confidence: ${result.confidence}`);
console.log(`   - Model Selected: ${result.modelSelected}`);

// ❌ Avoid: Generic logging without context
console.log('Processing file');
console.log('Done');
```

#### Error Logging
```typescript
// ✅ Good: Detailed error logging
this.logError(`Failed to extract content from ${filePath}`, {
  error: error.message,
  stack: error.stack,
  filePath,
  fileSize: stats.size,
  extractionMethod: this.getExtractionMethod(filePath)
});
```

## 🧪 Testing Guidelines

### Test Structure
```
tests/
├── unit/                   # Unit tests for individual components
│   ├── agents/            # Agent-specific tests
│   ├── shared/            # Shared utility tests
│   └── extractors/        # Content extractor tests
├── integration/           # Integration tests
│   ├── message-bus/       # Message bus communication tests
│   └── agent-coordination/ # Multi-agent tests
└── e2e/                   # End-to-end workflow tests
```

### Test Patterns
```typescript
describe('FileProcessingAgent', () => {
  let agent: FileProcessingAgent;
  let mockMessageBus: jest.Mocked<MessageBus>;
  
  beforeEach(() => {
    mockMessageBus = createMockMessageBus();
    agent = new FileProcessingAgent({
      agentId: 'test-agent',
      type: 'file-processing',
      messageBusConfig: { /* mock config */ }
    });
  });
  
  it('should process PDF files correctly', async () => {
    const testFile = path.join(__dirname, 'fixtures/test.pdf');
    const result = await agent.processFile(testFile);
    
    expect(result.extractionMethod).toBe('pdf');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.content).toBeTruthy();
  });
});
```

## 🔧 Development Workflow

### Branch Strategy
```bash
main                    # Production-ready code
├── develop            # Integration branch
│   ├── feature/       # New features
│   │   └── vector-embedding-agent
│   ├── bugfix/        # Bug fixes
│   │   └── fix-heartbeat-issue
│   └── hotfix/        # Critical fixes
│       └── fix-memory-leak
```

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# ✅ Good commit messages
feat(agents): add Vector Embedding Agent with auto model selection
fix(file-processing): resolve PDF dynamic import initialization issue
docs(readme): update performance metrics and architecture diagrams
refactor(message-bus): improve error handling and retry logic

# ❌ Avoid vague messages
git commit -m "Fixed stuff"
git commit -m "Updates"
git commit -m "Changes"
```

### Pull Request Process
1. **Create Feature Branch**
   ```bash
   git checkout -b feature/vector-embedding-agent
   ```

2. **Development**
   - Write code following standards
   - Add comprehensive tests
   - Update documentation
   - Ensure all tests pass

3. **Pre-PR Checklist**
   ```bash
   npm run build          # Ensure clean build
   npm test              # All tests pass
   npm run lint          # Code style checks
   npm run type-check    # TypeScript validation
   ```

4. **Create Pull Request**
   - Use descriptive title and description
   - Reference related issues
   - Include testing instructions
   - Add performance impact notes

### Code Review Guidelines

#### For Authors
- **Self-Review**: Review your own code before submitting
- **Small PRs**: Keep changes focused and reviewable
- **Documentation**: Update relevant docs and comments
- **Tests**: Include comprehensive test coverage

#### For Reviewers
- **Functionality**: Does the code do what it's supposed to?
- **Architecture**: Does it fit the system design?
- **Performance**: Are there any performance implications?
- **Security**: Are there any security concerns?
- **Maintainability**: Is the code readable and maintainable?

## 📊 Performance Considerations

### Memory Management
```typescript
// ✅ Good: Proper resource cleanup
public async processLargeFile(filePath: string): Promise<ExtractedContent> {
  let buffer: Buffer | null = null;
  
  try {
    buffer = await fs.readFile(filePath);
    return await this.extractContent(buffer);
  } finally {
    buffer = null; // Help GC
  }
}
```

### Async Processing
```typescript
// ✅ Good: Concurrent processing with limits
async processFiles(files: string[]): Promise<ExtractedContent[]> {
  const BATCH_SIZE = 5;
  const results: ExtractedContent[] = [];
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(file => this.processFile(file))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

### Monitoring Integration
```typescript
// ✅ Good: Built-in metrics collection
protected incrementMetric(name: string, value: number = 1): void {
  this.metrics[name] = (this.metrics[name] || 0) + value;
}

// Track performance
const startTime = Date.now();
await this.processFile(filePath);
this.recordProcessingTime(Date.now() - startTime);
```

## 🚀 Deployment

### Environment Configuration
```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug
REDIS_URL=redis://localhost:6379

# Production
NODE_ENV=production
LOG_LEVEL=warn
REDIS_URL=redis://prod-redis:6379
MAX_CONCURRENT_OPERATIONS=50
```

### Build Process
```bash
# Clean build
npm run clean
npm install
npm run build

# Verify build
npm run test:build
npm run type-check
```

### Health Checks
```typescript
// Implement health endpoints
public async getHealthStatus(): Promise<HealthStatus> {
  return {
    status: this.status,
    uptime: Date.now() - this.startTime,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
    messageQueueConnected: await this.messageBus.isConnected(),
    lastError: this.lastError?.message
  };
}
```

## 🔍 Debugging

### Local Development
```bash
# Start with debug logging
LOG_LEVEL=debug npm run dev

# Monitor Redis traffic
redis-cli monitor

# Memory profiling
node --inspect dist/index.js
```

### Production Debugging
```bash
# View logs
tail -f logs/application.log

# Filter errors
grep "ERROR" logs/application.log | tail -20

# Monitor memory
ps aux | grep node
```

### Common Debug Scenarios

#### Agent Communication Issues
```bash
# Check Redis connectivity
redis-cli ping

# Monitor message traffic
redis-cli monitor | grep "genspark"

# Verify agent registration
grep "Agent registered" logs/application.log
```

#### Performance Issues
```bash
# Check processing times
grep "Processing Time" logs/application.log | awk '{print $NF}' | sort -n

# Monitor memory growth
grep "Memory Usage" logs/application.log
```

## 📚 Documentation Standards

### Code Documentation
```typescript
/**
 * Processes a file and extracts its content with intelligent analysis.
 * 
 * @param filePath - Absolute path to the file to process
 * @param options - Optional extraction configuration
 * @returns Promise resolving to extracted content with metadata
 * 
 * @throws {Error} When file cannot be read or processed
 * 
 * @example
 * ```typescript
 * const result = await agent.processFile('/path/to/document.pdf');
 * console.log(`Extracted ${result.wordCount} words with ${result.confidence} confidence`);
 * ```
 */
public async processFile(filePath: string, options?: ExtractionOptions): Promise<ExtractedContent>
```

### README Updates
- Keep performance metrics current
- Update supported features list
- Include working examples
- Document breaking changes

## 🔐 Security Guidelines

### Input Validation
```typescript
// ✅ Good: Validate all inputs
private validateFilePath(filePath: string): void {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path provided');
  }
  
  if (!path.isAbsolute(filePath)) {
    throw new Error('File path must be absolute');
  }
  
  // Check file size limits, extensions, etc.
}
```

### Error Information
```typescript
// ✅ Good: Safe error messages
catch (error) {
  // Don't expose internal paths or sensitive info
  throw new Error(`Failed to process file: ${this.getSafeErrorMessage(error)}`);
}
```

---

## 📞 Getting Help

### Code Review Questions
- Post in team chat with `@code-review` tag
- Include relevant code snippets and context
- Specify what type of feedback you need

### Architecture Decisions
- Document major decisions in ADR (Architecture Decision Record) format
- Discuss in team meetings for significant changes
- Update this document when patterns evolve

### Bug Reports
- Use the bug template in `logs/README.md`
- Include reproduction steps and relevant logs
- Assign appropriate priority level

---

**Last Updated**: 2024-12-16T21:13:09Z  
**Version**: 2.0.0  
**Maintainer**: AI Development Team