/** Deterministic 8-digit Parent Link Code from a student Firebase UID. */
export function deriveParentLinkCode(studentId: string): string {
  let h = 99;
  for (let i = 0; i < studentId.length; i++) {
    h = (h * 31 + studentId.charCodeAt(i)) | 0;
  }
  return String(Math.abs(h) % 100000000).padStart(8, '0');
}

export function normalizeParentLinkCode(input: string): string | null {
  const normalized = input.replace(/\D/g, '').padStart(8, '0').slice(-8);
  return normalized.length === 8 ? normalized : null;
}

export function isStudentRole(role: string | undefined | null): boolean {
  return String(role ?? '').toUpperCase().trim() === 'STUDENT';
}
