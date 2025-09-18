# Technical Infrastructure Requirements - Grahmos AI Search MVP

## 🏗️ Infrastructure Overview

This document specifies the complete technical infrastructure required to build and deploy the Grahmos AI Search MVP. It covers local AI models, vector databases, file processing pipelines, hardware requirements, and deployment architecture.

---

## 🧠 **AI Model Requirements**

### Text Embedding Models

#### Primary Model: sentence-transformers/all-MiniLM-L6-v2
```yaml
Model Specifications:
  size: 22MB
  dimensions: 384
  languages: English (primary)
  max_sequence_length: 256 tokens
  performance: ~14,000 sentences/second on CPU
  use_case: General text embedding for documents, queries
  
Deployment:
  format: ONNX + PyTorch
  quantization: INT8 (reduces size by 75%)
  memory_usage: ~100MB loaded
  initialization_time: 2-3 seconds
```

#### Secondary Model: universal-sentence-encoder
```yaml
Model Specifications:
  size: 1.2GB
  dimensions: 512
  languages: Multilingual
  max_sequence_length: unlimited
  performance: ~8,000 sentences/second on CPU
  use_case: High-quality embeddings for complex queries
  
Deployment:
  format: TensorFlow.js / ONNX
  quantization: FP16
  memory_usage: ~2GB loaded
  initialization_time: 8-12 seconds
```

### Vision Models

#### Primary Model: openai/clip-vit-base-patch32
```yaml
Model Specifications:
  size: 150MB
  image_dimensions: 224x224
  text_dimensions: 512
  performance: ~500 images/second on CPU
  use_case: Image-text similarity, visual search
  
Deployment:
  format: ONNX
  quantization: INT8
  memory_usage: ~300MB loaded
  preprocessing: Automatic image resizing/normalization
```

#### Secondary Model: google/vit-base-patch16-224
```yaml
Model Specifications:
  size: 330MB
  image_dimensions: 224x224
  patch_size: 16x16
  performance: ~200 images/second on CPU
  use_case: Advanced image understanding
  
Deployment:
  format: ONNX
  quantization: FP16
  memory_usage: ~600MB loaded
  features: Object detection, scene understanding
```

### Code Understanding Models

#### Primary Model: microsoft/codebert-base
```yaml
Model Specifications:
  size: 500MB
  dimensions: 768
  languages: 6 programming languages
  max_sequence_length: 512 tokens
  performance: ~2,000 code snippets/second
  use_case: Code similarity, function matching
  
Deployment:
  format: ONNX
  quantization: INT8
  memory_usage: ~800MB loaded
  preprocessing: Code tokenization, AST parsing
```

### Intent Classification Model
```yaml
Custom Lightweight Model:
  size: 15MB
  accuracy: >95% on search intents
  categories: ["search", "filter", "sort", "navigate", "help"]
  performance: ~50,000 queries/second
  
Training Data:
  - 10K+ labeled search queries
  - Intent patterns from major search engines
  - Domain-specific search patterns
```

---

## 🗄️ **Vector Database Solutions**

### Option 1: Chroma DB (Recommended)
```yaml
Installation:
  command: pip install chromadb
  size: ~50MB
  dependencies: SQLite, numpy, scipy
  
Configuration:
  persist_directory: "./data/chroma"
  collection_name: "genspark_documents"
  distance_function: "cosine"
  index_type: "hnsw"
  
Performance:
  insert_speed: 10,000 vectors/second
  query_speed: 1,000 queries/second
  memory_usage: ~2GB per 1M vectors
  storage: ~4GB per 1M vectors (compressed)
  
Features:
  ✅ Full-text search integration
  ✅ Metadata filtering
  ✅ Batch operations
  ✅ Incremental updates
  ✅ Automatic persistence
  ✅ JavaScript/Python bindings
```

### Option 2: FAISS (High Performance)
```yaml
Installation:
  command: pip install faiss-cpu
  size: ~20MB
  dependencies: numpy, mkl
  
Configuration:
  index_type: "IndexHNSWFlat"
  metric: "METRIC_INNER_PRODUCT"
  dimension: 384
  
Performance:
  insert_speed: 50,000 vectors/second
  query_speed: 5,000 queries/second
  memory_usage: ~1GB per 1M vectors
  storage: ~1.5GB per 1M vectors
  
Features:
  ✅ Ultra-fast similarity search
  ✅ Multiple index types
  ✅ Memory mapping
  ✅ GPU support
  ❌ No metadata filtering
  ❌ Manual persistence required
```

