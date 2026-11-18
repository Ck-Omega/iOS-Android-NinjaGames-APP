// DEV-ONLY demo backend. Active only when EXPO_PUBLIC_DEMO=1 at build time, so
// the UI can be previewed (e.g. in a browser) without a server or account.
// Never enable this for a store build.
import { ApiError } from './api';
import type { ChatMessage, FriendsData, Me, Menu, OrderRow, Stations, Tournament } from './types';

export const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

const now = () => Date.now();
const state = {
  pc: 1280,
  ps: 640,
  minutes: 192,
  hold: null as Me['hold'],
  ps_session: null as Me['psSession'],
  orders: [] as OrderRow[],
  chat: {} as Record<string, ChatMessage[]>,
};

function me(): Me {
  const used = state.hold ? Math.ceil((now() - state.hold.createdAt) / 60_000) : 0;
  return {
    now: now(),
    player: { uid: 'demo', username: 'ninja_omar', displayName: 'ninja_omar', ninjaType: 'neon', avatar: null, level: 21, xp: 4200, country: 'jo', pinSetupRequired: false, vip: { tier: 'gold', expiresAt: now() + 9e8 } },
    wallets: { pc: state.pc, ps: state.ps },
    pcTime: { storedMinutes: state.minutes, liveMinutes: Math.max(0, state.minutes - used), freePlayUntil: null },
    hold: state.hold,
    psSession: state.ps_session,
    pricing: { convertFeePercent: 5, pcToPs: true, psToPc: true, psPricePerHour: 100, psPackages: [30, 60, 120, 180], psEnabled: true, timePackages: [{ id: 'time_bronze', name: 'Bronze', hours: 1, coins: 100, vipBonusHours: 0 }, { id: 'time_silver', name: 'Silver', hours: 3, coins: 250, vipBonusHours: 0 }, { id: 'time_gold', name: 'Gold', hours: 7, coins: 500, vipBonusHours: 1 }, { id: 'time_platinum', name: 'Platinum', hours: 12, coins: 780, vipBonusHours: 2 }, { id: 'time_diamond', name: 'Diamond', hours: 20, coins: 1160, vipBonusHours: 3 }] },
  };
}

const pcNames = ['PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07', 'PC-08'];
const pcStates: Stations['pcs'][number]['state'][] = ['available', 'in-use', 'in-use', 'available', 'reserved', 'available', 'available', 'offline'];

function stations(): Stations {
  return {
    now: now(),
    pcs: [
      ...pcNames.map((name, i) => ({ id: name, name, zone: 'Main hall', state: state.hold?.pcId === name ? 'reserved' as const : pcStates[i], mine: state.hold?.pcId === name })),
      ...['VIP-1', 'VIP-2', 'VIP-3', 'VIP-4'].map((name, i) => ({ id: name, name, zone: 'VIP room', state: i === 1 ? 'in-use' as const : 'available' as const, mine: false })),
    ],
    ps: [
      { id: 'ps1', name: 'PS5 · Station 1', state: 'available', endsAt: null, mine: false },
      { id: 'ps2', name: 'PS5 · Station 2', state: state.ps_session ? 'in-use' : 'available', endsAt: state.ps_session?.endsAt ?? null, mine: !!state.ps_session },
      { id: 'ps3', name: 'PS5 · Station 3', state: 'in-use', endsAt: now() + 22 * 60_000, mine: false },
      { id: 'ps4', name: 'PS5 · Station 4', state: 'offline', endsAt: null, mine: false },
    ],
  };
}

