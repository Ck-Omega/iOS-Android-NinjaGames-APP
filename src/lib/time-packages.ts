// Mirrors server/src/lib/constants.ts TIME_PACKAGES + VIP_TIME_BONUS_HOURS.
// Display only: the server is authoritative for price and minutes granted.
export interface TimePackage { id: string; hours: number; coins: number; vipBonusHours: number; best?: boolean }

export const TIME_PACKAGES: TimePackage[] = [
  { id: 'time_bronze', hours: 1, coins: 100, vipBonusHours: 0 },
  { id: 'time_silver', hours: 3, coins: 250, vipBonusHours: 0 },
  { id: 'time_gold', hours: 7, coins: 500, vipBonusHours: 1, best: true },
  { id: 'time_platinum', hours: 12, coins: 780, vipBonusHours: 2 },
  { id: 'time_diamond', hours: 20, coins: 1160, vipBonusHours: 3 },
];
