export function opencodeDurableUiPolicy(enabled: boolean) {
  return {
    canEditPersistedMessage: !enabled,
    canRegenerate: !enabled,
    canSwitchBranch: !enabled,
    sendParentId: enabled ? undefined : null,
  } as const;
}
