import { describe, expect, it } from "vitest";

import { createOpencodeWorkspaceFileBlob } from "./opencode-workspace-file";

describe("createOpencodeWorkspaceFileBlob", () => {
  it("preserves leading and trailing whitespace in text files", async () => {
    const blob = createOpencodeWorkspaceFileBlob({
      path: "notes.txt",
      type: "text",
      content: "  first line\nlast line\n",
      mimeType: "text/plain",
    });

    expect(await blob.text()).toBe("  first line\nlast line\n");
    expect(blob.type).toBe("text/plain");
  });

  it("decodes Base64 binary content without UTF-8 conversion", async () => {
    const blob = createOpencodeWorkspaceFileBlob({
      path: "pixel.bin",
      type: "binary",
      content: "AP+AQA==",
      encoding: "base64",
      mimeType: "application/octet-stream",
    });

    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([0, 255, 128, 64]);
    expect(blob.type).toBe("application/octet-stream");
  });
});
