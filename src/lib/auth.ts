// Token handling for the app.
//
// The Ninja server authenticates players with a username + PIN and returns a
// Firebase *custom token*. The app exchanges it once for a Firebase ID token +
// refresh token via Google's Identity Toolkit REST API (no Firebase SDK needed),
// keeps the refresh token in secure storage, and silently refreshes the 1-hour
// ID token before each API call.
import { FIREBASE_API_KEY } from './config';
import { deleteItem, getItem, setItem } from './storage';
import { DEMO } from './demo';

const REFRESH_KEY = 'ninja.refreshToken';
const UID_KEY = 'ninja.uid';

let idToken: string | null = null;
let idTokenExpiresAt = 0;
let refreshToken: string | null = null;
let uid: string | null = null;
let refreshing: Promise<string | null> | null = null;

export class AuthError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

function requireKey() {
  if (!FIREBASE_API_KEY) throw new AuthError('CONFIG', 'App is missing EXPO_PUBLIC_FIREBASE_API_KEY.');
}

/** Exchange the server's custom token for an ID + refresh token and persist the session. */
export async function exchangeCustomToken(customToken: string): Promise<string> {
  if (DEMO) { idToken = 'demo'; idTokenExpiresAt = Date.now() + 3.6e6; uid = 'demo'; await setItem(REFRESH_KEY, 'demo'); return 'demo'; }
  requireKey();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.idToken) throw new AuthError('SIGN_IN_FAILED', 'Could not start your session. Try again.');
  idToken = data.idToken;
  idTokenExpiresAt = Date.now() + (Number(data.expiresIn) || 3600) * 1000;
  refreshToken = data.refreshToken;
  uid = decodeUid(data.idToken);
  await setItem(REFRESH_KEY, data.refreshToken);
  if (uid) await setItem(UID_KEY, uid);
  return uid ?? '';
}

async function doRefresh(): Promise<string | null> {
  if (!refreshToken) refreshToken = await getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  requireKey();
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) {
    // Refresh token revoked/expired → the player must sign in again.
    if (res.status === 400 || res.status === 401 || res.status === 403) await clearSession();
    return null;
  }
  idToken = data.id_token;
  idTokenExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
  refreshToken = data.refresh_token ?? refreshToken;
  if (data.refresh_token) await setItem(REFRESH_KEY, data.refresh_token);
  uid = data.user_id ?? decodeUid(data.id_token);
  return idToken;
}

/** A valid ID token (refreshed when < 2 min left), or null when signed out. */
export async function getIdToken(force = false): Promise<string | null> {
  if (DEMO) return idToken;
  if (!force && idToken && Date.now() < idTokenExpiresAt - 120_000) return idToken;
  if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

/** Restore a saved session at app start. */
export async function restoreSession(): Promise<boolean> {
  if (DEMO) {
    if ((await getItem(REFRESH_KEY)) !== 'demo') return false;
    idToken = 'demo'; uid = 'demo';
    return true;
  }
  const saved = await getItem(REFRESH_KEY);
  if (!saved) return false;
  refreshToken = saved;
  uid = await getItem(UID_KEY);
  try {
    return Boolean(await getIdToken(true));
  } catch {
    return false;
  }
}

export async function clearSession(): Promise<void> {
  idToken = null; idTokenExpiresAt = 0; refreshToken = null; uid = null;
  await deleteItem(REFRESH_KEY);
  await deleteItem(UID_KEY);
}

export function currentUid(): string | null { return uid; }

function decodeUid(jwt: string): string | null {
  try {
    let payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const json = JSON.parse(globalThis.atob(payload));
    return json.user_id ?? json.sub ?? null;
  } catch {
    return null;
  }
}
