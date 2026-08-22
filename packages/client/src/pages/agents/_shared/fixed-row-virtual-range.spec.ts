import { describe, expect, it } from "vitest";

import { fixedRowVirtualRange } from "./fixed-row-virtual-range";

describe("fixedRowVirtualRange", () => {
  it("mounts only the visible rows plus bounded overscan", () => {
    expect(
      fixedRowVirtualRange({
        count: 1_000,
        rowHeight: 36,
        viewportHeight: 360,
        scrollTop: 3_600,
        overscan: 4,
      }),
    ).toEqual({ start: 96, end: 114 });
  });

  it("clamps the range at both edges", () => {
    expect(
      fixedRowVirtualRange({
        count: 8,
        rowHeight: 36,
        viewportHeight: 360,
        scrollTop: 0,
        overscan: 4,
      }),
    ).toEqual({ start: 0, end: 8 });
  });
});
