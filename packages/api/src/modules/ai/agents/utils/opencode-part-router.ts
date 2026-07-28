/**
 * Routes OpenCode assistant parts into AI SDK UI stream chunks.
 * OpenCode deltas use field "text" for both answer and reasoning — distinction is part.type / partID.
 */

export type OpencodePartKind = "text" | "reasoning" | "tool";

export type UiStreamChunk = {
    type: string;
    id?: string;
    delta?: string;
    [key: string]: unknown;
};

export type PersistedReasoningPart = {
    type: "reasoning";
    text: string;
    state: "done";
};

type PartUpdatedInput = {
    id: string;
    type: string;
    text?: string;
    messageID?: string;
    time?: { start?: number; end?: number };
};

/**
 * Stateful mapper: OpenCode part events → UIMessageStream reasoning/text chunks.
 */
export class OpencodeAssistantPartRouter {
    readonly textId: string;
    textStarted = false;
    fullText = "";

    private readonly partTypes = new Map<string, OpencodePartKind>();
    private readonly textSeen = new Map<string, string>();
    private readonly reasoningSeen = new Map<string, string>();
    private readonly reasoningStarted = new Set<string>();
    private readonly reasoningEnded = new Set<string>();
    private readonly reasoningOrder: string[] = [];
    private readonly reasoningText = new Map<string, string>();
    private readonly pendingDeltas = new Map<string, string[]>();

    constructor(textId = "txt-0") {
        this.textId = textId;
    }

    registerPartType(partId: string, kind: OpencodePartKind): UiStreamChunk[] {
        if (!partId) return [];
        this.partTypes.set(partId, kind);
        if (kind === "reasoning" && !this.reasoningOrder.includes(partId)) {
            this.reasoningOrder.push(partId);
        }
        return this.flushPending(partId);
    }

    onDelta(params: {
        messageRole?: string;
        partID: string;
        field: unknown;
        delta: unknown;
    }): UiStreamChunk[] {
        if (params.messageRole !== "assistant") return [];
        if (params.field !== "text") return [];
        if (typeof params.delta !== "string" || !params.delta) return [];
        const partID = String(params.partID ?? "");
        if (!partID) return [];

        const kind = this.partTypes.get(partID);
        if (!kind) {
            const queue = this.pendingDeltas.get(partID) ?? [];
            queue.push(params.delta);
            this.pendingDeltas.set(partID, queue);
            return [];
        }
        if (kind === "tool") return [];
        return this.emitDelta(partID, kind, params.delta);
    }

    onTextOrReasoningUpdated(params: {
        messageRole?: string;
        part: PartUpdatedInput;
    }): UiStreamChunk[] {
        const { part, messageRole } = params;
        if (part.type !== "text" && part.type !== "reasoning") return [];
        if (messageRole !== "assistant") return [];

        const partId = String(part.id ?? "");
        if (!partId) return [];

        const kind = part.type as "text" | "reasoning";
        const chunks = this.registerPartType(partId, kind);

        if (typeof part.text === "string") {
            chunks.push(...this.emitSnapshot(partId, kind, part.text));
        }

        if (kind === "reasoning" && part.time?.end) {
            chunks.push(...this.endReasoning(partId));
        }

        return chunks;
    }

    endOpenReasoning(): UiStreamChunk[] {
        const chunks: UiStreamChunk[] = [];
        for (const partId of this.reasoningOrder) {
            chunks.push(...this.endReasoning(partId));
        }
        return chunks;
    }

    ensureTextClosed(): UiStreamChunk[] {
        const chunks: UiStreamChunk[] = [];
        if (!this.textStarted) {
            chunks.push({ type: "text-start", id: this.textId });
            this.textStarted = true;
        }
        chunks.push({ type: "text-end", id: this.textId });
        return chunks;
    }

    appendErrorText(errorLine: string): UiStreamChunk[] {
        const chunks: UiStreamChunk[] = [];
        if (!this.textStarted) {
            chunks.push({ type: "text-start", id: this.textId });
            this.textStarted = true;
        }
        const delta = this.fullText ? `\n\n${errorLine}` : errorLine;
        this.fullText += delta;
        chunks.push({ type: "text-delta", id: this.textId, delta });
        return chunks;
    }

    getPersistedReasoningParts(): PersistedReasoningPart[] {
        return this.reasoningOrder
            .map((id) => this.reasoningText.get(id) ?? "")
            .filter((text) => text.length > 0)
            .map((text) => ({ type: "reasoning" as const, text, state: "done" as const }));
    }

    private flushPending(partId: string): UiStreamChunk[] {
        const kind = this.partTypes.get(partId);
        const queued = this.pendingDeltas.get(partId);
        if (!kind || !queued?.length || kind === "tool") {
            this.pendingDeltas.delete(partId);
            return [];
        }
        this.pendingDeltas.delete(partId);
        const chunks: UiStreamChunk[] = [];
        for (const delta of queued) {
            chunks.push(...this.emitDelta(partId, kind, delta));
        }
        return chunks;
    }

    private emitDelta(
        partId: string,
        kind: "text" | "reasoning",
        delta: string,
    ): UiStreamChunk[] {
        if (kind === "reasoning") {
            return this.emitReasoningDelta(partId, delta);
        }
        return this.emitTextDelta(partId, delta);
    }

    private emitSnapshot(
        partId: string,
        kind: "text" | "reasoning",
        text: string,
    ): UiStreamChunk[] {
        const seen = kind === "reasoning" ? this.reasoningSeen : this.textSeen;
        const previous = seen.get(partId) ?? "";
        if (text.startsWith(previous) && text.length > previous.length) {
            const delta = text.slice(previous.length);
            seen.set(partId, text);
            if (kind === "text" && this.fullText.endsWith(delta)) {
                return [];
            }
            if (kind === "reasoning") {
                const current = this.reasoningText.get(partId) ?? "";
                if (current.endsWith(delta)) {
                    return [];
                }
            }
            return this.emitDelta(partId, kind, delta);
        }
        seen.set(partId, text);
        return [];
    }

    private emitTextDelta(_partId: string, delta: string): UiStreamChunk[] {
        const chunks: UiStreamChunk[] = [];
        if (!this.textStarted) {
            chunks.push({ type: "text-start", id: this.textId });
            this.textStarted = true;
        }
        this.fullText += delta;
        chunks.push({ type: "text-delta", id: this.textId, delta });
        return chunks;
    }

    private emitReasoningDelta(partId: string, delta: string): UiStreamChunk[] {
        const chunks: UiStreamChunk[] = [];
        if (!this.reasoningStarted.has(partId)) {
            this.reasoningStarted.add(partId);
            if (!this.reasoningOrder.includes(partId)) {
                this.reasoningOrder.push(partId);
            }
            chunks.push({ type: "reasoning-start", id: partId });
        }
        this.reasoningText.set(partId, (this.reasoningText.get(partId) ?? "") + delta);
        chunks.push({ type: "reasoning-delta", id: partId, delta });
        return chunks;
    }

    private endReasoning(partId: string): UiStreamChunk[] {
        if (!this.reasoningStarted.has(partId) || this.reasoningEnded.has(partId)) {
            return [];
        }
        this.reasoningEnded.add(partId);
        return [{ type: "reasoning-end", id: partId }];
    }
}
