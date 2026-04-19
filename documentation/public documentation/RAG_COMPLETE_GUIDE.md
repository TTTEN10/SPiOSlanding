# RAG (Retrieval-Augmented Generation) Complete Guide

This comprehensive guide covers setup, testing, and implementation details for SafePsy's RAG system.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup](#setup)
4. [Testing](#testing)
5. [Implementation Details](#implementation-details)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The RAG (Retrieval-Augmented Generation) system enhances AI responses with relevant therapeutic knowledge through:

- **Document Indexing**: Psychoeducational content indexed as vector embeddings
- **Semantic Search**: User queries matched against indexed documents
- **Context Augmentation**: Retrieved documents augment LLM prompts
- **Response Generation**: LLM generates responses using augmented context

**Benefits**:
- **Accuracy**: Responses grounded in verified therapeutic knowledge
- **Relevance**: Context-aware responses tailored to user queries
- **Transparency**: Source attribution for retrieved documents
- **Scalability**: Knowledge base can be expanded without retraining

---

## Architecture

### Core Components

#### 1. EmbeddingProvider (`src/lib/embedding-provider.ts`)
- Interface for embedding generation
- OpenAI implementation: `OpenAIEmbeddingProvider`
- Mock fallback when API key missing
- Batch embedding support
- Configurable via environment variables

#### 2. QdrantService (`src/lib/qdrant.service.ts`)
- Qdrant vector database client wrapper
- Collection management (auto-create)
- Vector upsert operations
- Vector search with filtering
- Point deletion
- Health check
- Singleton pattern: `getQdrantService()`

#### 3. RetrieverService (`src/lib/retriever.service.ts`)
- Orchestrates embedding + vector search
- Lazy initialization (auto-initializes on first use)
- Document indexing (single and batch)
- Retrieval with filtering and scoring
- Health check
- Singleton pattern: `getRetrieverService()`

### HTTP Endpoints

#### RAG Routes (`src/routes/rag.ts`)
- `POST /api/rag/retrieve` - Retrieve documents
- `POST /api/rag/index` - Index document
- `DELETE /api/rag/document/:documentId` - Delete document
- `GET /api/rag/health` - Health check

### Infrastructure

#### Docker Setup (`docker-compose.dev.yml`)
- Qdrant service defined
- Ports exposed (6333 REST, 6334 gRPC)
- Volume persistence
- Health check configured
- Network configuration

---

## Setup

### Prerequisites

#### 1. Install Docker Desktop

Docker is required to run Qdrant (the vector database).

**Option A: Download Docker Desktop**
1. Visit https://www.docker.com/products/docker-desktop/
2. Download Docker Desktop for Mac (Apple Silicon or Intel)
3. Install and launch Docker Desktop
4. Wait for Docker to start (whale icon in menu bar should be steady)

**Option B: Install via Homebrew**
```bash
brew install --cask docker
```

Then launch Docker Desktop from Applications.

**Verify Docker is running:**
```bash
docker --version
docker info
```

#### 2. Install Node.js Dependencies

```bash
cd apps/api
npm install
```

This will install the `@qdrant/js-client-rest` package and other dependencies.

### Setup Steps

#### Option 1: Automated Setup (Recommended)

Run the setup script:
```bash
./setup-rag.sh
```

#### Option 2: Manual Setup

**Step 1: Start Qdrant**
```bash
docker compose -f docker-compose.dev.yml up -d qdrant
```

Wait a few seconds for Qdrant to start, then verify:
```bash
curl http://localhost:6333/health
```

You should see: `{"status":"ok"}`

**Step 2: Start Your Backend Server**
```bash
cd apps/api
npm run dev
```

The server should start on port 3001 (or your configured PORT).

### Environment Variables

Make sure your `.env` file (or environment) includes:

```bash
# OpenAI API (for embeddings - optional, will use mock if not set)
OPENAI_API_KEY=your-openai-api-key-here

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY=your-key-if-needed

# Embedding Configuration
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small

# RAG Admin Access Control (for indexing endpoints)
RAG_ADMIN_API_KEY=$(openssl rand -hex 32)
# RAG_ADMIN_WALLETS=0x1234...,0xabcd...  # Optional: comma-separated admin wallet addresses
```

**Note:** If `OPENAI_API_KEY` is not set, the system will use mock embeddings (useful for testing without API costs).

### RAG Database Schema & Initial Indexing

1. **Apply database schema** (adds RAGAuditLog for audit logging):
   ```bash
   cd apps/api
   npx prisma db push
   # Or: npx prisma migrate dev --name add_rag_audit_log
   ```

2. **Index FAQs/ToS content**:
   ```bash
   node scripts/index-faqs-tos.mjs
   ```

   This indexes FAQs and Terms of Service sections into Qdrant. See `documentation/api/RAG_IMPLEMENTATION.md` for details.

---

## Testing

### Quick Start Testing

#### Step 1: Start Qdrant

```bash
# From project root
docker compose -f docker-compose.dev.yml up -d qdrant

# Verify Qdrant is running
curl http://localhost:6333/health
# Should return: {"status":"ok"}
```

#### Step 2: Start Backend Server

In a separate terminal:

```bash
# From project root
npm run dev

# Or just the API:
cd apps/api
npm run dev
```

Wait for: `SafePsy API listening on :3001`

#### Step 3: Run Complete Test

```bash
# From project root
./test-rag-complete.sh
```

This will test:
- ✅ Qdrant connectivity
- ✅ Backend server
- ✅ RAG health endpoint
- ✅ Document indexing (3 sample documents)
- ✅ Document retrieval
- ✅ Filtered retrieval by source

### Manual Testing

#### 1. Health Check

```bash
curl http://localhost:3001/api/rag/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "embedding": true,
    "qdrant": true
  }
}
```

#### 2. Index a Document

```bash
curl -X POST http://localhost:3001/api/rag/index \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Anxiety is a common mental health condition characterized by excessive worry and fear. Treatment options include therapy, medication, and lifestyle changes.",
    "source": "psychoeducation"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Document indexed successfully",
  "data": {
    "documentId": "doc_..."
  }
}
```

#### 3. Retrieve Documents

```bash
curl -X POST http://localhost:3001/api/rag/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "query": "anxiety treatment",
    "limit": 5
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "text": "...",
        "source": "psychoeducation",
        "score": 0.85,
        "documentId": "..."
      }
    ],
    "query": "anxiety treatment",
    "count": 1
  }
}
```

#### 4. Delete Document

```bash
curl -X DELETE http://localhost:3001/api/rag/document/doc_...
```

---

## Implementation Details

### Code Quality

#### ✅ Modularity
- Services are independent and testable
- Clear separation of concerns
- Interface-based design (EmbeddingProvider)

#### ✅ Extensibility
- Easy to add new embedding providers
- Easy to swap vector database
- Configurable via environment variables

#### ✅ Type Safety
- Strict TypeScript (no `any` types)
- Well-defined interfaces
- Proper type exports

#### ✅ Error Handling
- Try-catch blocks in all async operations
- Meaningful error messages
- Graceful fallbacks (mock embeddings)

#### ✅ Logging
- Winston logger integration
- Appropriate log levels
- Error logging

### Best Practices

- Singleton pattern for services
- Lazy initialization
- Idempotent operations
- Proper async/await usage
- Resource cleanup

### Files Created/Modified

#### Backend
- `apps/api/src/lib/embedding-provider.ts` - Embedding provider interface and implementation
- `apps/api/src/lib/qdrant.service.ts` - Qdrant service
- `apps/api/src/lib/retriever.service.ts` - Retriever service
- `apps/api/src/routes/rag.ts` - RAG API endpoints
- `apps/api/src/index.ts` - Route registration
- `apps/api/src/lib/__tests__/retriever.service.test.ts` - Unit tests

#### Infrastructure
- `docker-compose.dev.yml` - Qdrant service configuration

---

## API Reference

### POST /api/rag/index

Index a document for retrieval.

**Request:**
```json
{
  "text": "Document text content",
  "source": "psychoeducation",
  "metadata": {
    "optional": "metadata"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document indexed successfully",
  "data": {
    "documentId": "doc_abc123"
  }
}
```

### POST /api/rag/retrieve

Retrieve relevant documents based on query.

**Request:**
```json
{
  "query": "search query",
  "limit": 5,
  "source": "psychoeducation",
  "minScore": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "text": "Document text",
        "source": "psychoeducation",
        "score": 0.85,
        "documentId": "doc_abc123",
        "metadata": {}
      }
    ],
    "query": "search query",
    "count": 1
  }
}
```

### DELETE /api/rag/document/:documentId

Delete a document from the index.

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### GET /api/rag/health

Check RAG system health.

**Response:**
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "embedding": true,
    "qdrant": true
  }
}
```

---

## Troubleshooting

### Docker Issues

**Docker not found:**
- Install Docker Desktop (see Prerequisites above)
- Make sure Docker Desktop is running

**Port 6333 already in use:**
- Check if Qdrant is already running: `docker ps`
- Stop existing container: `docker stop <container-id>`
- Or change the port in `docker-compose.dev.yml`

### Qdrant Connection Issues

**Cannot connect to Qdrant:**
1. Check if container is running: `docker ps`
2. Check container logs: `docker compose -f docker-compose.dev.yml logs qdrant`
3. Verify Qdrant health: `curl http://localhost:6333/health`

