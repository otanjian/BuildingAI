import { describe, expect, it } from "vitest";

import {
  translateAction,
  translateMembershipProject,
  translateProjectStatus,
  translateResourceType,
  translateRole,
  translateTenantStatus,
} from "./tenant-copy";

describe("tenant management Chinese labels", () => {
  it("translates known tenant, role, project, resource and action values", () => {
    expect(translateTenantStatus("active")).toBe("正常");
    expect(translateRole("owner")).toBe("所有者");
    expect(translateProjectStatus("archived")).toBe("已归档");
    expect(translateResourceType("agent")).toBe("智能体");
    expect(translateAction("execute")).toBe("执行");
    expect(translateMembershipProject(null)).toBe("租户级别");
  });

  it("does not expose unknown English status values", () => {
    expect(translateTenantStatus("future-status")).toBe("未知");
    expect(translateRole("future-role")).toBe("未知角色");
    expect(translateProjectStatus("future-status")).toBe("未知");
    expect(translateResourceType("future-resource")).toBe("资源");
    expect(translateAction("future-action")).toBe("未知操作");
  });
});
