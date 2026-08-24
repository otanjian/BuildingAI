import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("embedded OpenCode conversation title header contract", () => {
  const headerSource = readFileSync(
    resolve(__dirname, "../_components/agent-chat-header.tsx"),
    "utf8",
  );
  const iframeSource = readFileSync(
    resolve(__dirname, "../_components/opencode-iframe-panel.tsx"),
    "utf8",
  );

  it("accepts and renders the synchronized conversation title beside the agent identity", () => {
    expect(headerSource).toContain("conversationTitle?: string | null");
    expect(headerSource).toContain("conversationTitle");
    expect(headerSource).toContain('data-slot="conversation-title"');
    expect(iframeSource).toContain("conversationTitle={embedQuery.data?.title}");
  });
});