const menu: Menu = {
  food: [
    { id: 'karak_tea', name: 'Karak Tea', nameAr: 'شاي كرك', description: '', category: 'drinks', price: 65, priceJOD: 0.65, prepMinutes: 3, image: '/img/menu/karak-tea.jpg', outOfStock: false },
    { id: 'iced_coffee', name: 'Iced Coffee', nameAr: 'قهوة مثلجة', description: '', category: 'drinks', price: 75, priceJOD: 0.75, prepMinutes: 3, image: '/img/menu/iced-coffee.jpg', outOfStock: false },
    { id: 'energy_drink', name: 'Energy Drink', nameAr: 'مشروب طاقة', description: '', category: 'drinks', price: 85, priceJOD: 0.85, prepMinutes: 1, image: '/img/menu/energy-drink.jpg', outOfStock: false },
    { id: 'lemon_mint', name: 'Lemon & Mint', nameAr: 'ليمون ونعنع', description: '', category: 'drinks', price: 100, priceJOD: 1, prepMinutes: 3, image: '/img/menu/lemon-mint.jpg', outOfStock: false },
    { id: 'fries_large', name: 'Fries Large', nameAr: 'بطاطا كبير', description: '', category: 'snacks', price: 100, priceJOD: 1, prepMinutes: 5, image: '/img/menu/fries.jpg', outOfStock: false },
    { id: 'molto', name: 'Molto', nameAr: 'مولتو', description: '', category: 'snacks', price: 60, priceJOD: 0.6, prepMinutes: 1, image: '/img/menu/molto.jpg', outOfStock: true },
    { id: 'beef_burger', name: 'Beef Burger', nameAr: 'برجر لحم', description: '', category: 'food', price: 120, priceJOD: 1.2, prepMinutes: 7, image: '/img/menu/burger.jpg', outOfStock: false },
    { id: 'hotdog', name: 'Hot Dog', nameAr: 'هوت دوغ', description: '', category: 'food', price: 120, priceJOD: 1.2, prepMinutes: 4, image: '/img/menu/hotdog.jpg', outOfStock: false },
  ],
  hookah: {
    flavors: [
      { id: 'grape', name: 'Grape', icon: '🍇', color: '#8B5CF6', price: 263, popular: true },
      { id: 'mint', name: 'Mint', icon: '🌿', color: '#10B981', price: 263, popular: false },
      { id: 'double-apple', name: 'Double Apple', icon: '🍎', color: '#EF4444', price: 263, popular: true },
      { id: 'watermelon', name: 'Watermelon', icon: '🍉', color: '#F472B6', price: 263, popular: false },
      { id: 'blueberry', name: 'Blueberry', icon: '🫐', color: '#6366F1', price: 263, popular: false },
      { id: 'mixed-fruits', name: 'Mixed Fruits', icon: '🍹', color: '#EC4899', price: 315, popular: true },
    ],
    tobacco: [
      { id: 'marlboro-red', name: 'Marlboro Red', color: '#DC2626', price: 210, badge: 'CLASSIC' },
      { id: 'marlboro-gold', name: 'Marlboro Gold', color: '#D4A017', price: 210, badge: 'SMOOTH' },
      { id: 'winston', name: 'Winston', color: '#3B82F6', price: 189, badge: null },
    ],
  },
};

const tournaments: Tournament[] = [
  { id: 't1', name: 'Ninja Open', status: 'registration', format: '5v5', gameName: 'Valorant', banner: '/games/valorant-banner.jpg', cover: null, entryFee: 150, myEntryCost: 150, prizePool: '50 JOD', startTime: now() + 3 * 86400_000, maxPlayers: 16, playerCount: 12, joined: false, rules: 'Best of 3 · double elimination', winner: null },
  { id: 't2', name: 'CS2 Night', status: 'active', format: '1v1', gameName: 'Counter-Strike 2', banner: '/games/cs2-banner.jpg', cover: null, entryFee: 100, myEntryCost: 100, prizePool: '30 JOD', startTime: now() - 3600_000, maxPlayers: 8, playerCount: 8, joined: true, rules: null, winner: null },
  { id: 't3', name: 'Fortnite Cup', status: 'completed', format: 'Solo', gameName: 'Fortnite', banner: '/games/fortnite-banner.jpg', cover: null, entryFee: 50, myEntryCost: 50, prizePool: null, startTime: now() - 7 * 86400_000, maxPlayers: 20, playerCount: 20, joined: false, rules: null, winner: 'mk2008' },
];

const friend = (uid: string, username: string, online: boolean, activity: string | null, level: number) =>
  ({ uid, username, displayName: username, ninjaType: 'neon', avatar: null, level, online, activity });

const friends: FriendsData = {
  friends: [
    friend('f1', 'abood2004', true, 'Playing Valorant · PC-04', 31),
    friend('f2', 'mazen1212', true, 'PS5 · Station 3', 18),
    friend('f3', 'kareem28', true, null, 12),
    friend('f4', 'hamza79', false, null, 27),
    friend('f5', 'wesam2003', false, null, 9),
  ],
  incoming: [{ requestId: 'r1', createdAt: now(), player: friend('f9', 'tareq', false, null, 5) }],
  outgoing: [],
};

function leaderboard(by: string) {
  const rows = ['mk2008', 'aziz44', 'abood2004', 'mazen1212', 'kareem28', 'hamza79'].map((u, i) => ({
    ...friend(`l${i}`, u, i % 2 === 0, null, 42 - i * 3), rank: i + 1, value: by === 'level' ? 42 - i * 3 : 24720 - i * 1900, me: false,
  }));
  const mine = { ...friend('demo', 'ninja_omar', true, null, 21), rank: 14, value: by === 'level' ? 21 : 5760, me: true };
  return { by, rows, mine };
}

