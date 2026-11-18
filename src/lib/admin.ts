// Admin-mode API helpers. Cloud calls reuse the server's admin routes (admin token
// from /api/admin/mobile-session); TV/PS5 calls go straight to TVSession.exe on the
// shop LAN (same endpoints the WPF admin's PS5 page uses), so they only work on shop Wi-Fi.
import { api, idemKey } from './api';
import { getItem, setItem } from './storage';

export type AdminPc = {
  id: string; name: string; online: boolean; inUse: boolean; guest: boolean;
  playerId: string | null; playerName: string | null; locked: boolean; timeRemaining: number; lastSeen: number;
};
export type TopupReq = { id: string; playerId: string; playerName: string; coins: number; price: number; packageId: string; createdAt: number };
export type GuestReq = { id: string; pcName: string; pcId: string; createdAt: number };
export type RegReq = { id: string; username: string; firstName: string; lastName: string; phone: string; pcName: string; createdAt: number };
export type Overview = { now: number; pcs: AdminPc[]; topups: TopupReq[]; guests: GuestReq[]; registrations: RegReq[] };
export type AdminPlayer = {
  id: string; username: string; displayName: string; firstName: string; lastName: string; phone: string;
  coins: number; psCoins: number; remainingPlaytime: number; vip: boolean; banned: boolean; lastLogin: number; createdAt: number;
};

export const adminApi = {
  overview: (fresh = false) => api.get<Overview>(`/api/admin/mobile/overview${fresh ? '?fresh=1' : ''}`),
  searchPlayers: (q: string) => api.get<{ players: AdminPlayer[] }>(`/api/admin/mobile/players?q=${encodeURIComponent(q)}`),
  player: (id: string) => api.get<{ player: AdminPlayer }>(`/api/admin/mobile/players?id=${encodeURIComponent(id)}`),
  /** lock | unlock | force-logout (end session) | restart-app … (server allowlist). */
  pcCommand: (pcId: string, command: string) => api.post('/api/pc/command', { pcId, command, reason: 'mobile admin' }),
  playerAction: (playerId: string, action: 'add-coins' | 'add-time' | 'deduct-coins' | 'deduct-time', amount: number) =>
    api.post('/api/admin/player-actions', { playerId, action, amount, reason: 'mobile admin', idempotencyKey: idemKey('adm') }),
  resolveTopup: (requestId: string, decision: 'approve' | 'reject') => api.post('/api/topup/resolve', { requestId, decision }),
  resolveGuest: (requestId: string, decision: 'approve' | 'reject', minutes = 30) =>
    api.post('/api/guest/resolve', { requestId, decision, minutes }),
  resolveRegistration: (requestId: string, decision: 'approve' | 'reject') =>
    api.post<{ code?: string }>('/api/admin/mobile/guest-register', { requestId, decision }),
  async registerPlayer(p: { username: string; pin: string; phone: string; firstName: string; lastName: string }) {
    const { code } = await api.post<{ code: string }>('/api/admin/registration-code', {});
    await api.post('/api/auth/register', { ...p, displayName: p.username, approvalCode: code }, { auth: false });
  },
};

// ─── TVSession (LAN) ──────────────────────────────────────────────────────
export type CtlTv = {
  id: string; label: string; kind?: string; paired?: boolean; status?: string;
  session?: { user: string; ends_at: number; remaining: number } | null;
  ps5?: { state?: string };
};

const CTL_KEY = 'ninja.admin.tvctl';
let remoteKey = '';
let reportedLan = '';
/** Fetch the LAN key (+ the controller's reported address) from the cloud once per session. */
export async function loadLanInfo(): Promise<void> {
  if (remoteKey) return;
  const r = await api.get<{ key: string; lan: string | null }>('/api/admin/mobile/lan-key');
  remoteKey = r.key; reportedLan = r.lan ?? '';
}
export const remoteHeaders = (): Record<string, string> => (remoteKey ? { 'X-Remote-Key': remoteKey } : {});
export const ctlBase = (base: string) => (/^https?:\/\//.test(base) ? base : `http://${base}`);
/** Saved override, else the address TVSession reported through the cloud bridge. */
export async function getControllerUrl(): Promise<string> {
  try { await loadLanInfo(); } catch { /* offline: use the saved address */ }
  return (await getItem(CTL_KEY)) || reportedLan;
}
export async function setControllerUrl(url: string): Promise<void> { await setItem(CTL_KEY, url.trim().replace(/\/+$/, '')); }

export async function ctl<T = { message?: string }>(base: string, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  if (!base) throw new Error('Set the TVSession address first (admin PC IP, port 8765).');
  const url = ctlBase(base);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${url}${path}`, {
      method, signal: controller.signal,
      headers: { ...remoteHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) throw new Error(data?.error || data?.message || `TVSession HTTP ${res.status}`);
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name !== 'AbortError' && !/Network request failed|Failed to fetch/.test(e.message)) throw e;
    throw new Error('Cannot reach TVSession. Are you on the shop Wi-Fi?');
  } finally {
    clearTimeout(timer);
  }
}
