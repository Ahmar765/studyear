/** Make Firestore / nested values safe for Server Actions and client props. */
export function toPlainJson<T>(value: T): T {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v) => {
        if (v && typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
          try {
            return (v as { toDate: () => Date }).toDate().toISOString();
          } catch {
            return null;
          }
        }
        return v;
      }),
    ) as T;
  } catch {
    return value;
  }
}
