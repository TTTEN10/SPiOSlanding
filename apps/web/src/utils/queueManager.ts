/**
 * Queue manager for offline actions
 */

interface QueuedAction {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retries: number;
}

const STORAGE_KEY = 'offlineActionQueue';
const MAX_RETRIES = 3;

export class OfflineQueueManager {
  private queue: QueuedAction[] = [];

  constructor() {
    // SSR/prerender: localStorage doesn't exist. We'll start with an empty queue.
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.loadQueue();
    }
  }

  private loadQueue() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.queue = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  add(url: string, options: RequestInit): string {
    const id = `action-${Date.now()}-${Math.random()}`;
    const action: QueuedAction = {
      id,
      url,
      options,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(action);
    this.saveQueue();
    return id;
  }

  async processQueue(): Promise<{ succeeded: number; failed: number }> {
    if (this.queue.length === 0) return { succeeded: 0, failed: 0 };

    const results = { succeeded: 0, failed: 0 };
    const remaining: QueuedAction[] = [];

    for (const action of this.queue) {
      try {
        const response = await fetch(action.url, action.options);
        if (response.ok) {
          results.succeeded++;
        } else {
          action.retries++;
          if (action.retries < MAX_RETRIES) {
            remaining.push(action);
          } else {
            results.failed++;
          }
        }
      } catch (error) {
        action.retries++;
        if (action.retries < MAX_RETRIES) {
          remaining.push(action);
        } else {
          results.failed++;
        }
      }
    }

    this.queue = remaining;
    this.saveQueue();
    return results;
  }

  clear() {
    this.queue = [];
    this.saveQueue();
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueueManager();

