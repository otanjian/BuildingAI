import { describe, expect, it } from "vitest";

import {
  isMainlandMobile,
  type LoginMode,
  resolveInitialLoginMode,
  resolveLoginModeForAccount,
} from "./login-mode";

describe("isMainlandMobile", () => {
  it("accepts a valid CN mobile number", () => {
    expect(isMainlandMobile("13800138000")).toBe(true);
  });

  it("rejects username and email", () => {
    expect(isMainlandMobile("admin")).toBe(false);
    expect(isMainlandMobile("user@example.com")).toBe(false);
  });
});

describe("resolveInitialLoginMode", () => {
  it("defaults to sms when phone login is enabled", () => {
    expect(resolveInitialLoginMode({ allowPhoneLogin: true, allowAccountLogin: true })).toBe("sms");
  });

  it("defaults to password when only account login is enabled", () => {
    expect(resolveInitialLoginMode({ allowPhoneLogin: false, allowAccountLogin: true })).toBe(
      "password",
    );
  });

  it("defaults to sms when only phone login is enabled", () => {
    expect(resolveInitialLoginMode({ allowPhoneLogin: true, allowAccountLogin: false })).toBe(
      "sms",
    );
  });
});

describe("resolveLoginModeForAccount", () => {
  it("prefers sms for mobile-shaped input when phone login is enabled", () => {
    const mode = resolveLoginModeForAccount({
      account: "13800138000",
      allowPhoneLogin: true,
      allowAccountLogin: true,
      passwordPreferred: false,
    });
    expect(mode).toBe<LoginMode>("sms");
  });

  it("keeps password when user preferred password for mobile account", () => {
    const mode = resolveLoginModeForAccount({
      account: "13800138000",
      allowPhoneLogin: true,
      allowAccountLogin: true,
      passwordPreferred: true,
    });
    expect(mode).toBe("password");
  });

  it("prefers password for non-mobile account when account login is enabled", () => {
    const mode = resolveLoginModeForAccount({
      account: "admin",
      allowPhoneLogin: true,
      allowAccountLogin: true,
      passwordPreferred: false,
    });
    expect(mode).toBe("password");
  });

  it("stays on sms for mobile when account login is disabled", () => {
    const mode = resolveLoginModeForAccount({
      account: "13800138000",
      allowPhoneLogin: true,
      allowAccountLogin: false,
      passwordPreferred: true,
    });
    expect(mode).toBe("sms");
  });
});
