import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const hooks = [
  "../detail/_hooks/use-agent-chat-stream.ts",
  "../site-chat/_hooks/use-public-agent-chat-stream.ts",
];

function durableSendBranch(source: string): string {
  const sendStart = source.indexOf("const send = useCallback(");
  const start = source.indexOf("if (durableOpencodeTurnsEnabled) {", sendStart);
  const end = source.indexOf('if (status === "streaming"', start);
  return source.slice(start, end);
}

describe("durable OpenCode architecture guard", () => {
  for (const hook of hooks) {
    it(`${hook} keeps durable send owned by the conversation store`, () => {
      const source = readFileSync(resolve(__dirname, hook), "utf8");
      const branch = durableSendBranch(source);
      expect(branch).toContain("durableStore.beginTurn");
      expect(branch).not.toContain("stableChat.messages");
      expect(branch).not.toContain("registry.rekey");
      expect(branch).not.toContain("subscribeOpencodeSessionEvents");
      expect(branch).not.toContain("getAgentOpencodeSessionMessages");
      expect(branch).not.toContain("getOpencodeSessionMessages");
    });

    it(`${hook} gates legacy raw session rehydration out of durable mode`, () => {
      const source = readFileSync(resolve(__dirname, hook), "utf8");
      const rawEffect = source.indexOf("Prefer OpenCode SSE for live progress");
      expect(rawEffect).toBeGreaterThan(0);
      expect(source.slice(rawEffect, rawEffect + 500)).toContain(
        "if (durableOpencodeTurnsEnabled) return",
      );
    });
  }
});
