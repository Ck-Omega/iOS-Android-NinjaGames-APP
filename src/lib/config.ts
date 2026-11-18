import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };

/** Ninja Games server (Next.js on Vercel). Override with EXPO_PUBLIC_API_URL for a LAN/dev server. */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || extra.apiBaseUrl || 'https://www.ninjagamesjo.com').replace(/\/+$/, '');

/**
 * Public Firebase Web API key (same value as the server's NEXT_PUBLIC_FIREBASE_API_KEY).
 * It is not a secret; it only lets the app exchange the server's custom token for an ID token.
 */
export const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '';

/** Where "Delete account" requests go. Set EXPO_PUBLIC_SUPPORT_EMAIL before store release. */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '';

/** Turn a server-relative image path ("/img/menu/tea.jpg") into a full URL. */
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|data:)/.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
