// Player password policy — mirrors server/src/lib/pin-policy.ts (checkStrongPin).
// The request field is still called `pin`. Update both together.
export const PIN_HINT = '8–64 characters · at least one capital letter (A-Z) · at least one special character (!@#$%…)';

export function pinProblem(pw: string): string | null {
  if (pw.length < 8 || pw.length > 64) return 'Password: at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password: at least one capital letter (A-Z).';
  if (!/[^A-Za-z0-9\s]/.test(pw)) return 'Password: at least one special character (!@#$%…).';
  if (!/^[\x20-\x7E]+$/.test(pw)) return 'Password: English letters, numbers and symbols only.';
  return null;
}
