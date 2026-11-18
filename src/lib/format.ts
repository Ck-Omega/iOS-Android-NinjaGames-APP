import type { Lang } from './i18n';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function num(n: number, lang: Lang = 'en'): string {
  const s = Math.round(n).toLocaleString('en-US');
  return lang === 'ar' ? s.replace(/\d/g, (d) => AR_DIGITS[Number(d)]) : s;
}

/** 192 → "3h 12m" (ar: "٣س ١٢د"). */
export function minutes(total: number, lang: Lang = 'en'): string {
  const m = Math.max(0, Math.floor(total));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (lang === 'ar') return h ? `${num(h, lang)}س ${num(r, lang)}د` : `${num(r, lang)}د`;
  return h ? `${h}h ${r}m` : `${r}m`;
}

/** ms → "47:12" or "1:02:05". */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x: number) => String(x).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function clock(ts: number, lang: Lang = 'en'): string {
  return new Date(ts).toLocaleTimeString(lang === 'ar' ? 'ar' : 'en-US', { hour: 'numeric', minute: '2-digit' });
}

export function dayTime(ts: number, lang: Lang = 'en'): string {
  return new Date(ts).toLocaleString(lang === 'ar' ? 'ar' : 'en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export function initials(name: string): string {
  return (name || '?').replace(/[^A-Za-z0-9؀-ۿ]/g, '').slice(0, 2).toUpperCase() || '?';
}
