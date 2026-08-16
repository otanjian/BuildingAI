import { describe, expect, it } from "vitest";

import {
  formatRemainingPowerLabel,
  shouldRefreshUserPowerAfterUsage,
} from "./remaining-power-label";

describe("formatRemainingPowerLabel", () => {
  it("returns null when power is missing", () => {
    expect(formatRemainingPowerLabel(undefined)).toBeNull();
    expect(formatRemainingPowerLabel(null)).toBeNull();
    expect(formatRemainingPowerLabel(Number.NaN)).toBeNull();
  });

  it("formats non-negative integer with zh-CN grouping", () => {
    expect(formatRemainingPowerLabel(0)).toBe("剩余 0");
    expect(formatRemainingPowerLabel(1234)).toBe("剩余 1,234");
    expect(formatRemainingPowerLabel(12.9)).toBe("剩余 12");
  });

  it("clamps negative values to zero", () => {
    expect(formatRemainingPowerLabel(-5)).toBe("剩余 0");
  });
});

describe("shouldRefreshUserPowerAfterUsage", () => {
  it("is true only for positive userConsumedPower", () => {
    expect(shouldRefreshUserPowerAfterUsage({ userConsumedPower: 1 })).toBe(true);
    expect(shouldRefreshUserPowerAfterUsage({ userConsumedPower: 0 })).toBe(false);
    expect(shouldRefreshUserPowerAfterUsage({ userConsumedPower: -1 })).toBe(false);
    expect(shouldRefreshUserPowerAfterUsage({})).toBe(false);
    expect(shouldRefreshUserPowerAfterUsage(null)).toBe(false);
  });
});
