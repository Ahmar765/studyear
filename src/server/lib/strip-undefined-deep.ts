/** Plain objects only (not Date, Timestamp, FieldValue, class instances). */
function isPlainRecord(val: unknown): val is Record<string, unknown> {
  if (val === null || typeof val !== "object") return false;
  if (Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * Firestore rejects `undefined` anywhere in document data. Removes undefined keys
 * recursively on plain objects; leaves arrays, dates, and other objects as-is
 * (except array elements are processed).
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined || value === null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    out[k] = stripUndefinedDeep(v);
  }
  return out as T;
}
