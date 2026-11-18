// Thin client for the Ninja server API. Every response is { ok, ... } or
// { ok:false, code, message } — failures throw ApiError with the server code.
import { API_BASE } from './config';
import { getIdToken } from './auth';
import { DEMO, demoRequest } from './demo';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown, opts: { auth?: boolean; timeoutMs?: number } = {}): Promise<T> {
  if (DEMO) return demoRequest<T>(method, path, body);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const token = await getIdToken();
    if (!token) throw new ApiError('UNAUTHENTICATED', 'Please sign in again.', 401);
    headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('NETWORK', 'No connection. Check your internet and try again.', 0);
  } finally {
    clearTimeout(timer);
  }
  let data: any = null;
  try { const text = await res.text(); data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok || data?.ok === false) {
    throw new ApiError(
      (data && typeof data.code === 'string' && data.code) || `HTTP_${res.status}`,
      (data && typeof data.message === 'string' && data.message) || 'Something went wrong. Please try again.',
      res.status,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: { auth?: boolean }) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) => request<T>('POST', path, body ?? {}, opts),
  del: <T>(path: string) => request<T>('DELETE', path),
};

/** Unique key so a retried / double-tapped money action runs at most once. */
export function idemKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}
