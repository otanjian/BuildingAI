import { describe, expect, it } from "vitest";

import zhSettings from "../../../locales/zh-CN/settings";

describe("memory settings copy", () => {
  it("uses the memory label and exposes the agent editor actions", () => {
    expect(zhSettings.nav.ai.longTermMemory).toBe("记忆");
    expect(zhSettings.longTermMemory.agent).toBe("智能体");
    expect(zhSettings.longTermMemory.content).toBe("记忆内容");
    expect(zhSettings.longTermMemory.fullscreen).toBe("全屏编辑");
    expect(zhSettings.longTermMemory.close).toBe("关闭输入框");
  });
});
