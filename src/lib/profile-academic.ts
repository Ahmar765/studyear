/** Align en/em dashes with hyphen so saved strings match catalog labels (Radix was sensitive to this). */
function normalizeTypographicDashes(s: string): string {
  return s.replace(/\u2013/g, '-').replace(/\u2014/g, '-');
}

/**
 * Map saved Firestore strings onto current dropdown catalog entries (labels change over time).
 */
export function resolveToCatalogValue(stored: string | undefined, catalog: string[]): string {
  if (!stored) return '';
  const t = stored.trim();
  if (!t) return '';
  if (catalog.includes(t)) return t;

  const tn = normalizeTypographicDashes(t);
  const dashInsensitive = catalog.find((c) => normalizeTypographicDashes(c) === tn);
  if (dashInsensitive) return dashInsensitive;

  const lower = t.toLowerCase();
  const caseInsensitive = catalog.find((c) => c.toLowerCase() === lower);
  if (caseInsensitive) return caseInsensitive;

  const aliases: Record<string, string> = {
    university: 'University / Degree',
    'a-level': 'A2/A-level',
    'a level': 'A2/A-level',
    'alevel': 'A2/A-level',
    ks3: 'Key Stage 3: Ages 11–14 (Years 7–9)',
    ks4: 'Key Stage 4: Ages 14–16 (Years 10–11)',
    'key stage 3': 'Key Stage 3: Ages 11–14 (Years 7–9)',
    'key stage 4': 'Key Stage 4: Ages 14–16 (Years 10–11)',
    ib: 'International Baccalaureate',
  };

  const mapped = aliases[lower];
  if (mapped && catalog.includes(mapped)) return mapped;

  return t;
}

/**
 * Normalised subject names from `student_profiles.subjects` (or legacy shapes).
 * Handles `string[]`, `{ name }[]`, `{ subject }[]`, etc. — mismatches caused "0 subjects"
 * in the diagnostic when `.name` was missing on stored rows.
 */
export function parseProfileSubjectsList(subjects: unknown): string[] {
  if (subjects == null) return [];
  if (!Array.isArray(subjects)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of subjects) {
    let raw: string | undefined;
    if (typeof item === 'string') {
      raw = item;
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const n = o.name ?? o.subject ?? o.title ?? o.label;
      raw = typeof n === 'string' ? n : undefined;
    }
    const t = raw?.trim();
    if (!t) continue;
    const norm = normalizeSubjectTitle(t);
    const key = norm.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return out;
}

/** Normalise subject titles so they match the master list (old data, typing variants). */
export function normalizeSubjectTitle(name: string): string {
  const map: Record<string, string> = {
    'Art & Design': 'Art and Design',
    'Art and design': 'Art and Design',
  };
  return map[name] ?? name;
}