### Option 3: Weaviate Local
```yaml
Installation:
  method: Docker container
  size: ~200MB
  dependencies: Go runtime, GraphQL
  
Configuration:
  schema: Custom document schema
  vectorizer: "text2vec-transformers"
  storage: "filesystem"
  
Performance:
  insert_speed: 5,000 vectors/second
  query_speed: 2,000 queries/second
  memory_usage: ~3GB per 1M vectors
  storage: ~5GB per 1M vectors
  
Features:
  ✅ GraphQL API
  ✅ Advanced filtering
  ✅ Schema evolution
  ✅ Multi-tenancy
  ❌ Higher resource usage
  ❌ Complex setup
```

---

## 📁 **File Processing Pipeline**

### Content Extraction Stack

#### PDF Processing
```yaml
Primary: pdf-parse (Node.js)
  size: 15MB
  performance: ~100 pages/second
  features: Text, metadata extraction
  memory: ~50MB per document
  
Secondary: PyMuPDF (Python)
  size: 25MB
  performance: ~200 pages/second
  features: OCR, image extraction
  memory: ~100MB per document
  
Fallback: pdf2pic + Tesseract
  size: 150MB (includes OCR engine)
  performance: ~10 pages/second
  features: Image-based PDF processing
  memory: ~200MB per document
```

#### Document Processing
```yaml
DOCX: mammoth.js
  size: 2MB
  performance: ~500 documents/second
  features: Formatting preservation
  
RTF: rtf-parser
  size: 1MB
  performance: ~1000 documents/second
  features: Basic text extraction
  
TXT/MD: Built-in Node.js
  size: 0MB
  performance: ~10,000 files/second
  features: Encoding detection
```

#### Image Processing
```yaml
Primary: Sharp (Node.js)
  size: 30MB
  performance: ~500 images/second
  features: Resize, format conversion, metadata
  memory: ~50MB per image batch
  
OCR: Tesseract.js
  size: 15MB
  performance: ~50 images/second
  features: Text extraction from images
  memory: ~100MB per image
  
Metadata: ExifReader
  size: 1MB
  performance: ~2000 images/second
  features: EXIF, GPS, camera data
```

#### Audio/Video Processing
```yaml
FFmpeg (binary)
  size: 100MB
  performance: 10x realtime playback
  features: Transcoding, metadata, thumbnails
  
Whisper.cpp (Speech-to-Text)
  size: 150MB
  performance: 2x realtime transcription
  features: 99 languages, punctuation
  memory: ~500MB during processing
```

#### Code Processing
```yaml
Tree-sitter (Multiple Languages)
  size: 50MB
  languages: 40+ programming languages
  performance: ~1000 files/second
  features: AST parsing, syntax highlighting
  
Language Detection: franc
  size: 2MB
  performance: ~10,000 files/second
  accuracy: >95% for common languages
```

### Processing Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Watcher  │───▶│  Content Queue   │───▶│   Processors    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐            ▼
│  Vector Storage │◀───│ Embedding Queue  │◀───┌─────────────────┐
└─────────────────┘    └──────────────────┘    │  Text Extractor │
                                               └─────────────────┘
```

---

## 💾 **Storage & Database Requirements**

### Metadata Database (SQLite)
```sql
-- Core schema for file metadata and search indices
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  modified_at TIMESTAMP NOT NULL,
  indexed_at TIMESTAMP NOT NULL,
  content_hash TEXT NOT NULL,
  metadata JSON
);

CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  embedding_id TEXT
);

-- Full-text search index
CREATE VIRTUAL TABLE documents_fts USING fts5(
  content,
  content='documents',
  content_rowid='rowid'
);

-- Performance indices
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_modified ON documents(modified_at);
CREATE INDEX idx_chunks_document ON chunks(document_id);
```

### Storage Estimates
```yaml
Document Metadata: ~1KB per file
Chunk Data: ~2KB per chunk (avg 5 chunks/file)
Full-text Index: ~30% of original content size
Vector Embeddings: ~1.5KB per chunk (384 dims)

Total Storage (100K documents):
  - Raw content: ~10GB
  - Metadata: ~100MB
  - FTS Index: ~3GB
  - Vector embeddings: ~750MB
  - Total: ~14GB
```

---

## 🖥️ **Hardware Requirements**

### Development Environment
```yaml
Minimum Requirements:
  CPU: 4-core Intel/AMD processor (2.5GHz+)
  RAM: 16GB DDR4
  Storage: 500GB SSD
  OS: macOS 12+, Windows 10+, Ubuntu 20.04+
  
Recommended Requirements:
  CPU: 8-core Intel/AMD processor (3.0GHz+)
  RAM: 32GB DDR4
  Storage: 1TB NVMe SSD
  GPU: Optional (RTX 3060 or equivalent for faster processing)
  Network: Gigabit Ethernet (for large file transfers)
```

### Production Deployment
```yaml
Local Deployment (Single User):
  CPU: 4-core processor
  RAM: 8GB minimum, 16GB recommended
  Storage: 250GB for 50K documents
  
