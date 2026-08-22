import { describe, expect, it, vi } from "vitest";

import {
  DeterministicOpencodeTurnClient,
  normalizeOpencodePendingQuestion,
  type OpencodeTurnTransport,
} from "./opencode-turn-client";

describe("normalizeOpencodePendingQuestion", () => {
  it("maps OpenCode event payloads into the question-card contract", () => {
    expect(
      normalizeOpencodePendingQuestion({
        id: "q_1",
        sessionID: "ses_1",
        questions: [{ question: "范围?", header: "范围", options: [] }],
      }),
    ).toMatchObject({ requestId: "q_1", sessionId: "ses_1" });
  });
});

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const TURN_ID = "22222222-2222-4222-8222-222222222222";

function activeStatus(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: CONVERSATION_ID,
    turnId: TURN_ID,
    status: "running" as const,
    cancelRequested: false,
    assistantMessageId: null,
    error: null,
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:01.000Z",
    startedAt: "2026-08-20T10:00:01.000Z",
    completedAt: null,
    lastActivityAt: "2026-08-20T10:00:01.000Z",
    ...overrides,
  };
}

function transport(overrides: Partial<OpencodeTurnTransport> = {}): OpencodeTurnTransport {
  return {
    accept: vi.fn(async (input: Parameters<OpencodeTurnTransport["accept"]>[0]) => ({
      conversationId: input.conversationId,
      turnId: input.turnId,
      status: "accepted" as const,
      duplicate: false,
    })),
    getStatus: vi.fn(async () => activeStatus()),
    stop: vi.fn(async () => activeStatus({ cancelRequested: true })),
    ...overrides,
  };
}

