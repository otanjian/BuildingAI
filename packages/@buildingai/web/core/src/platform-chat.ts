import { STORAGE_KEYS } from "@buildingai/constants/web";

export const EXTENSION_OPEN_CHAT_MESSAGE_TYPE = "extension-open-chat" as const;
export const EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE = "extension-show-chat-panel" as const;

/** Platform route for iframe-embedded standard chat (must not match `/chat/:id`). */
export const PLATFORM_EMBED_CHAT_PATH = "/embed/chat";

export type InspectionRulePayload = {
    dataItem: string;
    method: string;
};

export type PendingChatRequest = {
    prompt: string;
    /** When set, sends each prompt in order after the previous assistant reply completes. */
    promptQueue?: string[];
    /** Preferred for MRP inspection: platform builds one prompt per rule. */
    inspectionRules?: InspectionRulePayload[];
    /** Delay before the first prompt is sent (milliseconds). */
    initialDelayMs?: number;
    modelId?: string;
    mcpServerIds?: string[];
};

const BUNDLED_INSPECTION_PROMPT_PREFIX = "请按以下数据治理规则";

export function buildInspectionRulePrompt(rule: InspectionRulePayload): string {
    return `请检查：${rule.dataItem}\n规则：${rule.method}`;
}

/** Resolve sequential prompts; prefers inspectionRules over legacy bundled promptQueue. */
export function resolveInspectionPromptQueue(request: PendingChatRequest): string[] {
    const fromRules = Array.isArray(request.inspectionRules)
        ? request.inspectionRules
              .filter(
                  (rule) =>
                      rule &&
                      typeof rule.dataItem === "string" &&
                      typeof rule.method === "string" &&
                      rule.dataItem.trim() &&
                      rule.method.trim(),
              )
              .map((rule) =>
                  buildInspectionRulePrompt({
                      dataItem: rule.dataItem.trim(),
                      method: rule.method.trim(),
                  }),
              )
        : [];

    if (fromRules.length > 0) {
        return fromRules;
    }

    const fromQueue = Array.isArray(request.promptQueue)
        ? request.promptQueue.map((item) => String(item).trim()).filter(Boolean)
        : [];

    if (fromQueue.length > 0 && !fromQueue[0]!.startsWith(BUNDLED_INSPECTION_PROMPT_PREFIX)) {
        return fromQueue;
    }

    const prompt = request.prompt?.trim();
    if (prompt && !prompt.startsWith(BUNDLED_INSPECTION_PROMPT_PREFIX)) {
        return [prompt];
    }

    return [];
}

export type ExtensionOpenChatMessage = PendingChatRequest & {
    type: typeof EXTENSION_OPEN_CHAT_MESSAGE_TYPE;
};

export type ExtensionShowChatPanelMessage = {
    type: typeof EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE;
};

export function isExtensionShowChatPanelMessage(
    data: unknown,
): data is ExtensionShowChatPanelMessage {
    if (!data || typeof data !== "object") {
        return false;
    }
    return (data as Record<string, unknown>).type === EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE;
}

export function isExtensionOpenChatMessage(data: unknown): data is ExtensionOpenChatMessage {
    if (!data || typeof data !== "object") {
        return false;
    }
    const record = data as Record<string, unknown>;
    return (
        record.type === EXTENSION_OPEN_CHAT_MESSAGE_TYPE &&
        typeof record.prompt === "string" &&
        record.prompt.trim().length > 0
    );
}

export function savePendingChatRequest(request: PendingChatRequest): void {
    if (typeof sessionStorage === "undefined") {
        return;
    }
    sessionStorage.setItem(STORAGE_KEYS.PENDING_CHAT_REQUEST, JSON.stringify(request));
}

export function peekPendingChatRequest(): PendingChatRequest | null {
    if (typeof sessionStorage === "undefined") {
        return null;
    }
    const raw = sessionStorage.getItem(STORAGE_KEYS.PENDING_CHAT_REQUEST);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as PendingChatRequest;
        if (typeof parsed.prompt !== "string" || !parsed.prompt.trim()) {
            return null;
        }
        return normalizePendingChatRequest(parsed);
    } catch {
        return null;
    }
}

