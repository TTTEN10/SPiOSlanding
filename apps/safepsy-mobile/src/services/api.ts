import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/env';
import { getWalletSessionToken } from './secureToken';

const DEFAULT_TIMEOUT_MS = 15_000;

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    __retryCount?: number;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(error: AxiosError): boolean {
  if (!error.response) return true;
  const s = error.response.status;
  return s === 408 || s === 429 || (s >= 500 && s < 600);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getWalletSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    if (!config || !isRetryable(error)) {
      return Promise.reject(error);
    }

    const max = 3;
    const count = config.__retryCount ?? 0;
    if (count >= max) {
      return Promise.reject(error);
    }

    config.__retryCount = count + 1;
    const backoff = 500 * Math.pow(2, count);
    await delay(backoff);
    return apiClient(config);
  },
);
