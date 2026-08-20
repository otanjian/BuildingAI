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
}

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
    ): Promise<OpencodeSession> {
        const normalized = this.normalizeConfig(config);
        const response = await this.request(normalized, "/session", {
            method: "POST",
            body: JSON.stringify({ title: title?.slice(0, 120) || "Bowi AI conversation" }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw HttpErrorFactory.badRequest(
                `OpenCode create session failed: ${response.status} ${text}`,
            );
        }
        return (await response.json()) as OpencodeSession;
    }

    async promptAsync(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId: string;
        /** @deprecated Prefer `parts` when attachments are present */
        text?: string;
        /** OpenCode prompt parts (text + optional FilePartInput for images) */
        parts?: Array<Record<string, unknown>>;
        system?: string;
        model?: { providerID: string; modelID: string };
    }): Promise<void> {
        const normalized = this.normalizeConfig(params.config);
        const parts =
            params.parts && params.parts.length > 0
                ? params.parts
                : [{ type: "text", text: params.text ?? "" }];
        const body: Record<string, unknown> = { parts };
        if (params.system?.trim()) {
            body.system = params.system.trim();
        }
        const model = params.model ?? normalized.model;
        if (model?.providerID && model?.modelID) {
            body.model = model;
        }

        const response = await this.request(
            normalized,
            `/session/${encodeURIComponent(params.sessionId)}/prompt_async`,
            {
                method: "POST",
                body: JSON.stringify(body),
            },
        );
        if (!response.ok && response.status !== 204) {
            const text = await response.text();
            throw HttpErrorFactory.badRequest(
                `OpenCode prompt_async failed: ${response.status} ${text}`,
            );
        }
    }

    /**
     * List pending permission prompts (`GET /permission`).
     * Headless serve has no TUI — BuildingAI must reply or the turn hangs.
     */
    async listPendingPermissions(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId?: string;
    }): Promise<Array<{ id: string; sessionID: string }>> {
        const normalized = this.normalizeConfig(params.config);
        const response = await this.request(normalized, "/permission", { method: "GET" });
        if (!response.ok) {
            const text = await response.text();
            this.logger.warn(`OpenCode list permissions failed: ${response.status} ${text}`);
            return [];
        }
        const body = (await response.json()) as unknown;
        if (!Array.isArray(body)) return [];
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
    }): Promise<void> {
        const normalized = this.normalizeConfig(params.config);
        const reply = params.reply ?? "always";
        const response = await this.request(
            normalized,
            `/permission/${encodeURIComponent(params.requestId)}/reply`,
            {
                method: "POST",
                body: JSON.stringify({ reply }),
            },
        );
        if (!response.ok && response.status !== 204) {
            const text = await response.text();
            this.logger.warn(`OpenCode permission reply failed: ${response.status} ${text}`);
        }
    }

    /**
     * Auto-approve every pending permission for a session (headless YOLO).
     */
    async approvePendingPermissions(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId: string;
    }): Promise<number> {
        const pending = await this.listPendingPermissions({
            config: params.config,
            sessionId: params.sessionId,
        });
        for (const item of pending) {
            await this.replyPermission({
                config: params.config,
                requestId: item.id,
                reply: "always",
            });
        }
        return pending.length;
    }

    async abortSession(params: {
        config?: ThirdPartyIntegrationConfig | null;
        sessionId: string;
    }): Promise<void> {
        const normalized = this.normalizeConfig(params.config);
        const response = await this.request(
            normalized,
            `/session/${encodeURIComponent(params.sessionId)}/abort`,
            { method: "POST" },
        );
        if (!response.ok && response.status !== 204) {
            const text = await response.text();
            this.logger.warn(`OpenCode abort failed: ${response.status} ${text}`);
        }
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
