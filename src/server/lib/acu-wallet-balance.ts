/** Normalize ACU balance from Firestore wallet docs (legacy `balanceACU` vs current `balance`). */
export function readAcuBalance(data: Record<string, unknown> | undefined | null): number {
  if (!data) return 0;
  if (typeof data.balance === 'number' && Number.isFinite(data.balance)) {
    return Math.max(0, data.balance);
  }
  if (typeof data.balanceACU === 'number' && Number.isFinite(data.balanceACU)) {
    return Math.max(0, data.balanceACU);
  }
  return 0;
}
