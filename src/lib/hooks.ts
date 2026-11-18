import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from './api';

// Shared GET cache + in-flight dedupe: identical paths used by several screens
// (stations on Home + Play, orders on Home + Order, friends on Home + Chat) cost ONE request.
const cache = new Map<string, { data: unknown; ts: number }>();
const inflight = new Map<string, Promise<unknown>>();
const failures = new Map<string, number>();

export function clearApiCache() { cache.clear(); inflight.clear(); failures.clear(); }

function fetchShared<T>(path: string): Promise<T> {
  const cur = inflight.get(path);
  if (cur) return cur as Promise<T>;
  const p = api.get<T>(path)
    .then((res) => { cache.set(path, { data: res, ts: Date.now() }); failures.delete(path); return res; })
    .catch((e) => { failures.set(path, (failures.get(path) ?? 0) + 1); throw e; })
    .finally(() => { inflight.delete(path); });
  inflight.set(path, p);
  return p;
}

type Opts<T> = {
  /** Poll interval while focused + app active. Number or function of the latest data (adaptive). */
  pollMs?: number | ((data: T | null) => number);
  /** Focus/mount refetch is skipped while cached data is younger than this. Default 5s (or pollMs). */
  ttlMs?: number;
};

/**
 * GET an /api route. Cached + deduped across screens, refetches on focus only when stale,
 * polls only while focused AND the app is foregrounded, exponential backoff on errors.
 */
export function useApi<T>(path: string | null, opts: Opts<T> = {}) {
  const cached = path ? (cache.get(path) as { data: T; ts: number } | undefined) : undefined;
  const [data, setData] = useState<T | null>(cached ? cached.data : null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(!!path && !cached);
  const pathRef = useRef(path);
  pathRef.current = path;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const dataRef = useRef<T | null>(data);
  dataRef.current = data;

  const refresh = useCallback(async () => {
    const p = pathRef.current;
    if (!p) return;
    try {
      const res = await fetchShared<T>(p);
      if (pathRef.current === p) { setData(res); setError(null); }
    } catch (e) {
      if (pathRef.current === p) setError(e);
    } finally {
      if (pathRef.current === p) setLoading(false);
    }
  }, []);

  const ttlOf = () => {
    const o = optsRef.current;
    return o.ttlMs ?? 5_000;
  };

  // Path change: show cached data instantly, fetch only if stale.
  useEffect(() => {
    if (!path) { setLoading(false); return; }
    const c = cache.get(path) as { data: T; ts: number } | undefined;
    if (c) { setData(c.data); setLoading(false); } else { setData(null); setLoading(true); }
    if (!c || Date.now() - c.ts > ttlOf()) void refresh();
  }, [path, refresh]);

  useFocusEffect(
    useCallback(() => {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const age = () => { const c = pathRef.current ? cache.get(pathRef.current) : undefined; return c ? Date.now() - c.ts : Infinity; };
      const baseMs = () => {
        const pm = optsRef.current.pollMs;
        return typeof pm === 'function' ? pm(dataRef.current) : pm ?? 0;
      };
      const schedule = () => {
        if (stopped) return;
        const base = baseMs();
        if (!base) return;
        const f = pathRef.current ? failures.get(pathRef.current) ?? 0 : 0;
        const delay = f > 0 ? Math.min(base * 2 ** f, 120_000) : base;
        timer = setTimeout(async () => {
          if (stopped) return;
          if (AppState.currentState === 'active' && age() >= delay - 500) await refresh();
          schedule();
        }, delay);
      };
      // Focus refetch only when stale (debounced), then poll.
      if (age() > ttlOf()) void refresh();
      schedule();
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active' && age() > ttlOf()) void refresh();
      });
      return () => { stopped = true; if (timer) clearTimeout(timer); sub.remove(); };
    }, [refresh]),
  );

  return { data, error, loading, refresh, setData };
}

/** Current time, ticking every `ms` (for countdowns; local only, no network). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}
