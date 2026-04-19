# Chat Implementation Summary

This document summarizes the chat API implementation with SSE streaming support.

## ✅ Completed Implementation

### 1. AI Gateway Service (`src/lib/ai-gateway.service.ts`)

**Features:**
- Mock AI completions with realistic token-by-token streaming
- Support for both streaming and non-streaming responses
- Configurable parameters (temperature, maxTokens, model)
- Token estimation and delay simulation
- Context-aware mock responses based on user input

**Key Methods:**
- `generateCompletionStream()` - Async generator for token streaming
- `generateCompletion()` - Non-streaming completion
- `formatSSEMessage()` - Format messages according to SSE spec

**Mock Response Logic:**
- Responds to greetings, anxiety, depression, stress, and gratitude
- Default empathetic responses for other inputs
- Realistic token delays (20-50ms per token)

### 2. Chat Routes (`src/routes/chat.ts`)

**Endpoints:**
- `POST /api/chat/completions` - Main chat completion endpoint
- `GET /api/chat/health` - Health check
- `POST /api/chat/test-stream` - Test SSE streaming

**Features:**
- SSE streaming support (token-by-token)
- Non-streaming mode support
- Request validation using Joi
- Rate limiting
- Error handling for both streaming and non-streaming
- Higher body size limit (100KB) for chat messages

### 3. SSE Streaming Contract

**Event Types:**
- `connected` - Connection confirmation
- `metadata` - Completion metadata
- `token` - Individual tokens
- `done` - Completion finished
- `error` - Error occurred

**Message Format:**
```
event: <event_type>
data: <json_data>
id: <optional_id>
retry: <optional_retry>
```

## 📁 Files Created

1. **`apps/api/src/lib/ai-gateway.service.ts`**
   - AI gateway service with mock completions
   - SSE message formatting
   - Token streaming logic

2. **`apps/api/src/routes/chat.ts`**
   - Chat API routes
   - SSE streaming implementation
   - Request validation

3. **[api/SSE_STREAMING_CONTRACT.md](api/SSE_STREAMING_CONTRACT.md)**
   - Complete SSE contract documentation
   - Client implementation examples
   - Best practices and testing

## 🔧 Integration

The chat routes are integrated into the main server:
- Added to `apps/api/src/index.ts`
- Available at `/api/chat/*`
- Uses existing middleware (validation, rate limiting, logging)

## Guest mode (`mode: "guest"`)

The web app sends `mode: "guest"` on `POST /api/chat/completions` when the user has **not** completed wallet verification.

| Aspect | Guest | Authenticated (wallet verified) |
|--------|-------|----------------------------------|
| Client persistence | In-memory only (React state); lost on refresh | Encrypted blob via `/api/chat/save` + wallet keys |
| Prompt cap | 5 user messages per browser session (enforced in UI) | Quota / subscription rules |
| API `mode` | `"guest"` | `"authenticated"` (or omit; server treats as authenticated for quota) |
| Server persistence | None for chat content; no quota increment for DID | Quota increment + encrypted storage on client-triggered save |

**Server behavior for `mode: "guest"`:**

- `optionalQuotaMiddleware` skips attaching DID quota when `body.mode === "guest"`.
- The completions handler skips DID usage increment when `request.mode === "guest"`.
- Message text must not be written to application logs; the AI gateway already sends only `role`/`content` to upstream providers.

## API deployment topologies

| Topology | What serves `/api/...` | Chat widget (`/api/chat/completions`) |
|----------|-------------------------|----------------------------------------|
| **Local / full stack** | Node `apps/api` (e.g. port 3001) | Works: SSE contract, guest mode, save/load, quota. |
| **`deployment/deploy-app.sh` production** | Caddy → **minimal FastAPI** proxy → vLLM OpenAI API | **Not supported** by that proxy alone: the widget expects SafePsy SSE and `/api/chat/*` routes implemented in `apps/api`. The script exposes vLLM via `/api/v1/models` and `/api/v1/chat/completions` (OpenAI shape). |
| **`apps/ai-chatbot`** | Optional FastAPI + in-process or routed vLLM | Separate service; configure `AI_INTERNAL_API_KEY` and backend URL per your compose. |

For the **SSE wire format** used by `apps/api`, see [api/SSE_STREAMING_CONTRACT.md](api/SSE_STREAMING_CONTRACT.md).

## 📝 Usage Examples

### Streaming Request (without RAG context)

```bash
curl -N -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/chat/completions \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, I feel anxious"}
    ],
    "stream": true,
    "temperature": 0.7,
    "maxTokens": 1000
  }'
```

### Streaming Request (with RAG context)