describe("DeterministicOpencodeTurnClient", () => {
  it("generates stable conversation and turn IDs before acceptance", async () => {
    const ids = [CONVERSATION_ID, TURN_ID];
    const api = transport();
    const client = new DeterministicOpencodeTurnClient({
      transport: api,
      createId: () => ids.shift()!,
      pollIntervalMs: 60_000,
    });

    const prepared = client.prepare({
      message: { role: "user", parts: [{ type: "text", text: "hello" }] },
    });
    expect(prepared).toMatchObject({ conversationId: CONVERSATION_ID, turnId: TURN_ID });
    await expect(client.acceptPrepared(prepared)).resolves.toMatchObject({
      conversationId: CONVERSATION_ID,
      turnId: TURN_ID,
    });
    expect(api.accept).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CONVERSATION_ID, turnId: TURN_ID }),
      expect.any(Object),
    );
    expect(client.getSnapshot().activities).toEqual([
      expect.objectContaining({ conversationId: CONVERSATION_ID, turnId: TURN_ID }),
    ]);
    client.dispose();
  });

  it("returns a referentially stable snapshot until state changes", () => {
    const client = new DeterministicOpencodeTurnClient({ transport: transport() });
    const before = client.getSnapshot();
    expect(client.getSnapshot()).toBe(before);
    client.hydrate(activeStatus());
    expect(client.getSnapshot()).not.toBe(before);
    expect(client.getSnapshot()).toBe(client.getSnapshot());
    client.dispose();
  });

  it("rejects a second prepared command while the conversation already has an active turn", () => {
    const client = new DeterministicOpencodeTurnClient({ transport: transport() });
    client.hydrate(activeStatus());

    expect(() =>
      client.prepare({
        conversationId: CONVERSATION_ID,
        message: { role: "user", parts: [{ type: "text", text: "second" }] },
      }),
    ).toThrow(/already has active.*turn/i);
    client.dispose();
  });

  it("recovers a lost HTTP 202 response by polling the same turn ID", async () => {
    const api = transport({
      accept: vi.fn(async () => {
        throw new Error("response lost");
      }),
      getStatus: vi.fn(async () => activeStatus()),
    });
    const client = new DeterministicOpencodeTurnClient({
      transport: api,
      createId: (() => {
        const ids = [CONVERSATION_ID, TURN_ID];
        return () => ids.shift()!;
      })(),
      pollIntervalMs: 60_000,
    });

    await expect(
      client.accept({ message: { role: "user", parts: [{ type: "text", text: "hello" }] } }),
    ).resolves.toMatchObject({ conversationId: CONVERSATION_ID, turnId: TURN_ID });
    expect(api.getStatus).toHaveBeenCalledWith(TURN_ID, expect.any(Object));
    expect(client.getSnapshot().activities[0]).toMatchObject({ status: "running" });
    client.dispose();
  });

  it("retries an unconfirmed acceptance with the same IDs when no turn was persisted", async () => {
    vi.useFakeTimers();
    const unavailable = new Error("gateway unavailable");
    const missing = Object.assign(new Error("turn not found"), { response: { status: 404 } });
    const api = transport({
      accept: vi.fn().mockRejectedValueOnce(unavailable).mockResolvedValueOnce({
        conversationId: CONVERSATION_ID,
        turnId: TURN_ID,
        status: "accepted",
        duplicate: false,
      }),
      getStatus: vi.fn().mockRejectedValueOnce(missing).mockResolvedValueOnce(activeStatus()),
    });
    const onAccepted = vi.fn();
    const client = new DeterministicOpencodeTurnClient({
      transport: api,
      createId: (() => {
        const ids = [CONVERSATION_ID, TURN_ID];
        return () => ids.shift()!;
      })(),
      retryBaseMs: 100,
      onAccepted,
    });

    await expect(
      client.accept({ message: { role: "user", parts: [{ type: "text", text: "hello" }] } }),
    ).rejects.toThrow("gateway unavailable");
    await vi.advanceTimersByTimeAsync(100);

    expect(api.accept).toHaveBeenCalledTimes(2);
    expect(api.accept).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ conversationId: CONVERSATION_ID, turnId: TURN_ID }),
      expect.any(Object),
    );
    expect(client.getSnapshot().activities[0]).toMatchObject({ status: "running" });
    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(onAccepted).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CONVERSATION_ID, turnId: TURN_ID }),
    );
    client.dispose();
    vi.useRealTimers();
  });

  it("removes the optimistic activity after a deterministic acceptance rejection", async () => {
    const validationError = Object.assign(new Error("invalid command"), { status: 400 });
    const api = transport({
      accept: vi.fn(async () => Promise.reject(validationError)),
    });
    const client = new DeterministicOpencodeTurnClient({
      transport: api,
      createId: (() => {
        const ids = [CONVERSATION_ID, TURN_ID];
        return () => ids.shift()!;
      })(),
    });

    await expect(
      client.accept({ message: { role: "user", parts: [{ type: "text", text: "bad" }] } }),
    ).rejects.toThrow("invalid command");
    expect(api.getStatus).not.toHaveBeenCalled();
    expect(client.getSnapshot().activities).toEqual([]);
    client.dispose();
  });

  it("does not misclassify a conflicting idempotency key as a lost 202 response", async () => {
    const conflict = Object.assign(new Error("turn ID reused with a different command"), {
      response: { status: 409 },
    });
    const api = transport({ accept: vi.fn(async () => Promise.reject(conflict)) });
    const client = new DeterministicOpencodeTurnClient({
      transport: api,
      createId: (() => {
        const ids = [CONVERSATION_ID, TURN_ID];
        return () => ids.shift()!;
      })(),
    });

    await expect(
      client.accept({ message: { role: "user", parts: [{ type: "text", text: "different" }] } }),
    ).rejects.toThrow(/different command/i);
    expect(api.getStatus).not.toHaveBeenCalled();
    expect(client.getSnapshot().activities).toEqual([]);
    client.dispose();
  });

  it("keeps status reads single-flight for one turn", async () => {
    let resolveStatus!: (value: ReturnType<typeof activeStatus>) => void;
    const api = transport({
      getStatus: vi.fn(
        () => new Promise<ReturnType<typeof activeStatus>>((resolve) => (resolveStatus = resolve)),
      ),
    });
    const client = new DeterministicOpencodeTurnClient({ transport: api });
    client.hydrate(activeStatus());

    const first = client.pollNow(TURN_ID);
    const second = client.pollNow(TURN_ID);
    expect(api.getStatus).toHaveBeenCalledTimes(1);
    resolveStatus(activeStatus());
    await Promise.all([first, second]);
    client.dispose();
  });

  it("slows authoritative polling while SSE is healthy and restores it on failure", async () => {
    vi.useFakeTimers();
    const api = transport();
    const client = new DeterministicOpencodeTurnClient({
      transport: api,
      pollIntervalMs: 1_000,
    });
    client.hydrate(activeStatus());

    client.setRealtimeHealthy(TURN_ID, true);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(api.getStatus).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(api.getStatus).toHaveBeenCalledTimes(1);

    client.setRealtimeHealthy(TURN_ID, false);
    await vi.advanceTimersByTimeAsync(999);
    expect(api.getStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.getStatus).toHaveBeenCalledTimes(2);
    client.dispose();
    vi.useRealTimers();
  });

  it("uses bounded exponential backoff without overlapping failed polls", async () => {
    vi.useFakeTimers();
    const api = transport({ getStatus: vi.fn(async () => Promise.reject(new Error("offline"))) });
    const client = new DeterministicOpencodeTurnClient({
      transport: api,
      pollIntervalMs: 100,
      retryBaseMs: 200,
      retryMaxMs: 500,
    });
    client.hydrate(activeStatus());

    await client.pollNow(TURN_ID);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(400);
    await vi.advanceTimersByTimeAsync(500);
    expect(api.getStatus).toHaveBeenCalledTimes(4);
    expect(client.getSnapshot().activities).toHaveLength(1);
    client.dispose();
    vi.useRealTimers();
  });

  it("keeps one activity indicator per conversation and refreshes history once at terminal", async () => {
    const onTerminal = vi.fn(async () => undefined);
    const api = transport({
      getStatus: vi.fn(async () =>
        activeStatus({
          status: "completed",
          assistantMessageId: "33333333-3333-4333-8333-333333333333",
          completedAt: "2026-08-20T10:00:02.000Z",
        }),
      ),
    });
    const client = new DeterministicOpencodeTurnClient({ transport: api, onTerminal });
    client.hydrate(activeStatus());
    client.hydrate(activeStatus({ status: "committing" }));
    expect(client.getSnapshot().activities).toHaveLength(1);

    await client.pollNow(TURN_ID);
    await client.pollNow(TURN_ID);
    expect(onTerminal).toHaveBeenCalledTimes(1);
    expect(client.getSnapshot().activities).toEqual([]);
    client.dispose();
  });

  it("does not reinterpret UI callback failures as transport failures", async () => {
    const api = transport();
    const client = new DeterministicOpencodeTurnClient({
      transport: api,
      createId: (() => {
        const ids = [CONVERSATION_ID, TURN_ID];
        return () => ids.shift()!;
      })(),
      onAccepted: () => {
        throw new Error("navigation failed");
      },
    });

    await expect(
      client.accept({ message: { role: "user", parts: [{ type: "text", text: "hello" }] } }),
    ).resolves.toMatchObject({ turnId: TURN_ID });
    expect(api.accept).toHaveBeenCalledTimes(1);
    expect(api.getStatus).not.toHaveBeenCalled();
    client.dispose();
  });

  it("stops only the exact active turn", async () => {
    const api = transport();
    const client = new DeterministicOpencodeTurnClient({ transport: api });
    client.hydrate(activeStatus());

    await client.stop(TURN_ID);
    expect(api.stop).toHaveBeenCalledWith(TURN_ID, expect.any(Object));
    expect(client.getSnapshot().activities[0]).toMatchObject({ cancelRequested: true });
    client.dispose();
  });

  it("isolates parallel conversations and replaces each indicator after its own terminal commit", async () => {
    const conversationB = "33333333-3333-4333-8333-333333333333";
    const turnB = "44444444-4444-4444-8444-444444444444";
    const onTerminal = vi.fn(async () => undefined);
    const api = transport({
      getStatus: vi.fn(async (turnId: string) =>
        activeStatus({
          conversationId: turnId === TURN_ID ? CONVERSATION_ID : conversationB,
          turnId,
          status: "completed",
          assistantMessageId:
            turnId === TURN_ID
              ? "55555555-5555-4555-8555-555555555555"
              : "66666666-6666-4666-8666-666666666666",
          completedAt: "2026-08-20T10:00:02.000Z",
        }),
      ),
    });
    const client = new DeterministicOpencodeTurnClient({ transport: api, onTerminal });
    client.hydrate(activeStatus());
    client.hydrate(activeStatus({ conversationId: conversationB, turnId: turnB }));
    expect(client.getSnapshot().activities).toHaveLength(2);

    await client.pollNow(TURN_ID);
    expect(client.getSnapshot().activities).toEqual([
      expect.objectContaining({ conversationId: conversationB, turnId: turnB }),
    ]);
    await client.pollNow(turnB);
    expect(client.getSnapshot().activities).toEqual([]);
    expect(onTerminal).toHaveBeenCalledTimes(2);
    client.dispose();
  });

  it("keeps a cancel-requested turn active until settlement and makes old/repeated Stop harmless", async () => {
    const api = transport({
      stop: vi
        .fn()
        .mockResolvedValueOnce(activeStatus({ cancelRequested: true }))
        .mockResolvedValueOnce(
          activeStatus({
            status: "cancelled",
            cancelRequested: false,
            assistantMessageId: "77777777-7777-4777-8777-777777777777",
            completedAt: "2026-08-20T10:00:03.000Z",
          }),
        ),
    });
    const client = new DeterministicOpencodeTurnClient({ transport: api });
    client.hydrate(activeStatus());

    await client.stop(TURN_ID);
    expect(client.getSnapshot().activities[0]).toMatchObject({ cancelRequested: true });
    await client.stop(TURN_ID);
    expect(client.getSnapshot().activities).toEqual([]);
    await expect(client.stop(TURN_ID)).rejects.toThrow(/not active/i);
    expect(api.stop).toHaveBeenCalledTimes(2);
    client.dispose();
  });

  it("keeps a billing failure visible through one terminal history refresh", async () => {
    const onTerminal = vi.fn(async () => undefined);
    const api = transport({
      getStatus: vi.fn(async () =>
        activeStatus({
          status: "failed",
          assistantMessageId: "88888888-8888-4888-8888-888888888888",
          error: {
            code: "OPENCODE_BILLING_INSUFFICIENT",
            message: "Insufficient balance",
          },
          completedAt: "2026-08-20T10:00:03.000Z",
        }),
      ),
    });
    const client = new DeterministicOpencodeTurnClient({ transport: api, onTerminal });
    client.hydrate(activeStatus());

    await client.pollNow(TURN_ID);
    expect(onTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error: expect.objectContaining({ code: "OPENCODE_BILLING_INSUFFICIENT" }),
      }),
    );
    expect(client.getSnapshot().activities).toEqual([]);
    client.dispose();
  });
});
