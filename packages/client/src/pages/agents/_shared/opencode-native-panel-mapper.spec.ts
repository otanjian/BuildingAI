import { describe, expect, it } from "vitest";

import { mapOpencodeSessionMessages } from "./opencode-native-panel-mapper";

describe("mapOpencodeSessionMessages", () => {
  it("keeps ordered user/assistant messages and maps tool progress", () => {
    const result = mapOpencodeSessionMessages([
      {
        info: { id: "user-1", role: "user" },
        parts: [{ type: "text", text: "分析采购" }],
      },
      {
        info: { id: "assistant-1", role: "assistant", finish: null },
        parts: [
          { type: "reasoning", text: "先读取数据" },
          {
            id: "part-1",
            type: "tool",
            tool: "sap-pyrfc_run_query",
            state: { status: "running", input: { sql_query: "SELECT * FROM EKPO" } },
          },
          { id: "question-1", type: "tool", tool: "question", state: { status: "running" } },
          { type: "text", text: "正在处理" },
        ],
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]?.role).toBe("user");
    expect(result[1]?.parts).toEqual([
      { type: "reasoning", text: "先读取数据" },
      expect.objectContaining({
        type: "dynamic-tool",
        toolName: "sap-pyrfc_run_query",
        toolCallId: "part-1",
        state: "input-available",
      }),
      { type: "text", text: "正在处理" },
    ]);
  });

  it("uses stable ids and skips malformed/question parts", () => {
    const result = mapOpencodeSessionMessages([
      { info: { role: "assistant" }, parts: [{ type: "tool", tool: "question" }] },
      { info: { id: "empty", role: "assistant" }, parts: [{ type: "unknown" }] },
    ]);

    expect(result[0]?.id).toMatch(/^opencode-message-/);
    expect(result[0]?.parts).toEqual([]);
    expect(result[1]?.id).toBe("empty");
  });
});