```bash
curl -N -H "Content-Type: application/json" \
  -X POST "http://localhost:3001/api/chat/completions?withContext=true" \
  -d '{
    "messages": [
      {"role": "user", "content": "Tell me about your services"}
    ],
    "stream": true,
    "temperature": 0.7,
    "maxTokens": 1000
  }'
```

### Non-Streaming Request (without RAG context)

```bash
curl -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/chat/completions \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "stream": false
  }'
```

### Non-Streaming Request (with RAG context)

```bash
curl -H "Content-Type: application/json" \
  -X POST "http://localhost:3001/api/chat/completions?withContext=true" \
  -d '{
    "messages": [
      {"role": "user", "content": "What are your FAQs?"}
    ],
    "stream": false
  }'
```

### Test Stream

```bash
curl -N -X POST http://localhost:3001/api/chat/test-stream
```

## 🎯 Key Features

1. **Token-by-Token Streaming**: Real-time token delivery via SSE
2. **Mock Completions**: Realistic AI responses for testing
3. **Flexible API**: Supports both streaming and non-streaming
4. **Validation**: Comprehensive input validation
5. **Error Handling**: Robust error handling for both modes
6. **Rate Limiting**: Built-in rate limiting protection
7. **Documentation**: Complete SSE contract documentation

## 🔄 Request/Response Flow

### Streaming Flow

1. Client sends POST request with `stream: true`
2. Server sets SSE headers
3. Server sends `connected` event
4. Server sends `metadata` event
5. Server streams `token` events (one per token)
6. Server sends `done` event with usage stats
7. Connection closes

### Non-Streaming Flow

1. Client sends POST request with `stream: false` (or omitted)
2. Server generates full completion
3. Server returns JSON response with complete message

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3001/api/chat/health
```

### Test Stream
```bash
curl -N -X POST http://localhost:3001/api/chat/test-stream
```

### Full Chat Test
```bash
curl -N -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/chat/completions \
  -d '{"messages":[{"role":"user","content":"Hello"}],"stream":true}'
```

## 📊 Response Examples

### Streaming Response

```
event: connected
data: {"status":"connected"}

event: metadata
data: {"model":"safepsy-therapy-v1","temperature":0.7,"maxTokens":1000,"totalTokens":150}

event: token
id: token-0
data: {"token":"Hello","index":0,"finishReason":null}

event: token
id: token-1
data: {"token":"!","index":1,"finishReason":null}

...

