import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("embedded OpenCode iframe loading copy", () => {
  const panelSource = readFileSync(
    resolve(__dirname, "../_components/opencode-iframe-panel.tsx"),
    "utf8",
  );

  it("describes creating or opening the latest conversation", () => {
    expect(panelSource).toContain("正在新建/打开最新会话...");
    expect(panelSource).not.toContain("正在打开 OpenCode 会话…");
  });
});