function normalizePendingChatRequest(parsed: PendingChatRequest): PendingChatRequest | null {
    if (typeof parsed.prompt !== "string" || !parsed.prompt.trim()) {
        return null;
    }
    const prompt = parsed.prompt.trim();
    const promptQueue = Array.isArray(parsed.promptQueue)
        ? parsed.promptQueue.map((item) => String(item).trim()).filter(Boolean)
        : undefined;
    const inspectionRules = Array.isArray(parsed.inspectionRules)
        ? parsed.inspectionRules
              .map((rule) => {
                  if (!rule || typeof rule !== "object") {
                      return null;
                  }
                  const record = rule as InspectionRulePayload;
                  if (
                      typeof record.dataItem !== "string" ||
                      typeof record.method !== "string" ||
                      !record.dataItem.trim() ||
                      !record.method.trim()
                  ) {
                      return null;
                  }
                  return {
                      dataItem: record.dataItem.trim(),
                      method: record.method.trim(),
                  };
              })
              .filter((rule): rule is InspectionRulePayload => rule != null)
        : undefined;
    const initialDelayMs =
        typeof parsed.initialDelayMs === "number" && parsed.initialDelayMs >= 0
            ? parsed.initialDelayMs
            : undefined;

    const normalized: PendingChatRequest = {
        prompt,
        promptQueue: promptQueue?.length ? promptQueue : undefined,
        inspectionRules: inspectionRules?.length ? inspectionRules : undefined,
        initialDelayMs,
        modelId: typeof parsed.modelId === "string" ? parsed.modelId : undefined,
        mcpServerIds: Array.isArray(parsed.mcpServerIds)
            ? parsed.mcpServerIds.filter((id): id is string => typeof id === "string")
            : undefined,
    };

    const resolvedQueue = resolveInspectionPromptQueue(normalized);
    if (resolvedQueue.length > 0) {
        normalized.prompt = resolvedQueue[0]!;
        normalized.promptQueue = resolvedQueue;
    }

    return normalized;
}

export function clearPendingChatRequest(): void {
    if (typeof sessionStorage === "undefined") {
        return;
    }
    sessionStorage.removeItem(STORAGE_KEYS.PENDING_CHAT_REQUEST);
}

export function consumePendingChatRequest(): PendingChatRequest | null {
    if (typeof sessionStorage === "undefined") {
        return null;
    }
    const raw = sessionStorage.getItem(STORAGE_KEYS.PENDING_CHAT_REQUEST);
    if (!raw) {
        return null;
    }
    sessionStorage.removeItem(STORAGE_KEYS.PENDING_CHAT_REQUEST);
    try {
        const parsed = JSON.parse(raw) as PendingChatRequest;
        if (typeof parsed.prompt !== "string" || !parsed.prompt.trim()) {
            return null;
        }
        return normalizePendingChatRequest(parsed);
    } catch {
        return null;
    }
}

/**
 * Open the platform standard chat from an extension (iframe) or same-origin page.
 */
export function buildEmbedChatSearchParams(request: PendingChatRequest): string {
    const params = new URLSearchParams();
    params.set("prompt", request.prompt);
    if (request.modelId) {
        params.set("modelId", request.modelId);
    }
    if (request.mcpServerIds?.length) {
        params.set("mcp", request.mcpServerIds.join(","));
    }
    return params.toString();
}

export function parseEmbedChatSearchParams(
    search: string | URLSearchParams,
): PendingChatRequest | null {
    const params = typeof search === "string" ? new URLSearchParams(search) : search;
    const prompt = params.get("prompt");
    if (!prompt?.trim()) {
        return null;
    }
    const mcpRaw = params.get("mcp");
    return {
        prompt: prompt.trim(),
        modelId: params.get("modelId") ?? undefined,
        mcpServerIds: mcpRaw
            ? mcpRaw.split(",").map((id) => id.trim()).filter(Boolean)
            : undefined,
    };
}

function postMessageToHost(message: ExtensionOpenChatMessage | ExtensionShowChatPanelMessage): boolean {
    const host = window.top ?? window.parent;
    if (!host || host === window) {
        return false;
    }
    const targets = new Set<string>(["*"]);
    if (document.referrer) {
        try {
            targets.add(new URL(document.referrer).origin);
        } catch {
            /* ignore */
        }
    }
    for (const target of targets) {
        host.postMessage(message, target);
    }
    return true;
}

export function showPlatformChatPanel(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    if (postMessageToHost({ type: EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE })) {
        return true;
    }

    window.dispatchEvent(new CustomEvent(EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE));
    return true;
}

export function openPlatformChat(request: PendingChatRequest): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    const message: ExtensionOpenChatMessage = {
        type: EXTENSION_OPEN_CHAT_MESSAGE_TYPE,
        ...request,
    };

    if (postMessageToHost(message)) {
        return true;
    }

    savePendingChatRequest(request);
    window.location.assign("/embed/chat?" + buildEmbedChatSearchParams(request));
    return true;
}
