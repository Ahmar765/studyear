import { levels, subjects } from '@/data/academic';

const subjectCodeToName = new Map(
  subjects.map((name) => [name.replace(/ /g, '_').toUpperCase(), name]),
);

const JUNK_FILTER_VALUES = new Set(
  ['community', 'general', 'all levels', ''].map((s) => s.toLowerCase()),
);

/** Turn stored subject codes (e.g. MATHEMATICS) into readable labels. */
export function formatResourceSubject(raw: string | undefined | null): string {
  const t = (raw ?? '').trim();
  if (!t) return 'General';
  const fromCode = subjectCodeToName.get(t.toUpperCase());
  if (fromCode) return fromCode;
  if (/^[A-Z0-9_]+$/.test(t) && t.includes('_')) {
    return t
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }
  return t;
}

export function isJunkFilterValue(value: string): boolean {
  return JUNK_FILTER_VALUES.has(value.trim().toLowerCase());
}

/** Canonical level labels for resource filters (profile-aligned). */
export function getCanonicalResourceLevels(): string[] {
  return levels;
}

/** Canonical subject names for resource filters. */
export function getCanonicalResourceSubjects(): string[] {
  return subjects;
}
