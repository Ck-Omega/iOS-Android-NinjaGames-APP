// Shapes returned by the server's /api/app/* routes.

export interface Me {
  now: number;
  player: {
    uid: string;
    username: string;
    displayName: string;
    ninjaType: string;
    avatar: string | null;
    level: number;
    xp: number;
    country: string | null;
    pinSetupRequired: boolean;
    vip: { tier: string; expiresAt: number } | null;
  };
  wallets: { pc: number; ps: number };
  pcTime: { storedMinutes: number; liveMinutes: number; freePlayUntil: number | null };
  hold: { id: string; pcId: string; pcName: string; createdAt: number } | null;
  psSession: {
    id: string; stationId: string; stationName: string; status: 'starting' | 'active';
    startedAt: number | null; endsAt: number; minutes: number;
  } | null;
  pricing: {
    convertFeePercent: number; pcToPs: boolean; psToPc: boolean;
    psPricePerHour: number; psPackages: number[]; psEnabled: boolean;
    timePackages?: { id: string; name: string | null; hours: number; coins: number; vipBonusHours: number }[];
  };
}

export type PcState = 'available' | 'in-use' | 'reserved' | 'offline';
export interface PcStation { id: string; name: string; zone: string | null; state: PcState; mine: boolean }
export interface PsStation { id: string; name: string; state: 'available' | 'in-use' | 'offline'; endsAt: number | null; mine: boolean }
export interface Stations { now: number; pcs: PcStation[]; ps: PsStation[] }

export interface FoodItem {
  id: string; name: string; nameAr: string | null; description: string; category: string;
  price: number; priceJOD: number; prepMinutes: number; image: string | null; outOfStock: boolean;
}
export interface HookahFlavor { id: string; name: string; icon: string; color: string; price: number; popular: boolean }
export interface TobaccoItem { id: string; name: string; color: string; price: number; badge: string | null }
export interface Menu { food: FoodItem[]; hookah: { flavors: HookahFlavor[]; tobacco: TobaccoItem[] } }

export interface OrderRow {
  id: string; kind: 'food' | 'hookah' | 'tobacco'; status: string; createdAt: number;
  prepMinutes: number; totalCoins: number; deliverTo: string | null; title: string;
}

export interface Tournament {
  id: string; name: string; status: string; format: string | null; gameName: string;
  banner: string | null; cover: string | null; entryFee: number; myEntryCost: number;
  prizePool: unknown; startTime: number | null; maxPlayers: number | null; playerCount: number;
  joined: boolean; rules: string | null; winner: string | null;
}

export interface PublicPlayer {
  uid: string; username: string; displayName: string; ninjaType: string; avatar: string | null;
  level: number; online: boolean; activity: string | null;
}
export interface LeaderRow extends PublicPlayer { rank: number; value: number; me: boolean }

export interface FriendsData {
  friends: PublicPlayer[];
  incoming: { requestId: string; createdAt: number; player: PublicPlayer }[];
  outgoing: { requestId: string; createdAt: number; player: PublicPlayer }[];
  results?: PublicPlayer[];
}

export interface ChatMessage { id: string; from: string; mine: boolean; text: string; type: string; createdAt: number }
