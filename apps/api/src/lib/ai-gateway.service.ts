import logger from './logger';
import axios, { AxiosInstance } from 'axios';
import { resolveDrSafeSystemPrompt } from './dr-safe-system-prompt';
import { registerUpstreamUrls, isUpstreamHealthy } from './llm-upstream-health';

/**
 * SSE Event Types for AI Streaming
 */
export enum SSEEventType {
  TOKEN = 'token',
  DONE = 'done',
  ERROR = 'error',
  METADATA = 'metadata',
}

/**
 * SSE Message Format
 */
export interface SSEMessage {
  event: SSEEventType;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * Chat Message Interface
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

/**
 * Chat Completion Request
 */
export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  userId?: string;
  sessionId?: string;
  /** When `guest`, the API must not persist or quota-link the request (see chat routes). */
  mode?: 'guest' | 'authenticated';
}

/**
 * Chat Completion Response (Non-streaming)
 */
export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  created: number;
}

/**
 * Token Stream Callback
 * Called for each token in the stream
 */
export type TokenStreamCallback = (token: string, event: SSEEventType) => void;

/**
 * AI Gateway Service
 * Handles AI completions using GPU service (if AI_GPU_BASE_URL is set) or Scaleway Generative API (fallback)
 * Single source of truth: reads AI_GPU_BASE_URL environment variable, never hardcodes
 */
class AIGatewayService {
  private axiosClient: AxiosInstance | null = null;
  private readonly defaultModel = 'llama-3-70b-instruct'; // Scaleway default model
  private readonly defaultTemperature = 0.7;
  private readonly defaultMaxTokens = 1000;
  private readonly scalewayBaseUrl = 'https://api.scaleway.com/ai/v1alpha1';

  /** After repeated failures, pause calls to that upstream for a short window. */
  private circuitOpenUntil = new Map<string, number>();
  private consecutiveFailures = new Map<string, number>();

  /**
   * Get the AI service base URL (chatbot/GPU service if configured, otherwise Scaleway)
   * Supports AI_GPU_BASE_URL and CHATBOT_BASE_URL (same meaning).
   */
  private getAIServiceBaseUrl(): string | null {
    const gpuBaseUrl = process.env.AI_GPU_BASE_URL || process.env.CHATBOT_BASE_URL;
    if (gpuBaseUrl) {
      logger.info(`Using chatbot/GPU AI service: ${gpuBaseUrl}`);
      return gpuBaseUrl.replace(/\/$/, '');
    }
    return null;
  }
  
  /**
   * Get or initialize Scaleway API client (lazy initialization)
   */
  private getScalewayClient(): AxiosInstance {
    if (!this.axiosClient) {
      // Load environment variables if not already loaded
      if (!process.env.SCALEWAY_API_KEY) {
        try {
          require('dotenv').config();
        } catch (e) {
          // dotenv might already be loaded
        }
      }
      
      const apiKey = process.env.SCALEWAY_API_KEY;
      if (!apiKey) {
        logger.warn('SCALEWAY_API_KEY not found in environment variables. Scaleway integration will not work.');
      } else {
        logger.info('Scaleway API key loaded successfully');
      }
      
      this.axiosClient = axios.create({
        baseURL: this.scalewayBaseUrl,
        headers: {
          'X-Auth-Token': apiKey || '',
          'Content-Type': 'application/json',
        },
        timeout: this.getUpstreamTimeoutMs(),
      });
    }
    return this.axiosClient;
  }

  private getUpstreamTimeoutMs(): number {
    const raw = process.env.AI_UPSTREAM_TIMEOUT_MS;
    const n = raw ? parseInt(raw, 10) : 120000;
    return Number.isFinite(n) && n > 0 ? n : 120000;
  }

  /** Optional FastAPI orchestrator / second hop when primary fails (same OpenAI routes). */
  private getChatbotFallbackBaseUrl(): string | null {
    const u = process.env.AI_CHATBOT_FALLBACK_URL?.trim();
    return u ? u.replace(/\/$/, '') : null;
  }

