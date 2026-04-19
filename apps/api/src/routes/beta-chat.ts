import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import logger from '../lib/logger';
import { mountChatCompletions } from './chat-completions';

const router = Router();

/** OpenAI-compatible path: POST /beta/chat/completions (same behavior as POST /api/chat/completions) */
mountChatCompletions(router, '/chat/completions');

const FALLBACK_BODY = {
  success: false,
  fallback: true,
  message:
    'The assistant is temporarily unavailable. Please try again in a moment.',
};

/** Add https:// if no scheme (e.g. safepsy.com/beta/chat). */
function normalizeOriginOrUrl(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return `https://${t}`;
}

/**
 * Optional full POST URL (overrides everything).
 * Otherwise CHATBOT_BASE_URL: if it already ends with /chat or /beta/chat, use as-is; else append /chat.
 * Else CHATBOT_PRIVATE_IP → http://ip:8000/chat
 */
function resolveUpstreamPostUrl(): string | null {
  const direct = process.env.CHATBOT_CHAT_URL?.trim();
  if (direct) return normalizeOriginOrUrl(direct);

  const raw = process.env.CHATBOT_BASE_URL?.trim();
  if (raw) {
    const u = normalizeOriginOrUrl(raw).replace(/\/$/, '');
    if (/\/(beta\/)?chat$/.test(u)) return u;
    return `${u}/chat`;
  }

  const ip = process.env.CHATBOT_PRIVATE_IP?.trim();
  if (ip) return `http://${ip}:8000/chat`;
  return null;
}

function requestHost(req: Request): string | undefined {
  const xf = req.get('x-forwarded-host');
  if (xf) return xf.split(',')[0]?.trim().split(':')[0];
  return req.get('host')?.split(':')[0];
}

function wouldLoop(upstreamUrl: string, req: Request): boolean {
  try {
    const u = new URL(upstreamUrl);
    const h = requestHost(req);
    if (!h) return false;
    return u.hostname === h;
  } catch {
    return false;
  }
}

async function forwardOnce(
  url: string,
  body: unknown,
  headers: Record<string, string>
) {
  return axios.post(url, body, {
    headers,
    timeout: 5000,
    validateStatus: () => true,
  });
}

router.post('/chat', async (req: Request, res: Response) => {
  const url = resolveUpstreamPostUrl();
  if (!url) {
    logger.warn('CHATBOT_CHAT_URL / CHATBOT_BASE_URL / CHATBOT_PRIVATE_IP not set; /beta/chat fallback');
    return res.status(200).json(FALLBACK_BODY);
  }

  if (wouldLoop(url, req)) {
    logger.warn(
      'Upstream URL targets this API host — refusing to avoid a request loop. Point CHATBOT_* at the FastAPI chatbot (e.g. http://<chatbot-ip>:8000/chat).',
      { url }
    );
    return res.status(200).json(FALLBACK_BODY);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = process.env.CHATBOT_INTERNAL_API_KEY?.trim();
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }

  const attempt = async () => forwardOnce(url, req.body, headers);

  try {
    let r = await attempt();
    if (r.status >= 500) {
      r = await attempt();
    }
    if (r.status >= 200 && r.status < 300) {
      return res.status(r.status).json(r.data);
    }
    logger.warn('beta/chat upstream non-success', { status: r.status, url });
    return res.status(200).json(FALLBACK_BODY);
  } catch (err) {
    const ax = err as AxiosError;
    logger.warn('beta/chat upstream error; retrying once', {
      url,
      message: ax.message,
      code: ax.code,
    });
    try {
      const r2 = await attempt();
      if (r2.status >= 200 && r2.status < 300) {
        return res.status(r2.status).json(r2.data);
      }
    } catch (err2) {
      logger.error('beta/chat retry failed', {
        err: err2 instanceof Error ? err2.message : String(err2),
      });
    }
    return res.status(200).json(FALLBACK_BODY);
  }
});

export default router;
