import { describe, expect, it } from "vitest";

import { buildOpencodeLivePreview } from "./opencode-live-preview";

describe("buildOpencodeLivePreview", () => {
  const userId = "u1";

  it("returns undefined when there is no assistant message", () => {
    expect(buildOpencodeLivePreview(userId, [{ info: { role: "user" } }])).toBeUndefined();
  });

  it("returns undefined when the last assistant is already finished", () => {
    expect(
      buildOpencodeLivePreview(userId, [
        {
          info: { id: "m1", role: "assistant", finish: "stop" },
          parts: [{ type: "text", text: "done" }],
        },
      ]),
    ).toBeUndefined();
  });

  it("builds a preview from unfinished assistant text", () => {
    const preview = buildOpencodeLivePreview(userId, [
      {
        info: { id: "m1", role: "assistant", finish: null },
        parts: [{ type: "text", text: "working on it" }],
      },
    ]);
    expect(preview).toBeDefined();
    expect(preview?.role).toBe("assistant");
    expect(preview?.id).toBe(`oc-live-${userId}`);
    expect(preview?.parts).toEqual([{ type: "text", text: "working on it" }]);
    expect(preview?.metadata).toMatchObject({
      isOpencodeLivePreview: true,
      sourceOpencodeMessageId: "m1",
      parentId: userId,
    });
  });

  it("includes tool summaries before text", () => {
    const preview = buildOpencodeLivePreview(userId, [
      {
        info: { id: "m1", role: "assistant", finish: null },
        parts: [
          {
            type: "tool",
            tool: "read",
            state: { status: "running", input: { filePath: "/tmp/.env" } },
          },
          { type: "text", text: "reading config" },
        ],
      },
    ]);
    expect(preview?.parts).toEqual([
      { type: "text", text: "read (running) — /tmp/.env\n\nreading config" },
    ]);
  });

  it("includes a pending tool summary when there is no text yet", () => {
    const preview = buildOpencodeLivePreview(userId, [
      {
        info: { id: "m1", role: "assistant", finish: null },
        parts: [{ type: "tool", tool: "read", state: { status: "pending" } }],
      },
    ]);
    expect(preview?.parts).toEqual([{ type: "text", text: "read (pending)" }]);
  });

  it("does not turn the interactive question tool into a generic live preview", () => {
    expect(
      buildOpencodeLivePreview(userId, [
        {
          info: { id: "m1", role: "assistant", finish: null },
          parts: [
            { type: "tool", tool: "question", state: { status: "running" } },
            { type: "text", text: "等待选择" },
          ],
        },
      ])?.parts,
    ).toEqual([{ type: "text", text: "等待选择" }]);
  });
});
