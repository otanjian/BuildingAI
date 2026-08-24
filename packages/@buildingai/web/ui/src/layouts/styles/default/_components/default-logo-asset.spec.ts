import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const logoSource = readFileSync(
  new URL(
    "../../../../../../../../../storage/static/avatars/bowiai-agent-platform.svg",
    import.meta.url,
  ),
  "utf8",
);
const componentSource = readFileSync(new URL("./default-logo.tsx", import.meta.url), "utf8");

describe("default Agent platform logo", () => {
  it("keeps the stable sidebar fallback path behind configured branding", () => {
    expect(componentSource).toContain('"/static/avatars/bowiai-agent-platform.svg"');
    expect(componentSource).toContain("websiteConfig?.webinfo.logo?.trim() ||");
  });

  it("provides an accessible compact vector canvas", () => {
    expect(logoSource).toContain('viewBox="0 0 64 64"');
    expect(logoSource).toContain('aria-labelledby="bowi-agent-platform-title"');
    expect(logoSource).toContain('<title id="bowi-agent-platform-title">');
    expect(logoSource).toMatch(/<rect[^>]+width="64"[^>]+height="64"[^>]+rx="1[4-8]"/);
  });

  it("contains the high-contrast AI aperture and three-node orbit motif", () => {
    expect(logoSource).toContain('data-symbol="ai-aperture"');
    expect(logoSource).toContain('data-part="ai-core"');
    expect(logoSource.match(/data-part="orbit-node"/g)).toHaveLength(3);
    expect(logoSource).toContain("#22D3EE");
    expect(logoSource).toContain("#A855F7");
  });
});