event: done
data: {"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":150,"totalTokens":160}}
```

### Non-Streaming Response

```json
{
  "id": "chatcmpl-1234567890-abc123",
  "model": "safepsy-therapy-v1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm here to help you...",
        "timestamp": "2024-01-01T00:00:00.000Z"
      },
      "finishReason": "stop"
    }
  ],
  "usage": {
    "promptTokens": 10,
    "completionTokens": 150,
    "totalTokens": 160
  },
  "created": 1704067200
}
```

## 🔒 Security

- Rate limiting on all endpoints
- Input validation (Joi schemas)
- Body size limits (100KB for chat)
- Error handling prevents information leakage
- CORS headers (adjust for production)

## 🚀 Next Steps

1. **Replace Mock with Real AI**: Integrate with OpenAI, Anthropic, or other AI providers
2. **Add Conversation History**: Store and retrieve conversation history
3. **User Authentication**: Add user-specific rate limits and tracking
4. **Token Usage Tracking**: Track token usage per user/session
5. **Function Calling**: Add support for function calling
6. **Multi-modal Support**: Add image and other media support
7. **Streaming Improvements**: Add retry logic and better error recovery

## 📚 Documentation

- **SSE Contract**: See [api/SSE_STREAMING_CONTRACT.md](api/SSE_STREAMING_CONTRACT.md)
- **API Routes**: See `src/routes/chat.ts` for route implementation
- **Service**: See `src/lib/ai-gateway.service.ts` for service implementation

## 🐛 Troubleshooting

### Stream Not Working
- Check that `stream: true` is set in request
- Verify SSE headers are set correctly
- Check browser console for errors
- Ensure no proxy is buffering the stream

### Tokens Not Appearing
- Check network tab for SSE events
- Verify event parsing logic
- Check for connection drops
- Review server logs

### Rate Limiting
- Check rate limit headers in response
- Wait for rate limit window to reset
- Consider implementing user-based rate limits


# Chat Routes & AI Gateway Service - Implementation Summary

## Overview

Complete implementation of chat routes and AI gateway service for SafePsy, providing encrypted chat storage and AI-powered mental health assistance with SSE streaming support.

## Files

### 1. Chat Routes (`apps/api/src/routes/chat.ts`)

**Endpoints:**

#### `POST /api/chat/save`
- **Purpose:** Save encrypted chat history
- **Auth:** Required (wallet session)
- **Request Body:**
  ```json
  {
    "encryptedChatBlob": "base64_encrypted_data",
    "didTokenId": "123" // Optional
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "chatId": "cuid",
      "blobHash": "0x...",
      "chatReference": "0x...",
      "requiresDidUpdate": true
    }
  }
  ```
- **Features:**
  - Validates wallet authentication
  - Verifies DID ownership if DID exists
  - Generates SHA-256 hash of encrypted blob
  - Stores in database with hash
  - Returns chat reference for DID contract update

#### `GET /api/chat/load`
- **Purpose:** Load encrypted chat history
- **Auth:** Required (wallet session)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "hasChat": true,
      "encryptedChatBlob": "base64_encrypted_data",
      "blobHash": "0x...",
      "didTokenId": "123",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Features:**
  - Loads encrypted chat from database
  - Optionally verifies hash against DID contract
  - Returns null if no chat exists

#### `POST /api/chat/completions?withContext=true`
- **Purpose:** AI chat completion with SSE streaming
- **Auth:** Optional (wallet session recommended)
- **Query Parameters:**
  - `withContext` (optional): If set to `true`, enables RAG (Retrieval-Augmented Generation) context from FAQs and Terms of Service. Default: `false` (RAG context disabled)
- **Request Body:**
  ```json
  {
    "messages": [
      {
        "role": "user",
        "content": "Hello, I'm feeling anxious"
      }
    ],
    "model": "gpt-4o-mini", // Optional
    "temperature": 0.7, // Optional (0-2)
    "maxTokens": 1000, // Optional (1-4000)
    "stream": true, // Optional (default: true)
    "userId": "user-123", // Optional
    "sessionId": "session-456" // Optional
  }
  ```
- **Response (Streaming):**
  - SSE stream with events: `connected`, `metadata`, `token`, `done`, `error`
- **Response (Non-streaming):**
  ```json
  {
    "success": true,
    "data": {
      "id": "chatcmpl-...",
      "model": "gpt-4o-mini",
      "choices": [...],
      "usage": {...}
    }
  }
  ```
- **Features:**
  - SSE streaming support (default)
  - Non-streaming mode available
  - Optional RAG context enhancement via `?withContext=true` query parameter
  - When `withContext=true`, retrieves relevant FAQs and Terms of Service content to enhance responses
  - Rate limiting (20 requests/minute per wallet/IP)
  - Safety middleware (injection filtering, moderation)
  - Client disconnect detection
  - Comprehensive error handling

#### `GET /api/chat/health`
- **Purpose:** Health check for chat endpoints
- **Auth:** None
- **Response:**
  ```json
  {
    "success": true,
    "message": "Chat endpoints are healthy",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### 2. AI Gateway Service (`apps/api/src/lib/ai-gateway.service.ts`)

**Features:**

#### OpenAI Integration
- Lazy initialization of OpenAI client
- Environment variable configuration (`OPENAI_API_KEY`)
- Default model: `gpt-4o-mini`
- Default temperature: `0.7`
- Default max tokens: `1000`

#### Streaming Completion (`generateCompletionStream`)
- Async generator for SSE streaming
- Token-by-token streaming from OpenAI
- Events:
  - `connected`: Initial connection
  - `metadata`: Model and parameters
  - `token`: Individual tokens with index
  - `done`: Completion with usage stats
  - `error`: Error details
- Automatic system message injection (mental health assistant)
- Token usage estimation (streaming mode)
- Comprehensive error handling

#### Non-Streaming Completion (`generateCompletion`)
- Full completion response
- Accurate token usage (from OpenAI)
- Same system message injection
- Error handling

### 3. Rate Limiting (`apps/api/src/lib/ratelimit.ts`)

**Chat Rate Limit:**
- **Window:** 1 minute
- **Max Requests:** 20 per minute
- **Key Generator:** Uses wallet address if authenticated, otherwise IP
- **Skip:** Health check endpoints
- **Message:** User-friendly error message

### 4. Safety Middleware (`apps/api/src/middleware/safety.ts`)

**Applied to all chat routes:**
- **Injection Filtering:** SQL, XSS, command injection, path traversal, NoSQL
- **Moderation:** Profanity, hate speech, threats
- **PII Redaction:** Email, phone, credit card, SSN, IP addresses
- **Configurable:** Block or sanitize on detection
- **Logging:** Violation detection logging

## Security Features

1. **Authentication:**
   - Wallet-based authentication for save/load
   - Optional authentication for completions
   - DID ownership verification

2. **Rate Limiting:**
   - Per-wallet rate limiting
   - IP-based fallback
   - Prevents abuse

3. **Input Validation:**
   - Joi schema validation
   - Message length limits (1-10000 chars)
   - Array size limits (1-100 messages)
   - Parameter bounds checking

4. **Safety Checks:**
   - Injection pattern detection
   - Content moderation
   - PII redaction

5. **Error Handling:**
   - Comprehensive error messages
   - Error codes for programmatic handling
   - Safe error responses (no sensitive data)

## SSE Streaming Contract

### Event Types

1. **`connected`**
   ```json
   {
     "status": "connected",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

2. **`metadata`**
   ```json
   {
     "model": "gpt-4o-mini",
     "temperature": 0.7,
     "maxTokens": 1000
   }
   ```

3. **`token`**
   ```json
   {
     "token": "Hello",
     "index": 0,
     "finishReason": null
   }
   ```

4. **`done`**
   ```json
   {
     "finishReason": "stop",
     "usage": {
       "promptTokens": 50,
       "completionTokens": 150,
       "totalTokens": 200
     }
   }
   ```

5. **`error`**
   ```json
   {
     "error": "OpenAI API error",
     "message": "Rate limit exceeded",
     "code": "RATE_LIMIT"
   }
   ```

## Usage Examples

### Save Encrypted Chat

```typescript
const response = await fetch('/api/chat/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': walletAddress,
    'x-chain-id': '1',
  },
  credentials: 'include',
  body: JSON.stringify({
    encryptedChatBlob: encryptedData,
    didTokenId: didInfo.tokenId,
  }),
});
```

### Load Encrypted Chat

```typescript
const response = await fetch('/api/chat/load', {
  method: 'GET',
  headers: {
    'x-wallet-address': walletAddress,
    'x-chain-id': '1',
  },
  credentials: 'include',
});
```

### Stream Chat Completion (without RAG context)

```typescript
const response = await fetch('/api/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    stream: true,
  }),
});

