jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import {
    normalizeOpencodePendingQuestion,
    OpencodeApiError,
    OpencodeApiService,
} from "./opencode-api.service";

const CONFIG = {
    provider: "opencode",
    baseURL: "http://opencode.test",
    extendedConfig: { workspace: "/workspace" },
} as any;

function response(body: unknown, status = 200): Response {
    return new Response(body === undefined ? undefined : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

describe("OpencodeApiService durable read adapter", () => {
    const originalFetch = global.fetch;
    let service: OpencodeApiService;

    beforeEach(() => {
        service = new OpencodeApiService();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    it("maps a missing /session/status entry to idle and preserves busy/retry evidence", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(response({}))
            .mockResolvedValueOnce(response({ ses_busy: { type: "busy" } }))
            .mockResolvedValueOnce(
                response({
                    ses_retry: {
                        type: "retry",
                        attempt: 2,
                        message: "rate limited",
                        next: 1234,
                    },
                }),
            );

        await expect(
            service.getSessionStatus({ config: CONFIG, sessionId: "ses_idle" }),
        ).resolves.toEqual({ type: "idle" });
        await expect(
            service.getSessionStatus({ config: CONFIG, sessionId: "ses_busy" }),
        ).resolves.toEqual({ type: "busy" });
        await expect(
            service.getSessionStatus({ config: CONFIG, sessionId: "ses_retry" }),
        ).resolves.toEqual({
            type: "retry",
            attempt: 2,
            message: "rate limited",
            next: 1234,
        });
    });

    it("reads the exact session update timestamp", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            response({
                id: "ses_1",
                time: { created: 100, updated: 456 },
            }),
        );

        await expect(
            service.getSessionUpdatedAt({ config: CONFIG, sessionId: "ses_1" }),
        ).resolves.toBe(456);
        expect(global.fetch).toHaveBeenCalledWith(
            "http://opencode.test/session/ses_1",
            expect.objectContaining({ method: "GET" }),
        );
    });

    it("finds session-creation receipts exactly and deletes duplicate unmapped sessions", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(
                response([
                    {
                        id: "ses_match_old",
                        title: "old",
                        metadata: { buildingaiTurnReceipt: "turn-1" },
                        time: { created: 100, updated: 100 },
                    },
                    {
                        id: "ses_other",
                        title: "other",
                        metadata: { buildingaiTurnReceipt: "turn-other" },
                        time: { created: 50, updated: 50 },
                    },
                    {
                        id: "ses_match_new",
                        title: "new",
                        metadata: { buildingaiTurnReceipt: "turn-1" },
                        time: { created: 200, updated: 200 },
                    },
                ]),
            )
            .mockResolvedValueOnce(response(true));

        await expect(
            service.findSessionsByTurnReceipt({ config: CONFIG, turnId: "turn-1" }),
        ).resolves.toEqual([
            expect.objectContaining({ id: "ses_match_old" }),
            expect.objectContaining({ id: "ses_match_new" }),
        ]);
        await expect(
            service.deleteSession({ config: CONFIG, sessionId: "ses_match_new" }),
        ).resolves.toBeUndefined();
        expect(global.fetch).toHaveBeenNthCalledWith(
            1,
            "http://opencode.test/session?search=turn-1&limit=100",
            expect.objectContaining({ method: "GET" }),
        );
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "http://opencode.test/session/ses_match_new",
            expect.objectContaining({ method: "DELETE" }),
        );
    });

    it("uses one exact-message request and maps 404 to absent", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(response({ message: "not found" }, 404))
            .mockResolvedValueOnce(
                response({
                    info: { id: "msg_1", role: "user", sessionID: "ses_1" },
                    parts: [{ id: "part_1", type: "text", text: "hello" }],
                }),
            );

        await expect(
            service.getExactSessionMessage({
                config: CONFIG,
                sessionId: "ses_1",
                messageId: "msg_missing",
            }),
        ).resolves.toBeNull();
        await expect(
            service.getExactSessionMessage({
                config: CONFIG,
                sessionId: "ses_1",
                messageId: "msg_1",
            }),
        ).resolves.toMatchObject({ info: { id: "msg_1" } });
        expect(global.fetch).toHaveBeenNthCalledWith(
            1,
            "http://opencode.test/session/ses_1/message/msg_missing",
            expect.objectContaining({ method: "GET" }),
        );
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("bounds recent message reads and preserves parent correlation fields", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            response([
                {
                    info: {
                        id: "msg_assistant",
                        role: "assistant",
                        parentID: "msg_user",
                        finish: "stop",
                    },
                    parts: [{ id: "part_1", type: "text", text: "done" }],
                },
            ]),
        );

        await expect(
            service.listRecentSessionMessages({
                config: CONFIG,
                sessionId: "ses_1",
                limit: 20,
            }),
        ).resolves.toEqual([
            expect.objectContaining({
                info: expect.objectContaining({
                    id: "msg_assistant",
                    parentID: "msg_user",
                }),
            }),
        ]);
        expect(global.fetch).toHaveBeenCalledWith(
            "http://opencode.test/session/ses_1/message?limit=20",
            expect.objectContaining({ method: "GET" }),
        );
    });

    it("normalizes pending question options and posts ordered answers", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(
                response([
                    {
                        id: "que_1",
                        sessionID: "ses_1",
                        questions: [
                            {
                                question: "Pick a company",
                                header: "Company",
                                options: [{ label: "Bowi", description: "Real data" }],
                                multiple: false,
                            },
                        ],
                    },
                ]),
            )
            .mockResolvedValueOnce(response(undefined, 204));

        await expect(
            service.listPendingQuestions({ config: CONFIG, sessionId: "ses_1" }),
        ).resolves.toEqual([
            {
                id: "que_1",
                sessionID: "ses_1",
                questions: [
                    {
                        question: "Pick a company",
                        header: "Company",
                        options: [{ label: "Bowi", description: "Real data" }],
                        multiple: false,
                        custom: true,
                    },
                ],
            },
        ]);
        await expect(
            service.replyQuestion({
                config: CONFIG,
                requestId: "que_1",
                answers: [["Bowi"]],
            }),
        ).resolves.toBeUndefined();
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "http://opencode.test/question/que_1/reply",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ answers: [["Bowi"]] }),
            }),
        );
    });

    it.each([0, 51, Number.NaN])("rejects an unsafe recent-message limit: %s", async (limit) => {
        global.fetch = jest.fn();
        await expect(
            service.listRecentSessionMessages({
                config: CONFIG,
                sessionId: "ses_1",
                limit,
            }),
        ).rejects.toThrow(/limit/i);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it("aborts a read at its operation deadline and classifies the failure", async () => {
        global.fetch = jest.fn((_url, init) => {
            return new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener(
                    "abort",
                    () => reject(init.signal?.reason ?? new DOMException("Aborted", "AbortError")),
                    { once: true },
                );
            });
        }) as typeof fetch;

        await expect(
            service.getSessionStatus({
                config: CONFIG,
                sessionId: "ses_1",
                timeoutMs: 5,
            }),
        ).rejects.toMatchObject<Partial<OpencodeApiError>>({
            name: "OpencodeApiError",
            kind: "deadline",
            operation: "get-session-status",
        });
    });

    it("propagates caller cancellation separately from a deadline", async () => {
        global.fetch = jest.fn((_url, init) => {
            return new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener(
                    "abort",
                    () => reject(init.signal?.reason ?? new DOMException("Aborted", "AbortError")),
                    { once: true },
                );
            });
        }) as typeof fetch;
        const controller = new AbortController();
        const pending = service.getExactSessionMessage({
            config: CONFIG,
            sessionId: "ses_1",
            messageId: "msg_1",
            signal: controller.signal,
            timeoutMs: 10_000,
        });
        controller.abort(new Error("worker stopped"));

        await expect(pending).rejects.toMatchObject<Partial<OpencodeApiError>>({
            name: "OpencodeApiError",
            kind: "cancelled",
            operation: "get-exact-session-message",
        });
    });

    it.each([
        [404, "not_found"],
        [409, "conflict"],
        [429, "retryable"],
        [503, "retryable"],
        [400, "remote"],
    ] as const)("classifies OpenCode HTTP %s as %s", async (status, kind) => {
        global.fetch = jest.fn().mockResolvedValue(response({ error: "failure" }, status));

        await expect(
            service.getSessionUpdatedAt({ config: CONFIG, sessionId: "ses_1" }),
        ).rejects.toMatchObject<Partial<OpencodeApiError>>({ kind, status });
    });

    it("rejects malformed read payloads instead of manufacturing evidence", async () => {
        global.fetch = jest.fn().mockResolvedValue(response({ ses_1: { type: "unknown" } }));

        await expect(
            service.getSessionStatus({ config: CONFIG, sessionId: "ses_1" }),
        ).rejects.toMatchObject<Partial<OpencodeApiError>>({ kind: "invalid_response" });
    });

    it("dispatches prompt_async with the persisted caller messageID", async () => {
        global.fetch = jest.fn().mockResolvedValue(response(undefined, 204));

        await service.promptAsync({
            config: CONFIG,
            sessionId: "ses_1",
            messageId: "msg_stable",
            parts: [{ type: "text", text: "hello" }],
            system: "system",
            timeoutMs: 500,
        });

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        expect(JSON.parse(String(init.body))).toMatchObject({
            messageID: "msg_stable",
            parts: [{ type: "text", text: "hello" }],
            system: "system",
        });
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("creates a first session with an exact turn receipt", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            response({
                id: "ses_1",
                title: "conversation",
                metadata: { buildingaiTurnReceipt: "turn-1" },
                time: { created: 100, updated: 100 },
            }),
        );

        await service.createSession(CONFIG, "conversation", { turnReceipt: "turn-1" });

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        expect(JSON.parse(String(init.body))).toMatchObject({
            title: expect.stringContaining("turn-1"),
            metadata: { buildingaiTurnReceipt: "turn-1" },
        });
    });

    it("lets OpenCode assign its recognized default title for an embedded placeholder", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            response({
                id: "ses_embed",
                title: "New session - 2026-08-22T00:00:00.000Z",
            }),
        );

        await service.createSession(CONFIG, undefined, { useDefaultTitle: true });

        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        expect(JSON.parse(String(init.body))).toEqual({});
    });

    it("reads an exact OpenCode session snapshot", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValue(
                response({ id: "ses_embed", title: "采购订单分析", time: { updated: 456 } }),
            );

        await expect(
            service.getSession({ config: CONFIG, sessionId: "ses_embed" }),
        ).resolves.toEqual({
            id: "ses_embed",
            title: "采购订单分析",
            time: { updated: 456 },
        });
    });

    it("merges Bowi AI metadata while refreshing an existing session", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            response({
                id: "ses_embed",
                metadata: { existing: "kept", "buildingai.systemContext": "new context" },
            }),
        );

        await service.updateSessionMetadata({
            config: CONFIG,
            sessionId: "ses_embed",
            existingMetadata: { existing: "kept", "buildingai.systemContext": "old context" },
            metadata: { "buildingai.systemContext": "new context" },
        });

        expect(global.fetch).toHaveBeenCalledWith(
            "http://opencode.test/session/ses_embed",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({
                    metadata: { existing: "kept", "buildingai.systemContext": "new context" },
                }),
            }),
        );
    });

    it("lists only exact-session permissions and replies to the exact request", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(
                response([
                    { id: "per_1", sessionID: "ses_1", permission: "read" },
                    { id: "per_2", sessionID: "ses_2", permission: "write" },
                ]),
            )
            .mockResolvedValueOnce(response(true));

        await expect(
            service.listPendingPermissions({ config: CONFIG, sessionId: "ses_1", timeoutMs: 500 }),
        ).resolves.toEqual([{ id: "per_1", sessionID: "ses_1" }]);
        await service.replyPermission({
            config: CONFIG,
            requestId: "per_1",
            reply: "always",
            timeoutMs: 500,
        });
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "http://opencode.test/permission/per_1/reply",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ reply: "always" }),
            }),
        );
    });

    it("automatically resolves every permission belonging to only the target session", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(
                response([
                    { id: "per_1", sessionID: "ses_1" },
                    { id: "per_2", sessionID: "ses_1" },
                    { id: "per_other", sessionID: "ses_2" },
                ]),
            )
            .mockResolvedValueOnce(response(true))
            .mockResolvedValueOnce(response(true));

        await expect(
            service.approvePendingPermissions({
                config: CONFIG,
                sessionId: "ses_1",
                timeoutMs: 500,
            }),
        ).resolves.toBe(2);
        expect((global.fetch as jest.Mock).mock.calls.map(([url]) => url)).toEqual([
            "http://opencode.test/permission",
            "http://opencode.test/permission/per_1/reply",
            "http://opencode.test/permission/per_2/reply",
        ]);
    });

    it("lists exact-session questions and rejects the exact request", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(
                response([
                    { id: "q_1", sessionID: "ses_1", questions: [] },
                    { id: "q_2", sessionID: "ses_2", questions: [] },
                ]),
            )
            .mockResolvedValueOnce(response(true));

        await expect(
            service.listPendingQuestions({ config: CONFIG, sessionId: "ses_1", timeoutMs: 500 }),
        ).resolves.toEqual([{ id: "q_1", sessionID: "ses_1", questions: [] }]);
        await service.rejectQuestion({
            config: CONFIG,
            requestId: "q_1",
            timeoutMs: 500,
        });
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "http://opencode.test/question/q_1/reject",
            expect.objectContaining({ method: "POST" }),
        );
    });

    it("reads v2 session questions when the legacy question list is empty", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(response([]))
            .mockResolvedValueOnce(
                response({
                    data: [
                        {
                            id: "que_v2",
                            sessionID: "ses_1",
                            questions: [
                                {
                                    question: "范围？",
                                    header: "范围",
                                    options: [],
                                },
                            ],
                        },
                    ],
                }),
            )
            .mockResolvedValueOnce(response([]));

        await expect(
            service.listPendingQuestions({ config: CONFIG, sessionId: "ses_1" }),
        ).resolves.toEqual([
            {
                id: "que_v2",
                sessionID: "ses_1",
                questions: [
                    {
                        question: "范围？",
                        header: "范围",
                        options: [],
                        multiple: false,
                        custom: true,
                    },
                ],
            },
        ]);
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "http://opencode.test/api/session/ses_1/question",
            expect.objectContaining({ method: "GET" }),
        );
    });

    it("falls back to v2 session-scoped mutations for reply and reject", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(response({}, 404))
            .mockResolvedValueOnce(response(undefined, 204))
            .mockResolvedValueOnce(response({}, 404))
            .mockResolvedValueOnce(response(undefined, 204));

        await service.replyQuestion({
            config: CONFIG,
            requestId: "que_v2",
            sessionId: "ses_1",
            answers: [["范围"]],
        });
        await service.rejectQuestion({
            config: CONFIG,
            requestId: "que_v2",
            sessionId: "ses_1",
        });

        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "http://opencode.test/api/session/ses_1/question/que_v2/reply",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ answers: [["范围"]] }),
            }),
        );
        expect(global.fetch).toHaveBeenNthCalledWith(
            4,
            "http://opencode.test/api/session/ses_1/question/que_v2/reject",
            expect.objectContaining({ method: "POST" }),
        );
    });

    it("aborts one exact session with a bounded mutation", async () => {
        global.fetch = jest.fn().mockResolvedValue(response(true));

        await service.abortSession({ config: CONFIG, sessionId: "ses_1", timeoutMs: 500 });

        expect(global.fetch).toHaveBeenCalledWith(
            "http://opencode.test/session/ses_1/abort",
            expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) }),
        );
    });

    it("does not hide a failed mutation as success", async () => {
        global.fetch = jest.fn().mockResolvedValue(response({ error: "busy" }, 409));

        await expect(
            service.abortSession({ config: CONFIG, sessionId: "ses_1", timeoutMs: 500 }),
        ).rejects.toMatchObject<Partial<OpencodeApiError>>({
            operation: "abort-session",
            kind: "conflict",
            status: 409,
        });
    });
});