### Backend Issues

**Module not found errors:**
- Run `npm install` in `apps/api` directory
- Make sure `@qdrant/js-client-rest` is installed

**Initialization errors:**
- Check that Qdrant is running and accessible
- Verify `QDRANT_URL` environment variable
- Check backend logs for detailed error messages

### Embedding Issues

**OpenAI API errors:**
- Verify `OPENAI_API_KEY` is set correctly
- Check API key validity
- Monitor API rate limits
- System will use mock embeddings if API key is missing

---

## Next Steps

### Integration with Chatbot

The RAG system is now integrated with the chat completion endpoint via the `withContext` query parameter.

1. **Use RAG-enhanced chat completions:**
   - Add `?withContext=true` to the chat completion endpoint
   - The system automatically retrieves relevant FAQs and Terms of Service content
   - Retrieved context is injected into the system message to enhance responses

2. **Example API call with RAG context:**
   ```bash
   curl -X POST "http://localhost:3001/api/chat/completions?withContext=true" \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{"role": "user", "content": "Tell me about your services"}],
       "stream": true
     }'
   ```

3. **Frontend usage:**
   - Navigate to `/chat?withContext=true` to enable RAG context
   - The frontend automatically passes the query parameter to the API
   - Without the parameter, chat works normally without RAG enhancement

