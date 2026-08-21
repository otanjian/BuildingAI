import { afterEach, describe, expect, it, vi } from "vitest";

const { post, get, createPublicHttpClient } = vi.hoisted(() => {
  const post = vi.fn();
  const get = vi.fn();
  return { post, get, createPublicHttpClient: vi.fn(() => ({ post, get })) };
});

vi.mock("./public-http", () => ({
  createPublicHttpClient,
  fetchPublicJson: vi.fn(),
  unwrapPublicEnvelope: <T>(payload: T | { data?: T }) =>
    payload && typeof payload === "object" && "data" in payload ? payload.data : payload,
}));
vi.mock("@/utils/api", () => ({ getApiBaseUrl: () => "https://buildingai.test" }));

import {
  acceptPublicOpencodeTurn,
  getPublicOpencodeTurnStatus,
  stopPublicOpencodeTurn,
} from "./public-conversations";

describe("public durable OpenCode turn transport", () => {
  afterEach(() => vi.clearAllMocks());

  it("preserves anonymous ownership on accept, status, and exact Stop", async () => {
    post.mockResolvedValueOnce({ data: { status: "accepted" } });
    get.mockResolvedValue({ data: { status: "running" } });
    post.mockResolvedValueOnce({ data: { status: "running", cancelRequested: true } });
    const ownership = { accessToken: "site-token", anonymousIdentifier: "anonymous-owner" };
    const input = {
      turnId: "11111111-1111-4111-8111-111111111111",
      conversationId: "22222222-2222-4222-8222-222222222222",
      message: { role: "user" as const, parts: [{ type: "text" as const, text: "hello" }] },
    };

    await expect(acceptPublicOpencodeTurn({ ...ownership, input })).resolves.toEqual({
      status: "accepted",
    });
    await expect(
      getPublicOpencodeTurnStatus({ ...ownership, turnId: input.turnId }),
    ).resolves.toEqual({ status: "running" });
    await expect(stopPublicOpencodeTurn({ ...ownership, turnId: input.turnId })).resolves.toEqual({
      status: "running",
      cancelRequested: true,
    });

    expect(createPublicHttpClient).toHaveBeenNthCalledWith(1, "site-token", "anonymous-owner");
    expect(createPublicHttpClient).toHaveBeenNthCalledWith(2, "site-token", "anonymous-owner");
    expect(createPublicHttpClient).toHaveBeenNthCalledWith(3, "site-token", "anonymous-owner");
    expect(post).toHaveBeenNthCalledWith(1, "https://buildingai.test/v1/opencode-turns", input, {
      signal: undefined,
    });
    expect(get).toHaveBeenCalledWith(`https://buildingai.test/v1/opencode-turns/${input.turnId}`, {
      signal: undefined,
    });
    expect(post).toHaveBeenNthCalledWith(
      2,
      `https://buildingai.test/v1/opencode-turns/${input.turnId}/stop`,
      undefined,
      { signal: undefined },
    );
  });
});
