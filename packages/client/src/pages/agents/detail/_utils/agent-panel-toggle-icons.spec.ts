import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("agent panel toggle icon contract", () => {
  const headerSource = readFileSync(
    resolve(__dirname, "../_components/agent-chat-header.tsx"),
    "utf8",
  );
  const chatSource = readFileSync(resolve(__dirname, "../chat/index.tsx"), "utf8");

  it("uses a left panel glyph without changing the shared header toggle binding", () => {
    expect(headerSource).toContain('<PanelLeft className="size-4" />');
    expect(headerSource).not.toContain("<ListIndentDecrease");
    expect(headerSource).toContain("onClick={onTogglePanel}");
    expect(headerSource).toContain('aria-label={panelExpanded ? "收起侧栏" : "展开侧栏"}');
  });

  it("uses a right panel glyph without changing the workspace toggle binding", () => {
    expect(chatSource).toContain('<PanelRight className="size-4" />');
    expect(chatSource).not.toContain("<FolderTree");
    expect(chatSource).toContain("onClick={() => setWorkspaceOpen((open) => !open)}");
    expect(chatSource).toContain("aria-pressed={workspaceOpen}");
  });
});
