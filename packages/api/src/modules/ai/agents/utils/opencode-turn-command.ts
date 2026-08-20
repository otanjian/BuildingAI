import { createHash } from "node:crypto";
import path from "node:path";

export type OpencodeTurnOwner =
    | { type: "user"; id: string }
    | { type: "anonymous"; id: string };

export type OpencodeTurnCommandPart =
    | { type: "text"; text: string }
    | {
          type: "file";
          mediaType: string;
          url: string;
          filename?: string;
      };

export type OpencodeTurnCommand = {
    agentId: string;
    conversationId: string;
    owner: OpencodeTurnOwner;
    message: {
        role: "user";
        parts: OpencodeTurnCommandPart[];
    };
    formVariables?: Record<string, string>;
    formFieldsInputs?: Record<string, unknown>;
    isDebug: boolean;
};

export type OpencodeDispatchPromptPart =
    | { type: "text"; text: string }
    | { type: "file"; mime: string; url: string; filename?: string };

export type OpencodeDispatchSnapshot = {
    promptParts: OpencodeDispatchPromptPart[];
    system: string;
    model?: { providerID: string; modelID: string };
    artifactRoot: string;
    billing: { enabled: boolean; power: number; tokens: number };
    isDebug: boolean;
    formVariables: Record<string, string>;
    formFieldsInputs: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const REDACTED = "[REDACTED]";
const REDACTED_KEY_PATTERN =
    /(?:artifactbaseline|authorization|cookie|credential|instruction|password|prompt|secret|snapshot|system|token)/i;

export class OpencodeTurnCommandError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OpencodeTurnCommandError";
    }
}

function stableJsonValue(value: unknown, seen = new WeakSet<object>()): unknown {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new OpencodeTurnCommandError("Command values must be finite JSON numbers");
        }
        return value;
    }
    if (typeof value === "undefined") return undefined;
    if (Array.isArray(value)) {
        return value.map((item) => stableJsonValue(item, seen));
    }
    if (typeof value !== "object") {
        throw new OpencodeTurnCommandError("Command values must be JSON serializable");
    }
    if (seen.has(value)) {
        throw new OpencodeTurnCommandError("Command values must not contain cycles");
    }
    seen.add(value);
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
        const normalized = stableJsonValue((value as Record<string, unknown>)[key], seen);
        if (normalized !== undefined) output[key] = normalized;
    }
    seen.delete(value);
    return output;
}

export function stableJsonStringify(value: unknown): string {
    return JSON.stringify(stableJsonValue(value));
}

function sha256(value: unknown): string {
    return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function nonEmpty(value: unknown, field: string): string {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
        throw new OpencodeTurnCommandError(`${field} is required`);
    }
    return normalized;
}

function canonicalAttachmentUrl(value: unknown): string {
    const raw = nonEmpty(value, "Attachment URL");
    if (raw.startsWith("data:") || raw.startsWith("blob:")) {
        throw new OpencodeTurnCommandError(
            "OpenCode commands require a persisted attachment reference, not browser data",
        );
    }
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        throw new OpencodeTurnCommandError("Attachment URL must be an absolute persisted reference");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new OpencodeTurnCommandError("Attachment URL scheme is not supported");
    }
    if (parsed.username || parsed.password) {
        throw new OpencodeTurnCommandError("Attachment references must not contain credentials");
    }
    const sensitiveQueryKey = [...parsed.searchParams.keys()].find((key) =>
        /(?:authorization|credential|password|secret|signature|token)/i.test(key),
    );
    if (sensitiveQueryKey) {
        throw new OpencodeTurnCommandError(
            `Attachment reference contains a credential query parameter: ${sensitiveQueryKey}`,
        );
    }
    return parsed.toString();
}

function canonicalObject(
    value: unknown,
    field: string,
): Record<string, unknown> {
    if (value === undefined || value === null) return {};
    if (typeof value !== "object" || Array.isArray(value)) {
        throw new OpencodeTurnCommandError(`${field} must be an object`);
    }
    return stableJsonValue(value) as Record<string, unknown>;
}

