/** Characters excluding ambiguous 0/O, 1/I/L for staff join codes. */
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateSchoolStaffJoinCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

export function normalizeSchoolStaffJoinCode(input: string): string | null {
  const normalized = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return normalized.length === 8 ? normalized : null;
}