  /** Primary (vLLM or single chatbot URL) then optional fallback — deduped. */
  private getSelfHostedBaseUrlChain(): string[] {
    const primary = this.getAIServiceBaseUrl();
    const fb = this.getChatbotFallbackBaseUrl();
    const out: string[] = [];
    if (primary) out.push(primary);
    if (fb && fb !== primary) out.push(fb);
    return out;
  }

  private hasSelfHostedUpstream(): boolean {
    return this.getSelfHostedBaseUrlChain().length > 0;
  }

  /** Primary + fallback URLs that pass circuit breaker + last health probe. */
  private getReachableSelfHostedChain(): string[] {
    const raw = this.getSelfHostedBaseUrlChain();
    registerUpstreamUrls(raw);
    return raw.filter((u) => {
      if (this.isCircuitOpen(u)) {
        return false;
      }
      return isUpstreamHealthy(u);
    });
  }

  private createOpenAIUpstreamClient(baseUrl: string): AxiosInstance {
    const apiKey = process.env.AI_INTERNAL_API_KEY;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      headers,
      timeout: this.getUpstreamTimeoutMs(),
      validateStatus: () => true,
    });
  }

  private isCircuitOpen(baseUrl: string): boolean {
    const until = this.circuitOpenUntil.get(baseUrl);
    return until != null && Date.now() < until;
  }

  private recordUpstreamFailure(baseUrl: string): void {
    const n = (this.consecutiveFailures.get(baseUrl) || 0) + 1;
    this.consecutiveFailures.set(baseUrl, n);
    if (n >= 5) {
      this.circuitOpenUntil.set(baseUrl, Date.now() + 30000);
      this.consecutiveFailures.set(baseUrl, 0);
      logger.warn('Upstream circuit opened for 30s after 5 failures', { baseUrl });
    }
  }

  private recordUpstreamSuccess(baseUrl: string): void {
    this.consecutiveFailures.delete(baseUrl);
    this.circuitOpenUntil.delete(baseUrl);
  }

  private isRetryableUpstreamError(err: unknown): boolean {
    const anyErr = err as { code?: string; response?: { status?: number } };
    const code = anyErr?.code;
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ENOTFOUND') {
      return true;
    }
    const st = anyErr?.response?.status;
    if (st === 502 || st === 503 || st === 504) return true;
    return false;
  }

  private buildSanitizedMessages(
    request: ChatCompletionRequest
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    const cleanMessages = request.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
    const hasSystemMessage = cleanMessages.some((msg) => msg.role === 'system');
    if (!hasSystemMessage) {
      cleanMessages.unshift({
        role: 'system',
        content: resolveDrSafeSystemPrompt(request.mode),
      });
    }
    return cleanMessages;
  }

  /** Body for self-hosted OpenAI-compatible upstreams; includes optional session correlation for Redis on chatbot. */
  private buildOpenAIUpstreamPayload(
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number,
    stream: boolean
  ): Record<string, unknown> {
    const cleanMessages = this.buildSanitizedMessages(request);
    const body: Record<string, unknown> = {
      model,
      messages: cleanMessages,
      temperature,
      max_tokens: maxTokens,
      stream,
    };
    if (request.sessionId) {
      body.sessionId = request.sessionId;
    }
    return body;
  }

  /**
   * Stream from one OpenAI-compatible `/v1/chat/completions` upstream. Throws on transport/HTTP errors (caller retries / fallback).
   */
  private async *streamOpenAIUpstream(
    baseUrl: string,
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<SSEMessage, void, unknown> {
    const client = this.createOpenAIUpstreamClient(baseUrl);
    const cleanMessages = this.buildSanitizedMessages(request);

    const response = await client.post(
      '/v1/chat/completions',
      this.buildOpenAIUpstreamPayload(request, model, temperature, maxTokens, true),
      {
        responseType: 'stream',
      }
    );

    if (response.status >= 400) {
      throw new Error(`upstream HTTP ${response.status}`);
    }

    yield {
      event: SSEEventType.METADATA,
      data: JSON.stringify({
        model,
        temperature,
        maxTokens,
      }),
    };

    let tokenIndex = 0;
    let fullContent = '';
    let finishReason: string | null = null;
    let buffer = '';

    const tokenQueue: string[] = [];
    let streamEnded = false;
    let streamError: Error | null = null;

    const stream = response.data as NodeJS.ReadableStream;

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') {
            continue;
          }

          try {
            const data = JSON.parse(dataStr);
            const choice = data.choices?.[0];

            if (choice?.delta?.content) {
              const token = choice.delta.content;
              fullContent += token;
              tokenQueue.push(token);
            }

            if (choice?.finish_reason) {
              finishReason = choice.finish_reason;
            }
          } catch {
            continue;
          }
        }
      }
    });

    stream.on('end', () => {
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }
            try {
              const data = JSON.parse(dataStr);
              const choice = data.choices?.[0];
              if (choice?.delta?.content) {
                const token = choice.delta.content;
                fullContent += token;
                tokenQueue.push(token);
              }
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }
            } catch {
              // skip
            }
          }
        }
      }
      streamEnded = true;
    });

    stream.on('error', (error: Error) => {
      streamError = error;
      streamEnded = true;
    });

    while (!streamEnded || tokenQueue.length > 0) {
      if (streamError) {
        throw streamError;
      }

      if (tokenQueue.length > 0) {
        const token = tokenQueue.shift()!;
        yield {
          event: SSEEventType.TOKEN,
          data: JSON.stringify({
            token,
            index: tokenIndex,
            finishReason: null,
          }),
          id: `token-${tokenIndex}`,
        };
        tokenIndex++;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    const estimatedPromptTokens = Math.ceil(
      cleanMessages.reduce((sum: number, msg: { content: string }) => sum + msg.content.length, 0) / 4
    );
    const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);

    yield {
      event: SSEEventType.DONE,
      data: JSON.stringify({
        finishReason: finishReason || 'stop',
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
        },
      }),
    };
  }

  private async postOpenAIUpstream(
    baseUrl: string,
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<ChatCompletionResponse> {
    const client = this.createOpenAIUpstreamClient(baseUrl);

    const response = await client.post(
      '/v1/chat/completions',
      this.buildOpenAIUpstreamPayload(request, model, temperature, maxTokens, false)
    );

    if (response.status >= 400) {
      throw new Error(`upstream HTTP ${response.status}`);
    }

    const completion = response.data;
    const choice = completion.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error('No response from upstream');
    }

    return {
      id: completion.id || `upstream-${Date.now()}`,
      model: completion.model || model,
      choices: [
        {
          index: 0,
          message: {
            role: choice.message.role as 'assistant',
            content: choice.message.content || '',
            timestamp: new Date(),
          },
          finishReason: choice.finish_reason || 'stop',
        },
      ],
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
      created: completion.created || Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Generate completion response using GPU service or Scaleway API
   * Streams tokens from the configured AI service
   */
  async *generateCompletionStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<SSEMessage, void, unknown> {
    const model = request.model || this.defaultModel;
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    if (this.hasSelfHostedUpstream()) {
      const rawLen = this.getSelfHostedBaseUrlChain().length;
      const chain = this.getReachableSelfHostedChain();
      if (chain.length === 0 && rawLen > 0) {
        logger.warn('All self-hosted LLM upstreams unhealthy or circuit-open; falling back to Scaleway');
      }
      for (const baseUrl of chain) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            yield* this.streamOpenAIUpstream(baseUrl, request, model, temperature, maxTokens);
            this.recordUpstreamSuccess(baseUrl);
            return;
          } catch (err) {
            if (attempt === 0 && this.isRetryableUpstreamError(err)) {
              logger.warn('Retrying upstream stream once', { baseUrl });
              continue;
            }
            logger.warn('Upstream stream failed', {
              baseUrl,
              err: err instanceof Error ? err.message : String(err),
            });
            this.recordUpstreamFailure(baseUrl);
            break;
          }
        }
      }
      logger.info('Self-hosted upstreams exhausted; falling back to Scaleway');
    }

    // Fallback to Scaleway
    logger.info(`Generating Scaleway completion: model=${model}, messages=${request.messages.length}`);

    // Check if API key is available
    if (!process.env.SCALEWAY_API_KEY) {
      logger.error('SCALEWAY_API_KEY not configured');
      yield {
        event: SSEEventType.ERROR,
        data: JSON.stringify({
          error: 'Scaleway API key not configured',
          message: 'Please configure SCALEWAY_API_KEY environment variable',
        }),
      };
      return;
    }

    try {
      // Same system prompt + guest-mode handling as self-hosted path (single code path).
      const scalewayMessages = this.buildSanitizedMessages(request);

      // Create Scaleway API request - ONLY send model, messages, temperature, max_tokens
      // DO NOT send: userId, sessionId, wallet addresses, DID, IP addresses, or any other metadata
      const scalewayClient = this.getScalewayClient();
      const response = await scalewayClient.post(
        '/chat/completions',
        {
          model,
          messages: scalewayMessages, // Only role and content, no identifiers
          temperature,
          max_tokens: maxTokens,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      // Send metadata event
      yield {
        event: SSEEventType.METADATA,
        data: JSON.stringify({
          model,
          temperature,
          maxTokens,
        }),
      };

      let tokenIndex = 0;
      let fullContent = '';
      let finishReason: string | null = null;
      let buffer = '';

      // Use a queue-based approach for proper async iteration
      const tokenQueue: string[] = [];
      let streamEnded = false;
      let streamError: Error | null = null;

      // Convert Node.js stream to async iterable using a queue
      const stream = response.data;
      
      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              const choice = data.choices?.[0];
              
              // Handle content delta
              if (choice?.delta?.content) {
                const token = choice.delta.content;
                fullContent += token;
                tokenQueue.push(token);
              }

              // Handle finish reason
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      });

      stream.on('end', () => {
        // Process any remaining buffer
        if (buffer.trim()) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                continue;
              }
              try {
                const data = JSON.parse(dataStr);
                const choice = data.choices?.[0];
                if (choice?.delta?.content) {
                  const token = choice.delta.content;
                  fullContent += token;
                  tokenQueue.push(token);
                }
                if (choice?.finish_reason) {
                  finishReason = choice.finish_reason;
                }
              } catch (parseError) {
                // Skip invalid JSON
              }
            }
          }
        }
        streamEnded = true;
      });

      stream.on('error', (error: Error) => {
        streamError = error;
        streamEnded = true;
      });

      // Yield tokens as they arrive
      while (!streamEnded || tokenQueue.length > 0) {
        if (streamError) {
          throw streamError;
        }

        if (tokenQueue.length > 0) {
          const token = tokenQueue.shift()!;
          yield {
            event: SSEEventType.TOKEN,
            data: JSON.stringify({
              token,
              index: tokenIndex,
              finishReason: null,
            }),
            id: `token-${tokenIndex}`,
          };
          tokenIndex++;
        } else {
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Estimate usage (Scaleway may not provide usage in streaming mode)
      // Rough estimate: ~4 characters per token
      const estimatedPromptTokens = Math.ceil(
        scalewayMessages.reduce((sum, msg) => sum + msg.content.length, 0) / 4
      );
      const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);

      // Send done event
      yield {
        event: SSEEventType.DONE,
        data: JSON.stringify({
          finishReason: finishReason || 'stop',
          usage: {
            promptTokens: estimatedPromptTokens,
            completionTokens: estimatedCompletionTokens,
            totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
          },
        }),
      };
    } catch (error: unknown) {
      const ax = error as {
        message?: string;
        name?: string;
        response?: { status?: number; data?: { message?: string } };
      };
      // Log error without request/response bodies (redacted)
      logger.error('Scaleway streaming error:', {
        error: ax.message ?? 'Unknown error',
        name: ax.name,
        status: ax.response?.status,
      });

      let errorMessage = 'Unknown error';
      const msg = ax.message ?? '';
      const st = ax.response?.status;
      if (msg) {
        errorMessage = msg;
      }
      if (msg.includes('API key') || msg.includes('auth') || st === 401) {
        errorMessage = 'Scaleway API key is invalid or missing';
      } else if (msg.includes('rate limit') || st === 429) {
        errorMessage = 'Scaleway API rate limit exceeded. Please try again later.';
      } else if (msg.includes('quota') || st === 403) {
        errorMessage = 'Scaleway API quota exceeded. Please check your account.';
      } else if (ax.response?.data?.message) {
        errorMessage = ax.response.data.message;
      }
      
      yield {
        event: SSEEventType.ERROR,
        data: JSON.stringify({
          error: 'Scaleway API error',
          message: errorMessage,
        }),
      };
    }
  }

  /**
   * Generate a non-streaming completion using GPU service or Scaleway API
   */
  async generateCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const model = request.model || this.defaultModel;
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    if (this.hasSelfHostedUpstream()) {
      const rawLen = this.getSelfHostedBaseUrlChain().length;
      const chain = this.getReachableSelfHostedChain();
      if (chain.length === 0 && rawLen > 0) {
        logger.warn(
          'All self-hosted LLM upstreams unhealthy or circuit-open; falling back to Scaleway (non-stream)'
        );
      }
      for (const baseUrl of chain) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await this.postOpenAIUpstream(baseUrl, request, model, temperature, maxTokens);
            this.recordUpstreamSuccess(baseUrl);
            return result;
          } catch (err) {
            if (attempt === 0 && this.isRetryableUpstreamError(err)) {
              logger.warn('Retrying upstream completion once', { baseUrl });
              continue;
            }
            logger.warn('Upstream non-stream failed', {
              baseUrl,
              err: err instanceof Error ? err.message : String(err),
            });
            this.recordUpstreamFailure(baseUrl);
            break;
          }
        }
      }
      logger.info('Self-hosted upstreams exhausted; falling back to Scaleway (non-stream)');
    }

    // Fallback to Scaleway
    logger.info(`Generating Scaleway completion (non-streaming): model=${model}`);

    // Check if API key is available
    if (!process.env.SCALEWAY_API_KEY) {
      throw new Error('SCALEWAY_API_KEY not configured');
    }

    try {
      const scalewayMessages = this.buildSanitizedMessages(request);

      // Call Scaleway API - ONLY send model, messages, temperature, max_tokens
      // DO NOT send: userId, sessionId, wallet addresses, DID, IP addresses, or any other metadata
      const scalewayClient = this.getScalewayClient();
      const response = await scalewayClient.post('/chat/completions', {
        model,
        messages: scalewayMessages, // Only role and content, no identifiers
        temperature,
        max_tokens: maxTokens,
        stream: false,
      });

      const completion = response.data;
      const choice = completion.choices?.[0];
      if (!choice || !choice.message) {
        throw new Error('No response from Scaleway');
      }

      return {
        id: completion.id || `scaleway-${Date.now()}`,
        model: completion.model || model,
        choices: [
          {
            index: 0,
            message: {
              role: choice.message.role as 'assistant',
              content: choice.message.content || '',
              timestamp: new Date(),
            },
            finishReason: choice.finish_reason || 'stop',
          },
        ],
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        created: completion.created || Math.floor(Date.now() / 1000),
      };
    } catch (error: unknown) {
      const ax = error as { message?: string; name?: string; response?: { status?: number } };
      logger.error('Scaleway completion error:', {
        error: ax.message ?? 'Unknown error',
        name: ax.name,
        status: ax.response?.status,
      });
      throw error;
    }
  }

  /**
   * Format SSE message according to SSE specification
   */
  formatSSEMessage(message: SSEMessage): string {
    let sse = '';

    if (message.id) {
      sse += `id: ${message.id}\n`;
    }

    if (message.retry) {
      sse += `retry: ${message.retry}\n`;
    }

    sse += `event: ${message.event}\n`;
    sse += `data: ${message.data}\n\n`;

    return sse;
  }
}

// Export singleton instance
export const aiGatewayService = new AIGatewayService();
export default aiGatewayService;


