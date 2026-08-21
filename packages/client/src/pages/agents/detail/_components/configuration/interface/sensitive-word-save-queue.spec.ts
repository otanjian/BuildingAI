import { describe, expect, it, vi } from "vitest";

import {
  createSensitiveWordSaveQueue,
  reconcileSensitiveWordSave,
} from "./sensitive-word-save-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("sensitive word save queue", () => {
  it("deduplicates timer and navigation flushes for the same agent draft", async () => {
    const queue = createSensitiveWordSaveQueue();
    const gate = deferred<boolean>();
    const save = vi.fn(() => gate.promise);

    const timerFlush = queue.enqueue("agent-a:7", save);
    const navigationFlush = queue.enqueue("agent-a:7", save);

    expect(navigationFlush).toBe(timerFlush);
    await Promise.resolve();
    expect(save).toHaveBeenCalledTimes(1);
    gate.resolve(true);
    await expect(timerFlush).resolves.toBe(true);
  });

  it("runs newer drafts and other agents only after the prior save settles", async () => {
    const queue = createSensitiveWordSaveQueue();
    const first = deferred<string>();
    const calls: string[] = [];

    const firstSave = queue.enqueue("agent-a:1", async () => {
      calls.push("agent-a:1:start");
      const value = await first.promise;
      calls.push("agent-a:1:end");
      return value;
    });
    const secondSave = queue.enqueue("agent-a:2", async () => {
      calls.push("agent-a:2");
      return "second";
    });
    const otherAgentSave = queue.enqueue("agent-b:1", async () => {
      calls.push("agent-b:1");
      return "other";
    });

    await Promise.resolve();
    expect(calls).toEqual(["agent-a:1:start"]);
    first.resolve("first");
    await expect(firstSave).resolves.toBe("first");
    await expect(secondSave).resolves.toBe("second");
    await expect(otherAgentSave).resolves.toBe("other");
    expect(calls).toEqual(["agent-a:1:start", "agent-a:1:end", "agent-a:2", "agent-b:1"]);
  });

  it("continues with a retained retry after a preceding conflict", async () => {
    const queue = createSensitiveWordSaveQueue();
    const conflict = queue.enqueue("agent-a:1", async () => {
      throw new Error("revision conflict");
    });
    const retry = queue.enqueue("agent-a:2", async () => "saved");

    await expect(conflict).rejects.toThrow("revision conflict");
    await expect(retry).resolves.toBe("saved");
  });

  it("does not let a stale completion overwrite a newer controlled draft", () => {
    const current = {
      enabled: false,
      applyToReasoning: false,
      revision: 4,
      rules: [{ word: "newer", replacement: "draft" }],
    };
    const saved = {
      enabled: true,
      applyToReasoning: true,
      revision: 5,
      rules: [{ word: "older", replacement: "saved" }],
      words: ["older"],
      replacement: "***",
    };

    expect(
      reconcileSensitiveWordSave({
        current,
        saved,
        savedRules: saved.rules,
        isCurrentEdit: false,
        keepInvalidDraft: false,
      }),
    ).toEqual({ ...current, revision: 5 });
  });

  it("keeps invalid rows while acknowledging a switch-only save", () => {
    const current = {
      enabled: false,
      applyToReasoning: true,
      revision: 2,
      rules: [{ word: " ", replacement: "draft" }],
    };
    const saved = {
      enabled: false,
      applyToReasoning: true,
      revision: 3,
      rules: [{ word: "safe", replacement: "saved" }],
      words: ["safe"],
      replacement: "***",
    };

    expect(
      reconcileSensitiveWordSave({
        current,
        saved,
        savedRules: saved.rules,
        isCurrentEdit: true,
        keepInvalidDraft: true,
      }),
    ).toEqual({ ...current, revision: 3 });
  });
});
