export type ChatApiRole = 'user' | 'assistant' | 'system';

export type ChatApiMessage = { role: ChatApiRole; content: string };

export type StreamPhase = 'idle' | 'connecting' | 'streaming' | 'retrying' | 'error';

export type StreamChatOptions = {
  baseUrl: string;
  messages: ChatApiMessage[];
  mode: 'guest' | 'authenticated';
  bearerToken?: string | null;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onFinish: () => void;
  onError: (err: Error) => void;
  connectRetries?: number;
  /** Throttle UI commits (ms) while streaming. */
  flushIntervalMs?: number;
  onPhase?: (phase: StreamPhase) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function postSseStream(
  url: string,
  init: RequestInit,
  retries: number,
  onPhase?: (p: StreamPhase) => void,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (init.signal?.aborted) {
      const e = new Error('Aborted');
      e.name = 'AbortError';
      throw e;
    }
    if (attempt > 0) {
      onPhase?.('retrying');
    } else {
      onPhase?.('connecting');
    }
    try {
      const response = await fetch(url, init);
      if (!response.ok && response.status >= 500 && attempt < retries) {
        await sleep(400 * Math.pow(2, attempt));
        continue;
      }
      return response;
    } catch (e) {
      lastErr = e;
      const aborted = e instanceof Error && e.name === 'AbortError';
      if (attempt < retries && !aborted) {
        await sleep(400 * Math.pow(2, attempt));
        continue;
      }
      throw e;
    }
  }
  if (lastErr instanceof Error) throw lastErr;
  throw new Error(lastErr ? String(lastErr) : 'Stream connection failed');
}

/**
 * Parses the same SSE shapes as apps/web ChatWidget (OpenAI-style chunks + optional event: lines).
 * Batches text deltas to reduce GiftedChat re-render churn.
 */
export async function streamChatCompletion(options: StreamChatOptions): Promise<void> {
  const {
    baseUrl,
    messages,
    mode,
    bearerToken,
    signal,
    onDelta,
    onFinish,
    onError,
    connectRetries = 2,
    flushIntervalMs = 80,
    onPhase,
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  let finished = false;
  let buffer = '';
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flushPending = () => {
    if (!buffer) return;
    const chunk = buffer;
    buffer = '';
    onDelta(chunk);
  };

  const finishOnce = () => {
    if (finished) return;
    if (flushTimer != null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushPending();
    finished = true;
    onPhase?.('idle');
    onFinish();
  };

  const pushDelta = (text: string) => {
    if (!text) return;
    buffer += text;
    if (flushTimer != null) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushPending();
    }, flushIntervalMs);
  };

  try {
    const response = await postSseStream(
      `${baseUrl.replace(/\/$/, '')}/api/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages,
          stream: true,
          mode,
        }),
        signal,
      },
      connectRetries,
      onPhase,
    );

    if (!response.ok) {
      const text = await response.text();
      let message = text || response.statusText;
      try {
        const j = JSON.parse(text) as { message?: string; error?: string };
        if (j.message) message = j.message;
        else if (j.error) message = j.error;
      } catch {
        /* keep raw */
      }
      throw new Error(message);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    onPhase?.('streaming');

    const decoder = new TextDecoder();
    let lineBuffer = '';
    let currentEvent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }
        if (!line.startsWith('data: ')) continue;

        const raw = line.slice(6).trim();
        if (raw === '[DONE]') {
          finishOnce();
          continue;
        }

        try {
          const data = JSON.parse(raw) as {
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
            token?: string;
            error?: string;
            message?: string;
          };

          const delta = data?.choices?.[0]?.delta as { content?: string } | undefined;
          if (delta?.content) {
            pushDelta(delta.content);
          }

          const finishReason = data?.choices?.[0]?.finish_reason;
          if (finishReason) {
            finishOnce();
          }

          if (currentEvent === 'token' && typeof data.token === 'string') {
            pushDelta(data.token);
          } else if (currentEvent === 'done') {
            finishOnce();
          } else if (currentEvent === 'error') {
            throw new Error(data.message || data.error || 'Streaming error');
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
    if (!finished) {
      finishOnce();
    }
  } catch (e) {
    if (flushTimer != null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushPending();
    const err = e instanceof Error ? e : new Error(String(e));
    if (err.name === 'AbortError') {
      if (!finished) {
        finishOnce();
      }
      return;
    }
    onPhase?.('error');
    onError(err);
    onPhase?.('idle');
  }
}