describe("normalizeOpencodePendingQuestion", () => {
    it("normalizes both legacy SSE field names and preserves answer semantics", () => {
        expect(
            normalizeOpencodePendingQuestion({
                id: "q_1",
                sessionID: "ses_1",
                questions: [
                    {
                        question: "选择范围",
                        header: "范围",
                        multiple: true,
                        custom: false,
                        options: [{ label: "真实公司", description: "排除测试数据" }],
                    },
                ],
            }),
        ).toEqual({
            requestId: "q_1",
            sessionId: "ses_1",
            questions: [
                {
                    question: "选择范围",
                    header: "范围",
                    multiple: true,
                    custom: false,
                    options: [{ label: "真实公司", description: "排除测试数据" }],
                },
            ],
        });
    });

    it("rejects malformed events instead of creating an unusable card", () => {
        expect(normalizeOpencodePendingQuestion({ id: "q_1", sessionID: "ses_1" })).toBeNull();
    });
});

describe("OpencodeApiService event stream readiness", () => {
    it("signals readiness before delivering the first event", async () => {
        const service = new OpencodeApiService();
        const encoder = new TextEncoder();
        const chunks = [
            encoder.encode(
                'data: {"type":"question.asked","properties":{"id":"q_1","sessionID":"ses_1","questions":[]}}\n\n',
            ),
        ].values();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            body: {
                getReader: () => ({
                    read: async () => {
                        const next = chunks.next();
                        return next.done ? { done: true } : { done: false, value: next.value };
                    },
                    cancel: async () => undefined,
                }),
            },
        });

        const order: string[] = [];
        await service.streamEvents({
            config: CONFIG,
            onReady: () => {
                order.push("ready");
            },
            onEvent: async () => {
                order.push("event");
            },
        });

        expect(order).toEqual(["ready", "event"]);
    });
});
