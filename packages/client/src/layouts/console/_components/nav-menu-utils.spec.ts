import type { MenuItem } from "@buildingai/web-types";
import { describe, expect, it } from "vitest";

import { filterVisibleMenus } from "./nav-menu-utils";

describe("filterVisibleMenus", () => {
  const createMenu = (overrides: Partial<MenuItem>): MenuItem => ({
    id: "menu",
    createdAt: "",
    updatedAt: "",
    name: "Menu",
    code: "menu",
    path: "menu",
    icon: "",
    component: "",
    permissionCode: "",
    parentId: "",
    sort: 0,
    isHidden: 0,
    type: 2,
    sourceType: 1,
    children: [],
    ...overrides,
  });

  it("excludes hidden evaluation entries while preserving visible menu items", () => {
    const visibleMenu = createMenu({
      id: "dashboard",
      name: "数据看板",
      code: "dashboard",
      path: "dashboard",
    });
    const hiddenEvaluationMenu = createMenu({
      id: "evaluation",
      name: "评估与生产就绪",
      code: "ai-evaluation",
      path: "evaluation",
      isHidden: 1,
    });

    expect(filterVisibleMenus([visibleMenu, hiddenEvaluationMenu])).toEqual([visibleMenu]);
  });

  it("treats serialized hidden flags as hidden", () => {
    const serializedEvaluationMenu = createMenu({
      id: "evaluation",
      name: "评估与生产就绪",
      code: "ai-evaluation",
      path: "evaluation",
      isHidden: "1" as unknown as number,
    });

    expect(filterVisibleMenus([serializedEvaluationMenu])).toEqual([]);
  });

  it("filters hidden descendants without removing their visible parent", () => {
    const workspace = createMenu({
      id: "workspace",
      name: "工作空间",
      code: "workspace",
      path: "workspace",
      type: 0,
      children: [
        createMenu({
          id: "evaluation",
          name: "评估与生产就绪",
          code: "ai-evaluation",
          path: "evaluation",
          isHidden: 1,
        }),
      ],
    });

    expect(filterVisibleMenus([workspace])).toEqual([{ ...workspace, children: [] }]);
  });
});
