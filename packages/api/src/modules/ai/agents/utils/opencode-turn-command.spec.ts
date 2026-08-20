jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const MODULE_PATH = resolve(__dirname, "opencode-turn-command.ts");

function loadModule(): Record<string, any> | undefined {
    expect(existsSync(MODULE_PATH)).toBe(true);
    if (!existsSync(MODULE_PATH)) return undefined;
    return require(MODULE_PATH) as Record<string, any>;
}

function command(overrides: Record<string, unknown> = {}) {
    return {
        agentId: "11111111-1111-4111-8111-111111111111",
        conversationId: "22222222-2222-4222-8222-222222222222",
        owner: { type: "user", id: "33333333-3333-4333-8333-333333333333" },
        message: {
            id: "client-ui-id",
            role: "user",
            parts: [
                { type: "text", text: " analyze this " },
                {
                    type: "file",
                    mediaType: "image/png",
                    url: "https://app.example/uploads/a.png?version=1",
                    filename: "a.png",
                },
            ],
        },
        formVariables: { company: "Bowi" },
        formFieldsInputs: { region: "cn" },
        isDebug: false,
        ...overrides,
    };
}

describe("OpenCode turn command canonicalization", () => {
    it("produces the same hash for equivalent object key order", () => {
        const module = loadModule();
        if (!module) return;

        const first = module.hashOpencodeTurnCommand(command());
        const second = module.hashOpencodeTurnCommand(
            command({
                formVariables: { company: "Bowi" },
                formFieldsInputs: { region: "cn" },
                owner: { id: "33333333-3333-4333-8333-333333333333", type: "user" },
            }),
        );

        expect(first).toMatch(/^[a-f0-9]{64}$/);
        expect(second).toBe(first);
    });

    it.each([
        ["owner", { type: "anonymous", id: "anon-hash" }],
        ["agent", undefined],
        ["conversation", undefined],
        ["text", undefined],
        ["attachment", undefined],
        ["form input", undefined],
        ["debug", undefined],
    ])("changes the hash when client %s changes", (field) => {
        const module = loadModule();
        if (!module) return;

        const base = command();
        const changed = command();
        switch (field) {
            case "owner":
                changed.owner = { type: "anonymous", id: "anon-hash" };
                break;
            case "agent":
                changed.agentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
                break;
            case "conversation":
                changed.conversationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
                break;
            case "text":
                changed.message.parts[0].text = "different";
                break;
            case "attachment":
                changed.message.parts[1].url = "https://app.example/uploads/b.png";
                break;
            case "form input":
                changed.formFieldsInputs = { region: "eu" };
                break;
            case "debug":
                changed.isDebug = true;
                break;
        }

        expect(module.hashOpencodeTurnCommand(changed)).not.toBe(
            module.hashOpencodeTurnCommand(base),
        );
    });

    it("does not include mutable server settings in the request hash", () => {
        const module = loadModule();
        if (!module) return;

        const base = command();
        expect(
            module.hashOpencodeTurnCommand({
                ...base,
                serverConfig: { points: 1, model: "old", workspace: "/old" },
            }),
        ).toBe(
            module.hashOpencodeTurnCommand({
                ...base,
                serverConfig: { points: 99, model: "new", workspace: "/new" },
            }),
        );
    });

    it("rejects assistant messages, empty commands, unsupported parts, and data URLs", () => {
        const module = loadModule();
        if (!module) return;

        expect(() => module.canonicalizeOpencodeTurnCommand(command({ message: { role: "assistant", parts: [] } }))).toThrow(/user message/i);
        expect(() => module.canonicalizeOpencodeTurnCommand(command({ message: { role: "user", parts: [] } }))).toThrow(/cannot be empty/i);
        expect(() => module.canonicalizeOpencodeTurnCommand(command({ message: { role: "user", parts: [{ type: "tool-result" }] } }))).toThrow(/unsupported/i);
        expect(() => module.canonicalizeOpencodeTurnCommand(command({ message: { role: "user", parts: [{ type: "file", mediaType: "image/png", url: "data:image/png;base64,AAAA" }] } }))).toThrow(/persisted attachment reference/i);
        expect(() => module.canonicalizeOpencodeTurnCommand(command({ message: { role: "user", parts: [{ type: "file", mediaType: "image/png", url: "https://user:password@app.example/uploads/a.png" }] } }))).toThrow(/credentials/i);
        expect(() => module.canonicalizeOpencodeTurnCommand(command({ message: { role: "user", parts: [{ type: "file", mediaType: "image/png", url: "https://app.example/uploads/a.png?X-Amz-Signature=secret" }] } }))).toThrow(/credential query/i);
    });
});

