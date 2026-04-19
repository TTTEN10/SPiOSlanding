import axios from 'axios';
import logger from './logger';

type Entry = { ok: boolean; checkedAt: number; err?: string };

const status = new Map<string, Entry>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function normalizeBase(url: string): string {
  return url.replace(/\/$/, '');
}

/** Register URLs to probe (idempotent). New URLs start optimistic (ok) until first probe completes. */
export function registerUpstreamUrls(urls: string[]): void {
  for (const raw of urls) {
    const u = normalizeBase(raw);
    if (!status.has(u)) {
      status.set(u, { ok: true, checkedAt: 0 });
    }
  }
}

export function registerUpstreamUrlsFromEnv(): void {
  const primary = process.env.AI_GPU_BASE_URL || process.env.CHATBOT_BASE_URL;
  const fb = process.env.AI_CHATBOT_FALLBACK_URL;
  const list = [primary, fb].filter(Boolean) as string[];
  registerUpstreamUrls(list);
}

async function probe(url: string): Promise<void> {
  const client = axios.create({
    baseURL: url,
    timeout: 4000,
    validateStatus: () => true,
  });
  try {
    const h = await client.get('/health');
    if (h.status >= 200 && h.status < 500) {
      status.set(url, { ok: true, checkedAt: Date.now() });
      return;
    }
  } catch (e: any) {
    // try /v1/models
  }
  try {
    const m = await client.get('/v1/models');
    if (m.status === 200) {
      status.set(url, { ok: true, checkedAt: Date.now() });
      return;
    }
    status.set(url, { ok: false, checkedAt: Date.now(), err: `HTTP ${m.status}` });
  } catch (e: any) {
    status.set(url, { ok: false, checkedAt: Date.now(), err: e?.message || 'probe failed' });
    logger.warn('LLM upstream health probe failed', { url, err: e?.message });
  }
}

async function runProbeCycle(): Promise<void> {
  const urls = [...status.keys()];
  await Promise.all(urls.map((u) => probe(u)));
}

export function isUpstreamHealthy(url: string): boolean {
  if (process.env.AI_SKIP_UPSTREAM_HEALTH_CHECK === '1') {
    return true;
  }
  const u = normalizeBase(url);
  const s = status.get(u);
  if (!s) return true;
  return s.ok;
}

export function getUpstreamHealthSnapshot(): Record<string, Entry> {
  return Object.fromEntries(status);
}

export function startLlmUpstreamHealthPoller(): void {
  registerUpstreamUrlsFromEnv();
  if (intervalId) {
    return;
  }
  void runProbeCycle();
  const ms = Number(process.env.AI_UPSTREAM_HEALTH_INTERVAL_MS || 30000);
  intervalId = setInterval(() => {
    void runProbeCycle();
  }, Number.isFinite(ms) && ms >= 5000 ? ms : 30000);
  logger.info('LLM upstream health poller started');
}
