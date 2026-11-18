import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, ApiError } from './api';
import { clearApiCache } from './hooks';
import { clearSession, exchangeCustomToken, restoreSession } from './auth';
import { getItem, setItem } from './storage';
import { translate, errorMessage, type Lang, type StringKey } from './i18n';
import type { Me } from './types';

type Status = 'loading' | 'signedOut' | 'signedIn';
const ADMIN_KEY = 'ninja.admin';
type Toast = { id: number; text: string; tone: 'ok' | 'error' | 'info' } | null;

interface SessionValue {
  status: Status;
  me: Me | null;
  refreshMe: () => Promise<void>;
  signIn: (username: string, pin: string) => Promise<void>;
  signInWithCustomToken: (token: string) => Promise<void>;
  /** Staff sign-in with the admin panel password (same gate as /ghanimadmin). */
  signInAdmin: (password: string) => Promise<void>;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  lang: Lang;
  rtl: boolean;
  setLang: (l: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  errText: (e: unknown) => string;
  toast: Toast;
  showToast: (text: string, tone?: 'ok' | 'error' | 'info') => void;
}

const Ctx = createContext<SessionValue | null>(null);
const LANG_KEY = 'ninja.lang';
const ME_POLL_FAST = 5_000;   // PS session starting
const ME_POLL_BUSY = 30_000;  // hold / PS session running (countdown is computed locally)
const ME_POLL_IDLE = 60_000;  // nothing live
const ME_MIN_GAP = 5_000;     // min gap for resume refetch

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lang, setLangState] = useState<Lang>('en');
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = useCallback((key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const errText = useCallback((e: unknown) => {
    if (e instanceof ApiError) return errorMessage(lang, e.code, e.message);
    return translate(lang, 'somethingWrong');
  }, [lang]);

  const showToast = useCallback((text: string, tone: 'ok' | 'error' | 'info' = 'ok') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    await setItem(ADMIN_KEY, '');
    clearApiCache();
    setMe(null);
    setIsAdmin(false);
    setStatus('signedOut');
  }, []);

  const authFailsRef = useRef(0);
  const meInflight = useRef<Promise<void> | null>(null);
  const meFails = useRef(0);
  const meLast = useRef(0);
  const rawRef = useRef<() => Promise<void>>(async () => {});
  const refreshMe = useCallback((): Promise<void> => {
    if (meInflight.current) return meInflight.current; // dedupe simultaneous callers
    const p = rawRef.current().finally(() => { meInflight.current = null; meLast.current = Date.now(); });
    meInflight.current = p;
    return p;
  }, []);
  const refreshMeRaw = async () => {
    try {
      const data = await api.get<Me>('/api/app/me');
      meFails.current = 0;
      authFailsRef.current = 0;
      setMe(data);
      setStatus('signedIn');
    } catch (e) {
      // Sign out only on a CONFIRMED auth problem. A flaky backend (e.g. database quota
      // errors) can briefly answer PLAYER_NOT_FOUND/401; flipping signedIn/signedOut on
      // every blip makes the route guard bounce between screens (render loop), so
      // require several consecutive failures first. BANNED is definitive.
      if (e instanceof ApiError && (e.status === 401 || e.code === 'BANNED' || e.code === 'PLAYER_NOT_FOUND')) {
        authFailsRef.current += 1;
        if (e.code === 'BANNED' || authFailsRef.current >= 3) {
          authFailsRef.current = 0;
          await signOut();
          if (e.code === 'BANNED') showToast(errorMessage(lang, 'BANNED', e.message), 'error');
        }
      }
      // Network errors keep the last snapshot.
      meFails.current += 1;
    }
  };
  rawRef.current = refreshMeRaw;

  const signInWithCustomToken = useCallback(async (customToken: string) => {
    await exchangeCustomToken(customToken);
    await refreshMe();
  }, [refreshMe]);

  const signIn = useCallback(async (username: string, pin: string) => {
    const res = await api.post<{ customToken: string }>('/api/auth/login', { username, pin }, { auth: false });
    await signInWithCustomToken(res.customToken);
  }, [signInWithCustomToken]);

  const signInAdmin = useCallback(async (password: string) => {
    const res = await api.post<{ customToken: string }>('/api/admin/mobile-session', { password }, { auth: false });
    await exchangeCustomToken(res.customToken);
    await setItem(ADMIN_KEY, '1');
    clearApiCache();
    setMe(null);
    setIsAdmin(true);
    setStatus('signedIn');
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    void setItem(LANG_KEY, l);
  }, []);

  // Boot: language + saved session.
  useEffect(() => {
    (async () => {
      const savedLang = await getItem(LANG_KEY);
      if (savedLang === 'ar' || savedLang === 'en') setLangState(savedLang);
      const ok = await restoreSession();
      if (!ok) { setStatus('signedOut'); return; }
      if ((await getItem(ADMIN_KEY)) === '1') { setIsAdmin(true); setStatus('signedIn'); return; }
      await refreshMe();
      setStatus((s) => (s === 'loading' ? 'signedOut' : s));
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep balances / hold / PS session fresh: adaptive interval, paused in background,
  // exponential backoff on errors (429/500 never tight-loop).
  const meRef = useRef<Me | null>(null);
  meRef.current = me;
  useEffect(() => {
    if (status !== 'signedIn' || isAdmin) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const next = () => {
      const m = meRef.current;
      const base = m?.psSession?.status === 'starting' ? ME_POLL_FAST : (m?.psSession || m?.hold) ? ME_POLL_BUSY : ME_POLL_IDLE;
      return meFails.current > 0 ? Math.min(base * 2 ** meFails.current, 300_000) : base;
    };
    const loop = () => {
      if (stopped) return;
      timer = setTimeout(async () => {
        if (AppState.currentState === 'active') await refreshMe();
        loop();
      }, next());
    };
    loop();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && Date.now() - meLast.current > ME_MIN_GAP) void refreshMe();
    });
    return () => { stopped = true; if (timer) clearTimeout(timer); sub.remove(); };
  }, [status, isAdmin, refreshMe]);

  const value = useMemo<SessionValue>(() => ({
    status, me, refreshMe, signIn, signInWithCustomToken, signInAdmin, isAdmin, signOut,
    lang, rtl: lang === 'ar', setLang, t, errText, toast, showToast,
  }), [status, me, refreshMe, signIn, signInWithCustomToken, signInAdmin, isAdmin, signOut, lang, setLang, t, errText, toast, showToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
