import { describe, expect, it } from "vitest";

import { DEFAULT_USER_AVATAR_COUNT, resolveUserListAvatar } from "./user-avatar";

describe("resolveUserListAvatar", () => {
  it("preserves an uploaded avatar", () => {
    expect(resolveUserListAvatar("https://cdn.example.com/avatar.png", "user-1")).toBe(
      "https://cdn.example.com/avatar.png",
    );
  });

  it("maps a historical empty avatar to one stable bundled portrait", () => {
    const first = resolveUserListAvatar(null, "user-1");
    const repeated = resolveUserListAvatar("", "user-1");

    expect(repeated).toBe(first);
    expect(first).toMatch(/^\/static\/avatars\/\d+\.png$/);
    const index = Number(first.match(/\d+/)?.[0]);
    expect(index).toBeGreaterThanOrEqual(1);
    expect(index).toBeLessThanOrEqual(DEFAULT_USER_AVATAR_COUNT);
  });

  it("remaps stored system placeholders by identity while retaining their asset origin", () => {
    const first = resolveUserListAvatar("http://127.0.0.1:4090/static/avatars/3.png", "user-1");
    const second = resolveUserListAvatar("http://127.0.0.1:4090/static/avatars/3.png", "user-2");

    expect(first).toMatch(/^http:\/\/127\.0\.0\.1:4090\/static\/avatars\/\d+\.png$/);
    expect(second).not.toBe(first);
  });

  it("distributes different identities across the portrait library", () => {
    const urls = new Set(
      Array.from({ length: 20 }, (_, index) => resolveUserListAvatar(null, `user-${index}`)),
    );
    expect(urls.size).toBeGreaterThan(10);
  });

  it("gives the representative user-number page distinct portraits", () => {
    const userNumbers = [
      "20260801083655825454",
      "20260731124949872054",
      "20260731123731461998",
      "20260731122750429121",
      "20260731090116211741",
      "20260615100659813835",
      "20260523001526998986",
    ];
    const urls = userNumbers.map((userNo) =>
      resolveUserListAvatar("/static/avatars/3.png", userNo),
    );
    expect(new Set(urls).size).toBe(userNumbers.length);
  });
});
