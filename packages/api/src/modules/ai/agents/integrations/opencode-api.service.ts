import { HttpErrorFactory } from "@buildingai/errors";
import type { ThirdPartyIntegrationConfig } from "@buildingai/types/ai/agent-config.interface";
import { Injectable, Logger } from "@nestjs/common";

import {
    DEFAULT_ARTIFACT_DIR_TEMPLATE,
    DEFAULT_OPENCODE_WORKSPACE,
} from "../utils/opencode-artifact-path";

export interface OpencodeNormalizedConfig {
    provider: "opencode";
    baseURL: string;
    workspace: string;
    artifactDirTemplate: string;
    /** Optional OpenCode model override: providerID/modelID */
    model?: { providerID: string; modelID: string };
    basicAuthUser?: string;
    basicAuthPassword?: string;
    useExternalConversation: boolean;
}

export interface OpencodeSession {
    id: string;
    directory?: string;
    title?: string;
    time?: { created?: number; updated?: number };
}

export type OpencodeSessionStatus =
    | { type: "idle" }
    | { type: "busy" }
    | { type: "retry"; attempt: number; message: string; next: number };

export type OpencodeSessionMessage = {
    info?: {
        id?: string;
        sessionID?: string;
        role?: string;
        parentID?: string;
        finish?: string | null;
        error?: unknown;
        time?: { created?: number; updated?: number; completed?: number };
    };
    parts?: Array<Record<string, unknown>>;
};

export type OpencodeApiErrorKind =
    | "cancelled"
    | "deadline"
    | "not_found"
    | "conflict"
    | "retryable"
    | "remote"
    | "unreachable"
    | "invalid_response";

export class OpencodeApiError extends Error {
    constructor(
        readonly kind: OpencodeApiErrorKind,
        readonly operation: string,
        message: string,
        readonly status?: number,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = "OpencodeApiError";
    }
}

type OpencodeOperationOptions = {
    signal?: AbortSignal;
    timeoutMs?: number;
};

const DEFAULT_OPENCODE_READ_TIMEOUT_MS = 5_000;

export type OpencodeFileNode = {
    name: string;
    path: string;
    type: "file" | "directory";
    ignored?: boolean;
};

export type OpencodeFileContent = {
    path: string;
    content: string;
    encoding?: string;
};

export type OpencodeSseHandler = (event: {
    type: string;
    properties?: Record<string, any>;
    raw: Record<string, any>;
}) => void | Promise<void>;

/**
 * OpenCode headless HTTP client.
 */
@Injectable()
export class OpencodeApiService {
    private readonly logger = new Logger(OpencodeApiService.name);

    readonly defaultBaseUrl =
        process.env.OPENCODE_BASE_URL?.trim() || "http://127.0.0.1:4096";

    normalizeConfig(config?: ThirdPartyIntegrationConfig | null): OpencodeNormalizedConfig {
        const extended = { ...(config?.extendedConfig ?? {}) };
        const workspace =
            String(extended.workspace ?? "").trim() ||
            process.env.OPENCODE_WORKSPACE?.trim() ||
            DEFAULT_OPENCODE_WORKSPACE;
        const artifactDirTemplate =
            String(extended.artifactDirTemplate ?? "").trim() || DEFAULT_ARTIFACT_DIR_TEMPLATE;
        const basicAuthUser =
            String(extended.basicAuthUser ?? "").trim() ||
            process.env.OPENCODE_SERVER_USERNAME?.trim() ||
            "opencode";
        const basicAuthPassword =
            config?.apiKey?.trim() ||
            String(extended.basicAuthPassword ?? "").trim() ||
            process.env.OPENCODE_SERVER_PASSWORD?.trim() ||
            undefined;
        const model = this.parseModel(
            String(extended.model ?? process.env.OPENCODE_MODEL ?? "").trim(),
        );

        return {
            provider: "opencode",
            baseURL: this.normalizeBaseUrl(config?.baseURL),
            workspace,
            artifactDirTemplate,
            model,
            basicAuthUser,
            basicAuthPassword,
            useExternalConversation: config?.useExternalConversation ?? true,
        };
    }

    private parseModel(
        value: string,
    ): { providerID: string; modelID: string } | undefined {
        if (!value) return undefined;
        const slash = value.indexOf("/");
        if (slash <= 0 || slash === value.length - 1) return undefined;
        return {
            providerID: value.slice(0, slash),
            modelID: value.slice(slash + 1),
        };
    }