4. **How it works:**
   - When `withContext=true`, the system retrieves top 3 most relevant documents
   - Minimum similarity score: 0.5
   - Searches both FAQs and Terms of Service
   - Context is non-blocking (errors don't fail the request)
   - Retrieved context is formatted and injected into the system message

5. **Include source attribution in responses:**
   ```typescript
   const sources = results.documents.map(d => d.source);
   ```

### Knowledge Base Indexing

1. **Index psychoeducational content:**
   - Create scripts to load curated documents
   - Organize by source (psychoeducation, legal, product)
   - Batch index for efficiency

2. **Update knowledge base:**
   - Regular updates as new content is available
   - Version control for document sources
   - Monitor embedding quality

### Production Enhancements

1. **Add authentication** to RAG endpoints (if needed)
2. **Add rate limiting** specific to RAG endpoints
3. **Add monitoring** and metrics
4. **Add caching** for frequent queries
5. **Add batch indexing** endpoint for large datasets
6. **Add collection management** endpoints
7. **Add document update** functionality

### Qdrant Dashboard

Access the Qdrant web UI at:
http://localhost:6333/dashboard

This allows you to:
- View collections
- Inspect indexed documents
- Test queries
- Monitor performance

---

## Summary

**Status: ✅ Implementation Complete**

All core components are implemented, tested, and integrated. The RAG system is ready for:
- Local development and testing
- Integration with chatbot service
- Knowledge base indexing
- Future enhancements

The system supports both OpenAI embeddings (for production) and mock embeddings (for testing without API costs).

