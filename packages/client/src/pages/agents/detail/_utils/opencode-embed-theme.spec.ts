import { describe, expect, it } from "vitest";

import { resolveOpencodeEmbedColorScheme } from "./opencode-embed-theme";

describe("resolveOpencodeEmbedColorScheme", () => {
  it("preserves an explicitly selected BuildingAI theme", () => {
    expect(resolveOpencodeEmbedColorScheme("dark", false)).toBe("dark");
    expect(resolveOpencodeEmbedColorScheme("light", true)).toBe("light");
  });

  it("resolves the system theme from the current media query", () => {
    expect(resolveOpencodeEmbedColorScheme("system", true)).toBe("dark");
    expect(resolveOpencodeEmbedColorScheme("system", false)).toBe("light");
  });
});