    hasValidConfig(config?: ThirdPartyIntegrationConfig | null): boolean {
        const normalized = this.normalizeConfig(config);
        return Boolean(normalized.baseURL && normalized.workspace);
    }

    async health(config?: ThirdPartyIntegrationConfig | null): Promise<{
        healthy: boolean;
        version?: string;
    }> {
        const normalized = this.normalizeConfig(config);
        const response = await this.request(normalized, "/global/health", { method: "GET" });
        if (!response.ok) {
            throw HttpErrorFactory.badRequest(
                `OpenCode health check failed: ${response.status} ${response.statusText}`,
            );
        }
        return (await response.json()) as { healthy: boolean; version?: string };
    }

    async createSession(
        config: ThirdPartyIntegrationConfig | null | undefined,
        title?: string,
        options: OpencodeOperationOptions = {},
    ): Promise<OpencodeSession> {
        const normalized = this.normalizeConfig(config);
        const operation = "create-session";
        const response = await this.requestWithDeadline(
            normalized,
            "/session",
            {
                method: "POST",
                body: JSON.stringify({ title: title?.slice(0, 120) || "Bowi AI conversation" }),
            },
            { operation, ...options },
        );
        await this.assertOperationResponse(response, operation);
        return (await this.parseJson(response, operation)) as OpencodeSession;
    }

    async getSessionStatus(
        params: {
            config?: ThirdPartyIntegrationConfig | null;
            sessionId: string;
        } & OpencodeOperationOptions,
    ): Promise<OpencodeSessionStatus> {
        const body = await this.requestJson<Record<string, unknown>>({
            operation: "get-session-status",
            config: params.config,
            path: "/session/status",
            signal: params.signal,
            timeoutMs: params.timeoutMs,
        });
        const raw = body[params.sessionId];
        if (raw === undefined) return { type: "idle" };
        if (!raw || typeof raw !== "object") {
            throw this.invalidResponse("get-session-status", "Session status is not an object");
        }
        const status = raw as Record<string, unknown>;
        if (status.type === "idle" || status.type === "busy") {
            return { type: status.type };
        }
        if (
            status.type === "retry" &&
            typeof status.attempt === "number" &&
            Number.isFinite(status.attempt) &&
            typeof status.message === "string" &&
            typeof status.next === "number" &&
            Number.isFinite(status.next)
        ) {
            return {
                type: "retry",
                attempt: status.attempt,
                message: status.message,
                next: status.next,
            };
        }
        throw this.invalidResponse("get-session-status", "Session status has an unknown shape");
    }

    async getSessionUpdatedAt(
        params: {
            config?: ThirdPartyIntegrationConfig | null;
            sessionId: string;
        } & OpencodeOperationOptions,
    ): Promise<number> {
        const body = await this.requestJson<Record<string, unknown>>({
            operation: "get-session-update-time",
            config: params.config,
            path: `/session/${encodeURIComponent(params.sessionId)}`,
            signal: params.signal,
            timeoutMs: params.timeoutMs,
        });
        const time = body.time;
        const updated =
            time && typeof time === "object"
                ? (time as Record<string, unknown>).updated
                : undefined;
        if (typeof updated !== "number" || !Number.isFinite(updated)) {
            throw this.invalidResponse(
                "get-session-update-time",
                "Session update time is missing or invalid",
            );
        }
        return updated;
    }

