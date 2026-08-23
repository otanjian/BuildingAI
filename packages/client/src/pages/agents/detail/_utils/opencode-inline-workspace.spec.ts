import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("embedded OpenCode Workspace layout contract", () => {
  const source = readFileSync(resolve(__dirname, "../chat/index.tsx"), "utf8");

  it("uses a closed-by-default inline resizable right panel", () => {
    expect(source).toContain("ResizablePanelGroup");
    expect(source).toContain("workspacePanelRef");
    expect(source).toContain("collapsedSize={0}");
    expect(source).toContain("const [workspaceOpen, setWorkspaceOpen] = useState(false)");
  });

  it("does not render Workspace through an overlay Sheet", () => {
    expect(source).not.toContain("<Sheet open={workspaceOpen}");
    expect(source).toContain("<OpencodeWorkspacePanel");
    expect(source).toContain("agentId={agentId}");
  });
});