const reader = response.body?.getReader();
// Process SSE stream...
```

### Stream Chat Completion (with RAG context)

```typescript
const response = await fetch('/api/chat/completions?withContext=true', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Tell me about your services' }],
    stream: true,
  }),
});

const reader = response.body?.getReader();
// Process SSE stream with RAG-enhanced context...
```

### Non-Streaming Completion

```typescript
const response = await fetch('/api/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    stream: false,
  }),
});

const result = await response.json();
console.log('Completion:', result.data.choices[0].message.content);
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - OpenAI API key (required for chat)
- `FRONTEND_URL` - Frontend URL for CORS
- `SAFETY_INJECTION_FILTER_ENABLED` - Enable injection filtering (default: true)
- `SAFETY_MODERATION_ENABLED` - Enable moderation (default: true)
- `SAFETY_PII_REDACTION_ENABLED` - Enable PII redaction (default: true)

### Default Values

- **Model:** `gpt-4o-mini`
- **Temperature:** `0.7`
- **Max Tokens:** `1000`
- **Rate Limit:** 20 requests/minute
- **Body Size Limit:** 100KB for completions, 10KB default

## Error Handling

### Error Codes

- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SAFETY_VIOLATION` - Content safety violation
- `STREAM_ERROR` - Streaming error
- `COMPLETION_ERROR` - Completion generation error
- `VALIDATION_ERROR` - Request validation failed

### Error Response Format

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable message",
  "code": "ERROR_CODE"
}
```

## Testing

### Health Check
```bash
curl http://localhost:3001/api/chat/health
```

### Test Completion (Non-streaming, without RAG context)
```bash
curl -X POST http://localhost:3001/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

### Test Completion (Non-streaming, with RAG context)
```bash
curl -X POST "http://localhost:3001/api/chat/completions?withContext=true" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Tell me about your services"}],
    "stream": false
  }'
```

### Test Completion (Streaming, with RAG context)
```bash
curl -N -X POST "http://localhost:3001/api/chat/completions?withContext=true" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What are your FAQs?"}],
    "stream": true
  }'
```

## Future Enhancements

1. **Conversation History Management:**
   - Automatic conversation threading
   - Context window management
   - Conversation summarization

2. **Advanced Safety:**
   - Real-time content moderation API
   - Sentiment analysis
   - Crisis detection

3. **Performance:**
   - Response caching
   - Token usage optimization
   - Connection pooling

4. **Analytics:**
   - Usage tracking
   - Response quality metrics
   - User satisfaction tracking

