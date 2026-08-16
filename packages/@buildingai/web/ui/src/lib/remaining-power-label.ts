/**
 * Format remaining user power for agent chat sidebar.
 * Returns null when power should not be shown.
 */
export function formatRemainingPowerLabel(power: number | null | undefined): string | null {
  if (power == null || Number.isNaN(Number(power))) return null;
  const value = Math.max(0, Math.floor(Number(power)));
  return `剩余 ${value.toLocaleString("zh-CN")}`;
}

/**
 * Whether usage payload indicates billed consumption that should refresh user info.
 */
export function shouldRefreshUserPowerAfterUsage(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const consumed = (data as { userConsumedPower?: unknown }).userConsumedPower;
  return typeof consumed === "number" && Number.isFinite(consumed) && consumed > 0;
}
