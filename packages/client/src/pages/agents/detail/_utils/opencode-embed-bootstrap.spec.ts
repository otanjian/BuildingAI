import { describe, expect, it } from "vitest";

import {
  OPENCODE_EMBED_MAX_RETRIES,
  opencodeEmbedRetryDelay,
  opencodeTitleRefetchInterval,
  shouldRefreshOpencodeTitleHistory,
  shouldRefreshOpencodeHistory,
  shouldRetryOpencodeEmbedSession,
} from "./opencode-embed-bootstrap";

describe("OpenCode embed bootstrap retry policy", () => {
  it("retries draft initialization failures and network failures", () => {
    expect(shouldRetryOpencodeEmbedSession(0, { status: 404 })).toBe(true);
    expect(shouldRetryOpencodeEmbedSession(1, { status: 409 })).toBe(true);
    expect(shouldRetryOpencodeEmbedSession(2, new Error("network"))).toBe(true);
    expect(shouldRetryOpencodeEmbedSession(2, { status: undefined })).toBe(true);
    expect(shouldRetryOpencodeEmbedSession(2, { status: null })).toBe(true);
  });

  it("does not retry terminal authorization or validation failures", () => {
    expect(shouldRetryOpencodeEmbedSession(0, { status: 400 })).toBe(false);
    expect(shouldRetryOpencodeEmbedSession(0, { status: 401 })).toBe(false);
    expect(shouldRetryOpencodeEmbedSession(0, { status: 403 })).toBe(false);
  });

  it("bounds retries and uses a capped backoff", () => {
    expect(shouldRetryOpencodeEmbedSession(OPENCODE_EMBED_MAX_RETRIES, { status: 404 })).toBe(
      false,
    );
    expect(opencodeEmbedRetryDelay(0)).toBe(250);
    expect(opencodeEmbedRetryDelay(10)).toBe(2000);
  });

  it("refreshes history once a new embed session becomes available", () => {
    expect(shouldRefreshOpencodeHistory(undefined, "session-1")).toBe(true);
    expect(shouldRefreshOpencodeHistory("session-1", "session-1")).toBe(false);
    expect(shouldRefreshOpencodeHistory("session-1", undefined)).toBe(false);
  });

  it("polls only while the embedded conversation still has a placeholder title", () => {
    expect(opencodeTitleRefetchInterval({ title: "新对话" })).toBe(1500);
    expect(opencodeTitleRefetchInterval({ title: "New conversation" })).toBe(1500);
    expect(opencodeTitleRefetchInterval({ title: "采购订单分析" })).toBe(false);
    expect(opencodeTitleRefetchInterval(undefined)).toBe(false);
  });

  it("refreshes history when embed bootstrap reports a newly synchronized title", () => {
    expect(shouldRefreshOpencodeTitleHistory(undefined, "采购订单分析", true)).toBe(true);
    expect(shouldRefreshOpencodeTitleHistory("采购订单分析", "采购订单分析", true)).toBe(false);
    expect(shouldRefreshOpencodeTitleHistory(undefined, "新对话", false)).toBe(false);
  });

  it("refreshes history when an async title replaces a placeholder", () => {
    expect(shouldRefreshOpencodeTitleHistory("新对话", "采购订单分析", false)).toBe(true);
    expect(shouldRefreshOpencodeTitleHistory("New conversation", "采购订单分析", false)).toBe(true);
    expect(shouldRefreshOpencodeTitleHistory("采购订单分析", "另一个标题", false)).toBe(false);
  });
});