function canonicalStringObject(value: unknown, field: string): Record<string, string> {
    const output = canonicalObject(value, field);
    if (Object.values(output).some((item) => typeof item !== "string")) {
        throw new OpencodeTurnCommandError(`${field} values must be strings`);
    }
    return output as Record<string, string>;
}

function canonicalArtifactRoot(workspaceValue: unknown, artifactRootValue: unknown): string {
    const workspace = path.resolve(nonEmpty(workspaceValue, "OpenCode workspace"));
    const artifactRoot = path.resolve(nonEmpty(artifactRootValue, "OpenCode artifact root"));
    const relativeArtifactRoot = path.relative(workspace, artifactRoot);
    if (
        relativeArtifactRoot === "" ||
        relativeArtifactRoot === ".." ||
        relativeArtifactRoot.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativeArtifactRoot)
    ) {
        throw new OpencodeTurnCommandError(
            "OpenCode artifact root must be a conversation directory inside the workspace",
        );
    }
    return artifactRoot;
}

export function canonicalizeOpencodeTurnCommand(input: unknown): OpencodeTurnCommand {
    if (!input || typeof input !== "object") {
        throw new OpencodeTurnCommandError("OpenCode turn command is required");
    }
    const raw = input as Record<string, any>;
    if (raw.message?.role !== "user") {
        throw new OpencodeTurnCommandError("OpenCode turn command must contain one current user message");
    }
    if (!Array.isArray(raw.message.parts)) {
        throw new OpencodeTurnCommandError("OpenCode turn command message parts are required");
    }

    const parts: OpencodeTurnCommandPart[] = raw.message.parts.map((part: any) => {
        if (part?.type === "text" && typeof part.text === "string" && part.text.trim()) {
            return { type: "text", text: part.text };
        }
        if (part?.type === "file") {
            const mediaType = nonEmpty(part.mediaType, "Attachment media type");
            if (!mediaType.startsWith("image/")) {
                throw new OpencodeTurnCommandError(
                    `Unsupported OpenCode attachment media type: ${mediaType}`,
                );
            }
            const attachment: OpencodeTurnCommandPart = {
                type: "file",
                mediaType,
                url: canonicalAttachmentUrl(part.url),
            };
            if (typeof part.filename === "string" && part.filename.trim()) {
                attachment.filename = part.filename.trim();
            }
            return attachment;
        }
        throw new OpencodeTurnCommandError(
            `Unsupported OpenCode command part: ${String(part?.type ?? "unknown")}`,
        );
    });

    if (parts.length === 0) {
        throw new OpencodeTurnCommandError("OpenCode turn command cannot be empty");
    }

    const ownerType = raw.owner?.type;
    if (ownerType !== "user" && ownerType !== "anonymous") {
        throw new OpencodeTurnCommandError("OpenCode turn owner type is invalid");
    }

    return {
        agentId: nonEmpty(raw.agentId, "agentId"),
        conversationId: nonEmpty(raw.conversationId, "conversationId"),
        owner: { type: ownerType, id: nonEmpty(raw.owner.id, "owner.id") },
        message: { role: "user", parts },
        formVariables: canonicalStringObject(raw.formVariables, "formVariables"),
        formFieldsInputs: canonicalObject(raw.formFieldsInputs, "formFieldsInputs"),
        isDebug: raw.isDebug === true,
    };
}

export function hashOpencodeTurnCommand(input: unknown): string {
    return sha256(canonicalizeOpencodeTurnCommand(input));
}

function normalizeBaseUrl(value: unknown): string {
    const url = new URL(nonEmpty(value, "OpenCode baseURL"));
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new OpencodeTurnCommandError("OpenCode baseURL must use http or https");
    }
    url.username = "";
    url.password = "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
        if (REDACTED_KEY_PATTERN.test(key) || /apikey|signature/i.test(key)) {
            url.searchParams.delete(key);
        }
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().replace(/\/$/, "");
}

export function hashOpencodeRuntime(input: unknown): string {
    if (!input || typeof input !== "object") {
        throw new OpencodeTurnCommandError("OpenCode runtime configuration is required");
    }
    const runtime = input as Record<string, unknown>;
    return sha256({
        baseURL: normalizeBaseUrl(runtime.baseURL),
        workspace: path.resolve(nonEmpty(runtime.workspace, "OpenCode workspace")),
    });
}

