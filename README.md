# GenSpark AI Search Engine

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-Active%20Development-green.svg)
![Node.js](https://img.shields.io/badge/node.js-22.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

An advanced AI-powered search engine with intelligent document processing, multi-format content extraction, and semantic search capabilities.

## 🏗️ Project Architecture

```
GenSpark-AI-Search/
├── backend/                    # Node.js/TypeScript backend
│   ├── src/
│   │   ├── agents/            # AI Agent implementations
│   │   ├── shared/            # Shared utilities and types
│   │   └── config/            # Configuration files
│   ├── dist/                  # Compiled JavaScript
│   ├── logs/                  # Application logs
│   └── data/                  # Database and storage
├── frontend/                  # React/TypeScript frontend
├── test-files/                # Test documents for processing
└── docs/                      # Documentation
```

## 🚀 Current Status

### ✅ Completed Features

#### Phase 1: Core Infrastructure (COMPLETED)
- **Master Orchestrator Agent**: Central coordination and system health monitoring
- **Message Bus System**: Redis-based inter-agent communication
- **Base Agent Framework**: Lifecycle management, error handling, metrics
- **Docker Development Environment**: Redis, containers, file watching

#### Phase 2: Enhanced File Processing (COMPLETED)
- **Multi-Format Content Extraction**:
  - ✅ PDF processing (pdf-parse)
  - ✅ DOCX processing (mammoth)
  - ✅ CSV/XLSX data files
  - ✅ JSON/XML structured data
  - ✅ HTML content extraction
  - ✅ Code files (JS, TS, Python, Java, C++, Go, Rust, PHP, Ruby)
  - ✅ Markdown with advanced features
  - ✅ Plain text with encoding detection

- **Intelligent Content Analysis**:
  - ✅ Document structure detection (headings, tables, formulas, images)
  - ✅ Content type classification (technical, narrative, data, mixed)
  - ✅ Complexity assessment (simple, medium, complex)
  - ✅ Language detection

- **Auto Model Selection**:
  - ✅ Smart model selection based on content analysis
  - ✅ Persona-aware processing (technical, creative, data-focused)
  - ✅ Performance optimization (3-35ms processing times)

### 🔄 In Progress

#### Phase 3: Vector Embedding Agent (NEXT)
- **Embedding Generation**: Convert processed content to vector embeddings
- **Model Management**: Multiple embedding models for different content types
- **Batch Processing**: Efficient processing of multiple documents
- **Vector Storage**: Integration with vector databases

### 📋 Upcoming Features

#### Phase 4: Database Layer
- **SQLite Integration**: Persistent storage for files and embeddings
- **Metadata Storage**: File information, extraction statistics, model selections
- **Indexing**: Efficient retrieval and search capabilities

#### Phase 5: Search Infrastructure
- **Semantic Search**: Vector-based similarity search
- **Query Processing**: Natural language query understanding
- **Result Ranking**: Intelligent result ordering and filtering
- **Context-Aware Search**: Enhanced relevance scoring

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 22.x
- **Language**: TypeScript 5.x
- **Message Queue**: Redis 7.x
- **Database**: SQLite (planned: PostgreSQL)
- **Container**: Docker & Docker Compose

### AI/ML Components
- **Content Extraction**: pdf-parse, mammoth, xlsx, xml2js
- **Embedding Models**: sentence-transformers family
  - Technical: `all-mpnet-base-v2`
  - Narrative: `paraphrase-distilroberta-base-v1`
  - Data: `all-distilroberta-v1`
  - General: `all-MiniLM-L6-v2`

### Frontend (Existing)
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **Build Tool**: Vite

## 📊 Performance Metrics

### File Processing Performance
| File Type | Average Processing Time | Confidence | Model Selection |
|-----------|------------------------|------------|------------------|
| JSON | 30ms | 1.0 | auto-technical |
| Python Code | 31ms | 0.9 | all-mpnet-base-v2 |
| CSV Data | 32ms | 0.95 | all-distilroberta-v1 |
| Plain Text | 3ms | 1.0 | all-MiniLM-L6-v2 |
| Markdown | 29-35ms | 1.0 | content-dependent |

### System Health
- **Memory Usage**: ~28MB baseline
- **Agent Response Time**: <100ms
- **File Detection**: Real-time (<1s)
- **Error Rate**: <0.1%

## 🔧 Development Setup

### Prerequisites
```bash
# Node.js 22.x
node --version  # v22.18.0

# Docker & Docker Compose
docker --version
docker-compose --version
```

### Installation
```bash
# Clone repository
git clone <repository-url>
cd GenSpark-AI-Search

# Install backend dependencies
cd backend
npm install

# Start development environment
docker-compose up -d  # Start Redis
npm run dev          # Start with file watching

# Build for production
npm run build
npm start
```

## 📝 Recent Updates

### v2.0.0 - Enhanced File Processing (Current)
- **NEW**: Multi-format document processing (PDF, DOCX, CSV, etc.)
- **NEW**: Intelligent content analysis and structure detection
- **NEW**: Auto model selection based on content type and complexity
- **NEW**: Enhanced logging and metrics collection
- **IMPROVED**: Processing performance (3-35ms per file)
- **IMPROVED**: Error handling and graceful degradation

### v1.0.0 - Core Infrastructure
- **NEW**: Master Orchestrator Agent with health monitoring
- **NEW**: Redis-based message bus for inter-agent communication
- **NEW**: Base agent framework with lifecycle management
- **NEW**: Docker development environment
- **NEW**: Real-time file monitoring with chokidar

## 🐛 Known Issues

### Current Issues
- **Agent Heartbeat**: Agents show as "stale" after initial processing (cosmetic issue)
- **PDF Import**: Dynamic import required to avoid initialization conflicts
- **Memory Growth**: Minor memory increase during extended operation (under investigation)

### Resolved Issues
- ✅ TypeScript compilation errors with optional properties
- ✅ ES module import issues with pdf-parse
- ✅ Message routing in request/response pattern
- ✅ File watcher stability and cleanup

## 📚 Documentation

- [Backend README](./backend/README.md)
- [Development Guidelines](./docs/DEVELOPMENT.md)
- [Change Log](./docs/CHANGELOG.md)
- [Bug Tracking](./logs/README.md)

## 🤝 Contributing

This project follows semantic versioning and conventional commits. See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

**Built with ❤️ for intelligent document processing and semantic search**

*Last Updated: December 16, 2024*