describe("OpenCode dispatch and billing snapshot", () => {
    it("freezes execution and billing inputs without credentials or attachment bytes", () => {
        const module = loadModule();
        if (!module) return;

        const snapshot = module.buildOpencodeDispatchSnapshot({
            command: command(),
            promptParts: [
                { type: "text", text: "analyze this" },
                {
                    type: "file",
                    mime: "image/png",
                    url: "https://app.example/uploads/a.png?version=1",
                    filename: "a.png",
                },
            ],
            system: "private personalized instructions",
            model: { providerID: "openai", modelID: "gpt-5" },
            artifactRoot: "/workspace/artifacts/conversation",
            billing: { enabled: true, power: 2, tokens: 1000 },
            runtime: {
                baseURL: "https://opencode.example",
                workspace: "/workspace",
                basicAuthUser: "opencode",
                basicAuthPassword: "SECRET",
                apiKey: "SECRET-API",
            },
            resolvedAttachmentUrls: ["https://app.example/uploads/a.png?version=1"],
        });
        const json = JSON.stringify(snapshot);

        expect(snapshot).toMatchObject({
            system: "private personalized instructions",
            model: { providerID: "openai", modelID: "gpt-5" },
            artifactRoot: "/workspace/artifacts/conversation",
            billing: { enabled: true, power: 2, tokens: 1000 },
            promptParts: [
                { type: "text", text: "analyze this" },
                expect.objectContaining({
                    type: "file",
                    url: "https://app.example/uploads/a.png?version=1",
                }),
            ],
        });
        expect(json).not.toContain("SECRET");
        expect(json).not.toContain("basicAuth");
        expect(json).not.toContain("apiKey");
        expect(json).not.toContain("base64");
    });

    it("rejects snapshots whose attachment refs or artifact root escape accepted boundaries", () => {
        const module = loadModule();
        if (!module) return;

        const base = {
            command: command(),
            system: "system",
            artifactRoot: "/workspace/artifacts/conversation",
            workspace: "/workspace",
            billing: { enabled: false, power: 0, tokens: 1000 },
            resolvedAttachmentUrls: [],
        };
        expect(() =>
            module.buildOpencodeDispatchSnapshot({
                ...base,
                promptParts: [
                    { type: "file", mime: "image/png", url: "blob:https://app.example/abc" },
                ],
            }),
        ).toThrow(/attachment/i);
        expect(() =>
            module.buildOpencodeDispatchSnapshot({
                ...base,
                artifactRoot: "/outside/conversation",
                promptParts: [{ type: "text", text: "hello" }],
            }),
        ).toThrow(/artifact root/i);
        expect(() =>
            module.buildOpencodeDispatchSnapshot({
                ...base,
                promptParts: [
                    {
                        type: "file",
                        mime: "image/png",
                        url: "https://external.example/unowned.png",
                    },
                ],
            }),
        ).toThrow(/persisted.*authorized attachment/i);
    });
});

describe("OpenCode runtime fingerprint and redaction", () => {
    it("binds endpoint and workspace while excluding credentials and non-runtime agent settings", () => {
        const module = loadModule();
        if (!module) return;

        const base = {
            baseURL: "https://opencode.example/",
            workspace: "/workspace/./project",
            basicAuthUser: "opencode",
            basicAuthPassword: "first",
            model: "old",
            points: 1,
        };
        const first = module.hashOpencodeRuntime(base);
        expect(module.hashOpencodeRuntime({ ...base, basicAuthPassword: "second", model: "new", points: 9 })).toBe(first);
        expect(module.hashOpencodeRuntime({ ...base, baseURL: "https://opencode.example/?apiKey=first" })).toBe(
            module.hashOpencodeRuntime({ ...base, baseURL: "https://opencode.example/?apiKey=second" }),
        );
        expect(module.hashOpencodeRuntime({ ...base, baseURL: "https://other.example" })).not.toBe(first);
        expect(module.hashOpencodeRuntime({ ...base, workspace: "/workspace/other" })).not.toBe(first);
    });

    it("deeply redacts secrets, snapshots, instructions, and attachment data from logs", () => {
        const module = loadModule();
        if (!module) return;

        const redacted = module.redactOpencodeTurnLogData({
            turnId: "turn-id",
            apiKey: "secret",
            accessToken: "secret",
            clientSecret: "secret",
            refreshToken: "secret",
            secretKey: "secret",
            prompt: { text: "private" },
            snapshot: { billing: "private" },
            customInstructions: "private",
            endpoint: "https://user:password@example.com/path",
            nested: {
                basicAuthPassword: "secret",
                authorization: "Basic secret",
                dispatchSnapshot: { system: "private" },
                artifactBaseline: [{ path: "private.html" }],
                safe: "visible",
            },
            promptParts: [{ type: "file", url: "data:image/png;base64,AAAA" }],
        });

        expect(redacted).toEqual({
            turnId: "turn-id",
            apiKey: "[REDACTED]",
            accessToken: "[REDACTED]",
            clientSecret: "[REDACTED]",
            refreshToken: "[REDACTED]",
            secretKey: "[REDACTED]",
            prompt: "[REDACTED]",
            snapshot: "[REDACTED]",
            customInstructions: "[REDACTED]",
            endpoint: "[REDACTED]",
            nested: {
                basicAuthPassword: "[REDACTED]",
                authorization: "[REDACTED]",
                dispatchSnapshot: "[REDACTED]",
                artifactBaseline: "[REDACTED]",
                safe: "visible",
            },
            promptParts: "[REDACTED]",
        });
    });
});