function canonicalPromptParts(
    value: unknown,
    resolvedAttachmentUrls: ReadonlySet<string>,
): OpencodeDispatchPromptPart[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw new OpencodeTurnCommandError("OpenCode dispatch prompt cannot be empty");
    }
    return value.map((part: any) => {
        if (part?.type === "text" && typeof part.text === "string" && part.text.trim()) {
            return { type: "text", text: part.text };
        }
        if (part?.type === "file") {
            const url = canonicalAttachmentUrl(part.url);
            if (!resolvedAttachmentUrls.has(url)) {
                throw new OpencodeTurnCommandError(
                    "OpenCode snapshot requires a persisted, authorized attachment reference",
                );
            }
            const mime = nonEmpty(part.mime, "Attachment MIME type");
            if (!mime.startsWith("image/")) {
                throw new OpencodeTurnCommandError(
                    `Unsupported OpenCode attachment MIME type: ${mime}`,
                );
            }
            if (mime !== part.mime) {
                throw new OpencodeTurnCommandError("Attachment MIME type is not canonical");
            }
            const file: OpencodeDispatchPromptPart = {
                type: "file",
                mime,
                url,
            };
            if (typeof part.filename === "string" && part.filename.trim()) {
                file.filename = part.filename.trim();
            }
            return file;
        }
        throw new OpencodeTurnCommandError("Unsupported OpenCode dispatch prompt part");
    });
}

export function buildOpencodeDispatchSnapshot(input: Record<string, any>): OpencodeDispatchSnapshot {
    const command = canonicalizeOpencodeTurnCommand(input.command);
    const workspace = input.workspace ?? input.runtime?.workspace;
    const artifactRoot = canonicalArtifactRoot(workspace, input.artifactRoot);

    const billing = input.billing ?? {};
    const power = Number(billing.power ?? 0);
    const tokens = Number(billing.tokens ?? 0);
    if (!Number.isFinite(power) || power < 0 || !Number.isFinite(tokens) || tokens <= 0) {
        throw new OpencodeTurnCommandError("OpenCode billing snapshot is invalid");
    }

    const resolvedAttachmentUrls = new Set(
        (Array.isArray(input.resolvedAttachmentUrls) ? input.resolvedAttachmentUrls : []).map(
            canonicalAttachmentUrl,
        ),
    );
    const snapshot: OpencodeDispatchSnapshot = {
        promptParts: canonicalPromptParts(input.promptParts, resolvedAttachmentUrls),
        system: typeof input.system === "string" ? input.system : "",
        artifactRoot,
        billing: { enabled: billing.enabled === true, power, tokens },
        isDebug: command.isDebug,
        formVariables: command.formVariables ?? {},
        formFieldsInputs: command.formFieldsInputs ?? {},
    };
    if (input.model?.providerID && input.model?.modelID) {
        snapshot.model = {
            providerID: nonEmpty(input.model.providerID, "OpenCode model provider"),
            modelID: nonEmpty(input.model.modelID, "OpenCode model ID"),
        };
    }
    return snapshot;
}

