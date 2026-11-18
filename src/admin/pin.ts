// Player credential policy for admin-side registration — mirrors server/src/lib/pin-policy.ts
// (checkStrongPin). Update both together when the kiosk policy changes.
export const PIN_HINT = '6 digits · not all the same · no sequence (123456) · no simple repeats (121212, 123123, 112233)';

export function pinProblem(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return 'PIN must be exactly 6 digits.';
  if (/^(\d)\1{5}$/.test(pin)) return 'PIN can’t be all the same digit.';
  const d = pin.split('').map(Number);
  const asc = d.every((v, i) => i === 0 || v === (d[i - 1] + 1) % 10);
  const desc = d.every((v, i) => i === 0 || v === (d[i - 1] + 9) % 10);
  if (asc || desc) return 'PIN can’t be a straight sequence.';
  if (/^(\d\d)\1\1$/.test(pin) || /^(\d{3})\1$/.test(pin) || /^(\d)\1(\d)\2(\d)\3$/.test(pin)) return 'PIN can’t be a simple repeat.';
  return null;
}