export async function demoRequest<T>(method: string, path: string, body: any): Promise<T> {
  await new Promise((r) => setTimeout(r, 250));
  const [route, query = ''] = path.split('?');
  const q = new URLSearchParams(query);
  const ok = (x: Record<string, unknown> = {}) => ({ ok: true, ...x }) as T;

  if (route === '/api/auth/login' || route === '/api/auth/register') return ok({ customToken: 'demo' });
  if (route === '/api/auth/easycafe-migrate') return ok({});
  if (route === '/api/app/me') return ok(me() as unknown as Record<string, unknown>);
  if (route === '/api/app/stations') return ok(stations() as unknown as Record<string, unknown>);
  if (route === '/api/app/menu') return ok(menu as unknown as Record<string, unknown>);
  if (route === '/api/app/orders') return ok({ orders: state.orders });
  if (route === '/api/app/tournaments') return ok({ tournaments });
  if (route === '/api/app/leaderboard') return ok(leaderboard(q.get('by') ?? 'playtime'));
  if (route === '/api/app/friends') return method === 'GET' ? ok(friends as unknown as Record<string, unknown>) : ok({ status: body?.action === 'accept' ? 'accepted' : 'sent' });
  if (route === '/api/app/chat') {
    const withUid = q.get('with') ?? body?.to;
    if (method === 'POST') {
      const m = { id: String(now()), from: 'demo', mine: true, text: body.text, type: 'text', createdAt: now() };
      state.chat[withUid] = [...(state.chat[withUid] ?? []), m];
      return ok({ message: m });
    }
    if (!state.chat[withUid]) state.chat[withUid] = [{ id: 'm1', from: withUid, mine: false, text: 'bro come PC-05 is free next to me', type: 'text', createdAt: now() - 300_000 }];
    return ok({ messages: state.chat[withUid] });
  }
  if (route === '/api/app/pc/hold') {
    if (method === 'DELETE') {
      const used = state.hold ? Math.ceil((now() - state.hold.createdAt) / 60_000) : 0;
      state.minutes -= used; state.hold = null;
      return ok({ chargedMinutes: used });
    }
    state.hold = { id: 'h1', pcId: body.pcId, pcName: body.pcId, createdAt: now() };
    return ok({});
  }
  if (route === '/api/app/wallet/convert') {
    const fee = Math.ceil(body.amount * 0.05);
    if (body.from === 'pc') { state.pc -= body.amount; state.ps += body.amount - fee; } else { state.ps -= body.amount; state.pc += body.amount - fee; }
    return ok({ received: body.amount - fee });
  }
  if (route === '/api/time/buy') {
    const pk: Record<string, [number, number]> = { time_bronze: [100, 1], time_silver: [250, 3], time_gold: [500, 7], time_platinum: [780, 12], time_diamond: [1160, 20] };
    const p = pk[body?.packageId];
    if (!p) throw new ApiError('PACKAGE_NOT_FOUND', 'unknown time package', 404);
    if (state.pc < p[0]) throw new ApiError('INSUFFICIENT_FUNDS', 'not enough coins', 409);
    state.pc -= p[0]; state.minutes += p[1] * 60;
    return ok({ packageId: body.packageId, coinsSpent: p[0], minutesAdded: p[1] * 60, remainingCoins: state.pc });
  }
  if (route === '/api/app/ps/start') {
    const cost = Math.ceil((100 * body.minutes) / 60);
    state.ps -= cost;
    state.ps_session = { id: 's1', stationId: body.stationId, stationName: 'PS5 · Station 2', status: 'active', startedAt: now(), endsAt: now() + body.minutes * 60_000, minutes: body.minutes };
    return ok({});
  }
  if (route === '/api/order/create' || route === '/api/app/hookah/order') {
    const title = route === '/api/order/create' ? body.items.map((i: any) => `${i.quantity}× ${menu.food.find((f) => f.id === i.menuItemId)?.name}`).join(', ') : body.type === 'hookah' ? `Hookah · ${body.flavorId}` : body.cigaretteId;
    state.orders = [{ id: String(now()), kind: route === '/api/order/create' ? 'food' : body.type, status: 'pending', createdAt: now(), prepMinutes: 8, totalCoins: 0, deliverTo: state.hold?.pcName ?? null, title }, ...state.orders];
    return ok({});
  }
  if (route === '/api/tournament/join') return ok({});
  return ok({});
}