    async getExactSessionMessage(
        params: {
            config?: ThirdPartyIntegrationConfig | null;
            sessionId: string;
            messageId: string;
        } & OpencodeOperationOptions,
    ): Promise<OpencodeSessionMessage | null> {
        const operation = "get-exact-session-message";
        const normalized = this.normalizeConfig(params.config);
        const response = await this.requestWithDeadline(
            normalized,
            `/session/${encodeURIComponent(params.sessionId)}/message/${encodeURIComponent(params.messageId)}`,
            { method: "GET" },
            {
                operation,
                signal: params.signal,
                timeoutMs: params.timeoutMs,
            },
        );
        if (response.status === 404) return null;
        await this.assertOperationResponse(response, operation);
        const body = await this.parseJson(response, operation);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            throw this.invalidResponse(operation, "Exact message response is not an object");
        }
        const message = body as OpencodeSessionMessage;
        if (message.info?.id !== params.messageId) {
            throw this.invalidResponse(operation, "Exact message response has the wrong identifier");
        }
        return message;
    }

    async listRecentSessionMessages(
        params: {
            config?: ThirdPartyIntegrationConfig | null;
            sessionId: string;
            limit: number;
        } & OpencodeOperationOptions,
    ): Promise<OpencodeSessionMessage[]> {
        if (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 50) {
            throw new RangeError("OpenCode recent message limit must be an integer from 1 to 50");
        }
        const operation = "list-recent-session-messages";
        const body = await this.requestJson<unknown>({
            operation,
            config: params.config,
            path: `/session/${encodeURIComponent(params.sessionId)}/message?limit=${params.limit}`,
            signal: params.signal,
            timeoutMs: params.timeoutMs,
        });
        if (!Array.isArray(body)) {
            throw this.invalidResponse(operation, "Recent message response is not an array");
        }
        return body as OpencodeSessionMessage[];
    }

    async promptAsync(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId: string;
        messageId?: string;
        /** @deprecated Prefer `parts` when attachments are present */
        text?: string;
        /** OpenCode prompt parts (text + optional FilePartInput for images) */
        parts?: Array<Record<string, unknown>>;
        system?: string;
        model?: { providerID: string; modelID: string };
    } & OpencodeOperationOptions): Promise<void> {
        const normalized = this.normalizeConfig(params.config);
        const parts =
            params.parts && params.parts.length > 0
                ? params.parts
                : [{ type: "text", text: params.text ?? "" }];
        const body: Record<string, unknown> = { parts };
        if (params.messageId?.trim()) {
            body.messageID = params.messageId.trim();
        }
        if (params.system?.trim()) {
            body.system = params.system.trim();
        }
        const model = params.model ?? normalized.model;
        if (model?.providerID && model?.modelID) {
            body.model = model;
        }

        const operation = "prompt-async";
        const response = await this.requestWithDeadline(
            normalized,
            `/session/${encodeURIComponent(params.sessionId)}/prompt_async`,
            {
                method: "POST",
                body: JSON.stringify(body),
            },
            {
                operation,
                signal: params.signal,
                timeoutMs: params.timeoutMs,
            },
        );
        await this.assertOperationResponse(response, operation);
    }

    /**
     * List pending permission prompts (`GET /permission`).
     * Headless serve has no TUI — BuildingAI must reply or the turn hangs.
     */
    async listPendingPermissions(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId?: string;
    } & OpencodeOperationOptions): Promise<Array<{ id: string; sessionID: string }>> {
        const operation = "list-pending-permissions";
        const body = await this.requestJson<unknown>({
            operation,
            config: params.config,
            path: "/permission",
            signal: params.signal,
            timeoutMs: params.timeoutMs,
        });
        if (!Array.isArray(body)) {
            throw this.invalidResponse(operation, "Pending permission response is not an array");
        }
        return body
            .map((item) => {
                const row = (item && typeof item === "object" ? item : {}) as Record<
                    string,
                    unknown
                >;
                return {
                    id: String(row.id ?? ""),
                    sessionID: String(row.sessionID ?? ""),
                };
            })
            .filter((item) => item.id && item.sessionID)
            .filter((item) => !params.sessionId || item.sessionID === params.sessionId);
    }

    /**
     * Reply to a permission prompt (`POST /permission/:id/reply`).
     */
    async replyPermission(params: {
        config?: ThirdPartyIntegrationConfig | null;
        requestId: string;
        reply?: "once" | "always" | "reject";
    } & OpencodeOperationOptions): Promise<void> {
        const normalized = this.normalizeConfig(params.config);
        const reply = params.reply ?? "always";
        const operation = "reply-permission";
        const response = await this.requestWithDeadline(
            normalized,
            `/permission/${encodeURIComponent(params.requestId)}/reply`,
            {
                method: "POST",
                body: JSON.stringify({ reply }),
            },
            {
                operation,
                signal: params.signal,
                timeoutMs: params.timeoutMs,
            },
        );
        await this.assertOperationResponse(response, operation);
    }

    /**
     * Auto-approve every pending permission for a session (headless YOLO).
     */
    async approvePendingPermissions(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId: string;
    } & OpencodeOperationOptions): Promise<number> {
        const pending = await this.listPendingPermissions({
            config: params.config,
            sessionId: params.sessionId,
            signal: params.signal,
            timeoutMs: params.timeoutMs,
        });
        for (const item of pending) {
            await this.replyPermission({
                config: params.config,
                requestId: item.id,
                reply: "always",
                signal: params.signal,
                timeoutMs: params.timeoutMs,
            });
        }
        return pending.length;
    }

    async abortSession(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId: string;
    } & OpencodeOperationOptions): Promise<void> {
        const normalized = this.normalizeConfig(params.config);
        const operation = "abort-session";
        const response = await this.requestWithDeadline(
            normalized,
            `/session/${encodeURIComponent(params.sessionId)}/abort`,
            { method: "POST" },
            {
                operation,
                signal: params.signal,
                timeoutMs: params.timeoutMs,
            },
        );
        await this.assertOperationResponse(response, operation);
    }

    async listPendingQuestions(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId?: string;
    } & OpencodeOperationOptions): Promise<
        Array<{ id: string; sessionID: string; questions: Array<Record<string, unknown>> }>
    > {
        const operation = "list-pending-questions";
        const body = await this.requestJson<unknown>({
            operation,
            config: params.config,
            path: "/question",
            signal: params.signal,
            timeoutMs: params.timeoutMs,
        });
        if (!Array.isArray(body)) {
            throw this.invalidResponse(operation, "Pending question response is not an array");
        }
        return body
            .map((item) => {
                const row = (item && typeof item === "object" ? item : {}) as Record<
                    string,
                    unknown
                >;
                return {
                    id: String(row.id ?? ""),
                    sessionID: String(row.sessionID ?? ""),
                    questions: Array.isArray(row.questions)
                        ? (row.questions as Array<Record<string, unknown>>)
                        : [],
                };
            })
            .filter((item) => item.id && item.sessionID)
            .filter((item) => !params.sessionId || item.sessionID === params.sessionId);
    }

    async rejectQuestion(params: {
        config?: ThirdPartyIntegrationConfig | null;
        requestId: string;
    } & OpencodeOperationOptions): Promise<void> {
        const normalized = this.normalizeConfig(params.config);
        const operation = "reject-question";
        const response = await this.requestWithDeadline(
            normalized,
            `/question/${encodeURIComponent(params.requestId)}/reject`,
            { method: "POST" },
            {
                operation,
                signal: params.signal,
                timeoutMs: params.timeoutMs,
            },
        );
        await this.assertOperationResponse(response, operation);
    }

    /**
     * List messages for an OpenCode session (`GET /session/:id/message`).
     */
    async listSessionMessages(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId: string;
    }): Promise<
        Array<{
            info?: {
                id?: string;
                role?: string;
                finish?: string | null;
                error?: unknown;
                time?: { created?: number; updated?: number };
            };
            parts?: Array<Record<string, unknown>>;
        }>
    > {
        const normalized = this.normalizeConfig(params.config);
        const response = await this.request(
            normalized,
            `/session/${encodeURIComponent(params.sessionId)}/message`,
            { method: "GET" },
        );
        if (!response.ok) {
            const text = await response.text();
            throw HttpErrorFactory.badRequest(
                `OpenCode list session messages failed: ${response.status} ${text}`,
            );
        }
        const body = (await response.json()) as unknown;
        if (!Array.isArray(body)) {
            throw HttpErrorFactory.badRequest(
                "OpenCode list session messages returned unexpected payload",
            );
        }
        return body as Array<{
            info?: {
                id?: string;
                role?: string;
                finish?: string | null;
                error?: unknown;
                time?: { created?: number; updated?: number };
            };
            parts?: Array<Record<string, unknown>>;
        }>;
    }

    /**
     * List files/directories under a workspace-relative path via OpenCode `GET /file`.
     */
    async listFiles(params: {
        config?: ThirdPartyIntegrationConfig | null;
        path: string;
    }): Promise<OpencodeFileNode[]> {
        const normalized = this.normalizeConfig(params.config);
        const listPath = params.path?.trim() || ".";
        const response = await this.request(
            normalized,
            `/file?path=${encodeURIComponent(listPath)}`,
            { method: "GET" },
        );
        if (!response.ok) {
            const text = await response.text();
            throw HttpErrorFactory.badRequest(
                `OpenCode file list failed: ${response.status} ${text}`,
            );
        }
        const body = (await response.json()) as unknown;
        if (!Array.isArray(body)) {
            throw HttpErrorFactory.badRequest("OpenCode file list returned unexpected payload");
        }
        return body.map((item) => this.normalizeFileNode(item));
    }

    /**
     * Read file content via OpenCode `GET /file/content`.
     */
    async readFileContent(params: {
        config?: ThirdPartyIntegrationConfig | null;
        path: string;
    }): Promise<OpencodeFileContent> {
        const normalized = this.normalizeConfig(params.config);
        const filePath = params.path?.trim();
        if (!filePath || filePath === "." || filePath === "/") {
            throw HttpErrorFactory.badRequest("File path is required");
        }
        const response = await this.request(
            normalized,
            `/file/content?path=${encodeURIComponent(filePath)}`,
            { method: "GET" },
        );
        if (!response.ok) {
            const text = await response.text();
            throw HttpErrorFactory.badRequest(
                `OpenCode file content failed: ${response.status} ${text}`,
            );
        }
        const body = (await response.json()) as Record<string, unknown>;
        const content =
            typeof body.content === "string"
                ? body.content
                : typeof body.text === "string"
                  ? body.text
                  : null;
        if (content === null) {
            throw HttpErrorFactory.badRequest("Unsupported or binary file content");
        }
        return {
            path: typeof body.path === "string" ? body.path : filePath,
            content,
            encoding: typeof body.encoding === "string" ? body.encoding : undefined,
        };
    }

    private normalizeFileNode(item: unknown): OpencodeFileNode {
        const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const typeRaw = String(row.type ?? "file").toLowerCase();
        const type = typeRaw === "directory" || typeRaw === "dir" ? "directory" : "file";
        const entryPath = String(row.path ?? row.name ?? "").replace(/\/+$/, "");
        const name =
            String(row.name ?? "").trim() ||
            (entryPath ? entryPath.split("/").filter(Boolean).pop() ?? entryPath : "");
        return {
            name,
            path: entryPath,
            type,
            ignored: Boolean(row.ignored),
        };
    }

    /**
     * Subscribe to OpenCode global event SSE until aborted or handler returns done.
     */
    async streamEvents(params: {
        config?: ThirdPartyIntegrationConfig | null;
        signal?: AbortSignal;
        onEvent: OpencodeSseHandler;
        shouldStop?: (event: { type: string; properties?: Record<string, any> }) => boolean;
    }): Promise<void> {
        const normalized = this.normalizeConfig(params.config);
        const response = await this.request(normalized, "/event", {
            method: "GET",
            headers: { Accept: "text/event-stream" },
            signal: params.signal,
        });
        if (!response.ok || !response.body) {
            const text = await response.text().catch(() => "");
            throw HttpErrorFactory.badRequest(
                `OpenCode event stream failed: ${response.status} ${text}`,
            );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                if (params.signal?.aborted) break;
                const { done, value } = await reader.read();
                if (done) break;
                if (!value) continue;

                buffer += decoder.decode(value, { stream: true });
                const chunks = buffer.split(/\n\n+/);
                buffer = chunks.pop() ?? "";

                for (const chunk of chunks) {
                    const dataLines = chunk
                        .split("\n")
                        .filter((line) => line.startsWith("data:"))
                        .map((line) => line.slice(5).trim());
                    if (dataLines.length === 0) continue;
                    const payload = dataLines.join("\n");
                    if (!payload || payload === "[DONE]") continue;

                    let parsed: Record<string, any>;
                    try {
                        parsed = JSON.parse(payload) as Record<string, any>;
                    } catch {
                        this.logger.debug(`Skip non-JSON OpenCode SSE chunk: ${payload.slice(0, 120)}`);
                        continue;
                    }

                    const type = String(parsed.type ?? "");
                    const properties = (parsed.properties ?? {}) as Record<string, any>;
                    await params.onEvent({ type, properties, raw: parsed });
                    if (params.shouldStop?.({ type, properties })) {
                        return;
                    }
                }
            }
        } finally {
            try {
                await reader.cancel();
            } catch {
                // ignore
            }
        }
    }

    private normalizeBaseUrl(baseURL?: string): string {
        const raw = baseURL?.trim() || this.defaultBaseUrl;
        return raw.replace(/\/+$/, "");
    }

    private async requestJson<T>(params: {
        operation: string;
        config?: ThirdPartyIntegrationConfig | null;
        path: string;
        signal?: AbortSignal;
        timeoutMs?: number;
    }): Promise<T> {
        const normalized = this.normalizeConfig(params.config);
        const response = await this.requestWithDeadline(
            normalized,
            params.path,
            { method: "GET" },
            params,
        );
        await this.assertOperationResponse(response, params.operation);
        return (await this.parseJson(response, params.operation)) as T;
    }

    private async requestWithDeadline(
        config: OpencodeNormalizedConfig,
        path: string,
        init: RequestInit,
        options: { operation: string; signal?: AbortSignal; timeoutMs?: number },
    ): Promise<Response> {
        const timeoutMs = options.timeoutMs ?? DEFAULT_OPENCODE_READ_TIMEOUT_MS;
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
            throw new RangeError("OpenCode operation timeoutMs must be a positive finite number");
        }
        if (options.signal?.aborted) {
            throw new OpencodeApiError(
                "cancelled",
                options.operation,
                `OpenCode ${options.operation} was cancelled`,
            );
        }

        const controller = new AbortController();
        let deadlineReached = false;
        const cancelFromCaller = () => controller.abort(options.signal?.reason);
        options.signal?.addEventListener("abort", cancelFromCaller, { once: true });
        const deadline = setTimeout(() => {
            deadlineReached = true;
            controller.abort(new DOMException("OpenCode operation deadline exceeded", "TimeoutError"));
        }, timeoutMs);

        try {
            return await this.request(config, path, { ...init, signal: controller.signal });
        } catch (error) {
            if (deadlineReached) {
                throw new OpencodeApiError(
                    "deadline",
                    options.operation,
                    `OpenCode ${options.operation} exceeded its ${timeoutMs}ms deadline`,
                    undefined,
                    { cause: error },
                );
            }
            if (options.signal?.aborted) {
                throw new OpencodeApiError(
                    "cancelled",
                    options.operation,
                    `OpenCode ${options.operation} was cancelled`,
                    undefined,
                    { cause: error },
                );
            }
            if (error instanceof OpencodeApiError) throw error;
            throw new OpencodeApiError(
                "unreachable",
                options.operation,
                `OpenCode ${options.operation} could not reach ${config.baseURL}`,
                undefined,
                { cause: error },
            );
        } finally {
            clearTimeout(deadline);
            options.signal?.removeEventListener("abort", cancelFromCaller);
        }
    }

    private async assertOperationResponse(response: Response, operation: string): Promise<void> {
        if (response.ok) return;
        const status = response.status;
        const kind: OpencodeApiErrorKind =
            status === 404
                ? "not_found"
                : status === 409
                  ? "conflict"
                  : status === 408 || status === 425 || status === 429 || status >= 500
                    ? "retryable"
                    : "remote";
        const detail = (await response.text().catch(() => "")).slice(0, 500);
        throw new OpencodeApiError(
            kind,
            operation,
            `OpenCode ${operation} failed with HTTP ${status}${detail ? `: ${detail}` : ""}`,
            status,
        );
    }

    private async parseJson(response: Response, operation: string): Promise<unknown> {
        try {
            return await response.json();
        } catch (error) {
            throw this.invalidResponse(operation, "OpenCode returned invalid JSON", error);
        }
    }

    private invalidResponse(operation: string, message: string, cause?: unknown): OpencodeApiError {
        return new OpencodeApiError("invalid_response", operation, message, undefined, { cause });
    }

    private async request(
        config: OpencodeNormalizedConfig,
        path: string,
        init: RequestInit = {},
    ): Promise<Response> {
        const headers = new Headers(init.headers);
        if (!headers.has("Content-Type") && init.body) {
            headers.set("Content-Type", "application/json");
        }
        headers.set("x-opencode-directory", encodeURIComponent(config.workspace));
        if (config.basicAuthPassword) {
            const token = Buffer.from(
                `${config.basicAuthUser || "opencode"}:${config.basicAuthPassword}`,
            ).toString("base64");
            headers.set("Authorization", `Basic ${token}`);
        }

        const url = `${config.baseURL}${path.startsWith("/") ? path : `/${path}`}`;
        try {
            return await fetch(url, { ...init, headers });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw HttpErrorFactory.badRequest(`OpenCode unreachable at ${config.baseURL}: ${message}`);
        }
    }
}
