import type { SensitiveWordConfig, SensitiveWordReplacementRule } from "@buildingai/types";

export interface SensitiveWordSaveQueue {
  enqueue<T>(key: string, task: () => Promise<T>): Promise<T>;
}

export function reconcileSensitiveWordSave(params: {
  current: SensitiveWordConfig | null;
  saved: SensitiveWordConfig;
  savedRules: SensitiveWordReplacementRule[];
  isCurrentEdit: boolean;
  keepInvalidDraft: boolean;
}): SensitiveWordConfig {
  const { current, saved, savedRules, isCurrentEdit, keepInvalidDraft } = params;
  if (!current || (isCurrentEdit && !keepInvalidDraft)) {
    return { ...saved, rules: savedRules };
  }
  if (!isCurrentEdit) {
    return { ...current, revision: saved.revision };
  }
  return {
    ...current,
    enabled: saved.enabled,
    applyToReasoning: saved.applyToReasoning,
    revision: saved.revision,
  };
}

/**
 * Serializes sensitive-word saves and deduplicates retries for the same draft.
 * A failed save never prevents a later draft from running.
 */
export function createSensitiveWordSaveQueue(): SensitiveWordSaveQueue {
  let tail: Promise<void> = Promise.resolve();
  const pending = new Map<string, Promise<unknown>>();

  return {
    enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
      const existing = pending.get(key) as Promise<T> | undefined;
      if (existing) return existing;

      const result = tail.then(task);
      pending.set(key, result);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      const clear = () => {
        if (pending.get(key) === result) pending.delete(key);
      };
      void result.then(clear, clear);
      return result;
    },
  };
}
