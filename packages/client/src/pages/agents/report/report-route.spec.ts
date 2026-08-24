import { describe, expect, it } from "vitest";

import { buildConversationArtifactApiPath, normalizeReportRelativePath } from "./report-route";

describe("BuildingAI report route", () => {
  it("builds an encoded conversation artifact API path", () => {
    expect(
      buildConversationArtifactApiPath({
        agentId: "agent/id",
        conversationId: "conversation id",
        relativePath: "采购分析/报告.html",
      }),
    ).toBe(
      "/api/ai-agents/agent%2Fid/conversations/conversation%20id/artifacts/%E9%87%87%E8%B4%AD%E5%88%86%E6%9E%90/%E6%8A%A5%E5%91%8A.html",
    );
  });

  it.each(["../secret.html", "reports/../../secret.html", "/tmp/report.html", "report.pdf", ""])(
    "rejects unsafe or non-HTML report path %s",
    (value) => {
      expect(normalizeReportRelativePath(value)).toBeUndefined();
    },
  );

  it("normalizes safe encoded HTML segments", () => {
    expect(normalizeReportRelativePath("采购分析/%E6%8A%A5%E5%91%8A.html")).toBe(
      "采购分析/报告.html",
    );
  });
});