export function validateOpencodeDispatchSnapshot(
    input: unknown,
    workspace: unknown,
): OpencodeDispatchSnapshot {
    if (!isRecord(input)) {
        throw new OpencodeTurnCommandError("OpenCode dispatch snapshot is required");
    }

    const rawParts = input.promptParts;
    if (!Array.isArray(rawParts) || rawParts.length === 0) {
        throw new OpencodeTurnCommandError("OpenCode dispatch prompt cannot be empty");
    }
    const promptParts: OpencodeDispatchPromptPart[] = [];
    for (const part of rawParts) {
        if (!isRecord(part)) {
            throw new OpencodeTurnCommandError("Unsupported OpenCode dispatch prompt part");
        }
        if (part.type === "text") {
            nonEmpty(part.text, "OpenCode dispatch prompt text");
            promptParts.push({ type: "text", text: part.text as string });
            continue;
        }
        if (part.type === "file") {
            const mime = nonEmpty(part.mime, "Attachment MIME type");
            if (!mime.startsWith("image/")) {
                throw new OpencodeTurnCommandError(
                    `Unsupported OpenCode attachment MIME type: ${mime}`,
                );
            }
            const url = nonEmpty(part.url, "Attachment URL");
            if (canonicalAttachmentUrl(url) !== url) {
                throw new OpencodeTurnCommandError("Attachment URL is not canonical");
            }
            if (
                part.filename !== undefined &&
                (typeof part.filename !== "string" ||
                    !part.filename.trim() ||
                    part.filename !== part.filename.trim())
            ) {
                throw new OpencodeTurnCommandError("Attachment filename is invalid");
            }
            promptParts.push({
                type: "file",
                mime,
                url,
                ...(part.filename === undefined ? {} : { filename: part.filename as string }),
            });
            continue;
        }
        throw new OpencodeTurnCommandError("Unsupported OpenCode dispatch prompt part");
    }
    if (typeof input.system !== "string") {
        throw new OpencodeTurnCommandError("OpenCode dispatch system prompt is invalid");
    }

    if (!isRecord(input.billing)) {
        throw new OpencodeTurnCommandError("OpenCode billing snapshot is invalid");
    }
    const power = input.billing.power;
    const tokens = input.billing.tokens;
    if (
        typeof input.billing.enabled !== "boolean" ||
        typeof power !== "number" ||
        !Number.isFinite(power) ||
        power < 0 ||
        typeof tokens !== "number" ||
        !Number.isFinite(tokens) ||
        tokens <= 0
    ) {
        throw new OpencodeTurnCommandError("OpenCode billing snapshot is invalid");
    }
    if (typeof input.isDebug !== "boolean") {
        throw new OpencodeTurnCommandError("OpenCode debug snapshot is invalid");
    }

    const artifactRoot = nonEmpty(input.artifactRoot, "OpenCode artifact root");
    if (canonicalArtifactRoot(workspace, artifactRoot) !== artifactRoot) {
        throw new OpencodeTurnCommandError("OpenCode artifact root is not canonical");
    }
    if (!isRecord(input.formVariables) || !isRecord(input.formFieldsInputs)) {
        throw new OpencodeTurnCommandError("OpenCode form snapshot is invalid");
    }
    const formVariables = canonicalStringObject(input.formVariables, "formVariables");
    const formFieldsInputs = canonicalObject(input.formFieldsInputs, "formFieldsInputs");
    let model: OpencodeDispatchSnapshot["model"];
    if (input.model !== undefined) {
        if (!isRecord(input.model)) {
            throw new OpencodeTurnCommandError("OpenCode model snapshot is invalid");
        }
        const providerID = nonEmpty(input.model.providerID, "OpenCode model provider");
        const modelID = nonEmpty(input.model.modelID, "OpenCode model ID");
        if (providerID !== input.model.providerID || modelID !== input.model.modelID) {
            throw new OpencodeTurnCommandError("OpenCode model snapshot is not canonical");
        }
        model = { providerID, modelID };
    }
    const canonical: OpencodeDispatchSnapshot = {
        promptParts,
        system: input.system,
        artifactRoot,
        billing: { enabled: input.billing.enabled, power, tokens },
        isDebug: input.isDebug,
        formVariables,
        formFieldsInputs,
        ...(model ? { model } : {}),
    };
    if (stableJsonStringify(canonical) !== stableJsonStringify(input)) {
        throw new OpencodeTurnCommandError("OpenCode dispatch snapshot is not canonical");
    }
    return canonical;
}

export function redactOpencodeTurnLogData(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(redactOpencodeTurnLogData);
    }
    if (typeof value === "string") {
        try {
            const parsed = new URL(value);
            if (
                parsed.username ||
                parsed.password ||
                [...parsed.searchParams.keys()].some(
                    (key) => REDACTED_KEY_PATTERN.test(key) || /apikey|signature/i.test(key),
                )
            ) {
                return REDACTED;
            }
        } catch {
            // Non-URL strings are safe unless their containing key is sensitive.
        }
        return value;
    }
    if (!value || typeof value !== "object") {
        return value;
    }
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
        output[key] = REDACTED_KEY_PATTERN.test(normalizedKey) || /apikey|signature/i.test(normalizedKey)
            ? REDACTED
            : redactOpencodeTurnLogData(child);
    }
    return output;
}