Enterprise Deployment (Team):
  CPU: 8-core processor
  RAM: 32GB
  Storage: 1TB+ for large document repositories
  Network: High-speed internal network
  
Cloud Deployment (Scale):
  Instance: 8 vCPUs, 32GB RAM
  Storage: 1TB+ SSD with backup
  Load Balancer: For multiple instances
  CDN: For static asset delivery
```

---

## 🐳 **Deployment Architecture**

### Docker Compose Stack
```yaml
version: '3.8'

services:
  genspark-app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./models:/app/models
    environment:
      - NODE_ENV=production
      - CHROMA_PERSIST_DIR=/app/data/chroma
      - MODEL_CACHE_DIR=/app/models
    depends_on:
      - vector-db
      - agent-orchestrator
  
  vector-db:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - ./data/chroma:/chroma/chroma
    environment:
      - CHROMA_PERSIST_DIR=/chroma/chroma
  
  agent-orchestrator:
    build: ./agents
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
      - ./models:/app/models
    environment:
      - AGENT_CONFIG_PATH=/app/config/agents.yaml
    
  file-processor:
    build: ./processors
    volumes:
      - ./data:/app/data
      - ./watch:/app/watch
    environment:
      - WATCH_DIRECTORIES=/app/watch
      - PROCESS_BATCH_SIZE=100
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: genspark-search
spec:
  replicas: 3
  selector:
    matchLabels:
      app: genspark-search
  template:
    metadata:
      labels:
        app: genspark-search
    spec:
      containers:
      - name: app
        image: genspark/ai-search:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
        - name: model-cache
          mountPath: /app/models
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: genspark-data
      - name: model-cache
        persistentVolumeClaim:
          claimName: genspark-models
```

---

## 🔧 **Development Tools & Dependencies**

### Core Dependencies
```json
{
  "dependencies": {
    "@chromadb/chromadb": "^1.7.0",
    "@xenova/transformers": "^2.10.0",
    "faiss-node": "^0.5.0",
    "onnxruntime-node": "^1.16.0",
    "sqlite3": "^5.1.0",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "sharp": "^0.32.0",
    "tesseract.js": "^5.0.0",
    "chokidar": "^3.5.0",
    "franc": "^6.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.2.0",
    "vitest": "^1.0.0",
    "docker": "^3.0.0"
  }
}
```

### Python Dependencies (ML Services)
```python
# requirements.txt
chromadb==0.4.18
transformers==4.35.0
torch==2.1.0
onnxruntime==1.16.0
faiss-cpu==1.7.4
sentence-transformers==2.2.2
Pillow==10.0.0
opencv-python==4.8.0
ffmpeg-python==0.2.0
whisper==1.1.10
spacy==3.7.0
nltk==3.8.0
pandas==2.1.0
numpy==1.25.0
scikit-learn==1.3.0
```

### System Dependencies
```bash
# macOS (Homebrew)
brew install tesseract
brew install ffmpeg
brew install sqlite

# Ubuntu/Debian
apt-get install tesseract-ocr
apt-get install ffmpeg
apt-get install sqlite3

# Windows (Chocolatey)
choco install tesseract
choco install ffmpeg
choco install sqlite
```

---

## 📊 **Performance Benchmarks**

### Expected Performance Metrics
```yaml
File Processing:
  - Text files: 1000+ files/second
  - PDF documents: 100+ pages/second
  - Images: 500+ images/second
  - Code files: 2000+ files/second

Vector Operations:
  - Embedding generation: 5000+ texts/second
  - Vector search: 1000+ queries/second
  - Batch insertion: 10,000+ vectors/second

Search Performance:
  - Query processing: <100ms
  - Result ranking: <50ms
  - Total response time: <500ms
  - Concurrent users: 100+ simultaneous

Resource Usage:
  - Memory: 4-8GB for 100K documents
  - CPU: 50-70% during indexing
  - Storage: 150MB per 1000 documents
  - Network: Minimal (offline operation)
```

### Scalability Limits
```yaml
Single Instance:
  - Documents: Up to 1M files
  - Storage: Up to 10TB
  - Memory: Up to 64GB
  - Users: Up to 500 concurrent

Distributed Setup:
  - Documents: Unlimited (sharding)
  - Storage: Unlimited (distributed)
  - Memory: Horizontal scaling
  - Users: Unlimited (load balancing)
```

This technical infrastructure specification provides the complete foundation needed to build, deploy, and scale the Grahmos AI Search MVP while maintaining optimal performance and reliability.

<citations>
<document>
<document_type>RULE</document_type>
<document_id>8aQrtGjDp9g2g8xvtY6EIu</document_id>
</document>
<document>
<document_type>RULE</document_type>
<document_id>T3rJIbfjmiSQTN5t4Qilk3</document_id>
</document>
</citations>