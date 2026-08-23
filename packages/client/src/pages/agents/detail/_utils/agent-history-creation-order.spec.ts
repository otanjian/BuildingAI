import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("agent detail history ordering contract", () => {
  const source = readFileSync(resolve(__dirname, "../chat/index.tsx"), "utf8");

  it("requests conversations by creation time instead of update time", () => {
    expect(source).toContain('{ page: 1, pageSize: 30, sortBy: "createdAt" }');
    expect(source).not.toContain('{ page: 1, pageSize: 30, sortBy: "updatedAt" }');
  });
});
