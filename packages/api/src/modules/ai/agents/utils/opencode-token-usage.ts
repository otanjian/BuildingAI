import type { ChatMessageUsage } from "@buildingai/types";

export type OpencodeTokenSnapshot = {
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
    total?: number;
    cost?: number;
};

function asNonNegNumber(value: unknown): number {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
}

/**
 * Normalize OpenCode `tokens` (+ optional cost) into a snapshot.
 */
export function normalizeOpencodeTokens(
    tokens: unknown,
    cost?: unknown,
): OpencodeTokenSnapshot | undefined {
    if (!tokens || typeof tokens !== "object") return undefined;
    const record = tokens as Record<string, unknown>;
    const cache =
        record.cache && typeof record.cache === "object"
            ? (record.cache as Record<string, unknown>)
            : {};

    const snapshot: OpencodeTokenSnapshot = {
        input: asNonNegNumber(record.input),
        output: asNonNegNumber(record.output),
        reasoning: asNonNegNumber(record.reasoning),
        cacheRead: asNonNegNumber(cache.read),
        cacheWrite: asNonNegNumber(cache.write),
    };

    if (record.total !== undefined && record.total !== null) {
        snapshot.total = asNonNegNumber(record.total);
    }

    if (cost !== undefined && cost !== null) {
        const costNum = typeof cost === "number" ? cost : Number(cost);
        if (Number.isFinite(costNum)) {
            snapshot.cost = costNum;
        }
    }

    return snapshot;
}

function hasPositiveTokens(snapshot: OpencodeTokenSnapshot): boolean {
    return (
        snapshot.input > 0 ||
        snapshot.output > 0 ||
        snapshot.reasoning > 0 ||
        snapshot.cacheRead > 0 ||
        snapshot.cacheWrite > 0 ||
        (snapshot.total !== undefined && snapshot.total > 0)
    );
}

function sumSnapshots(snapshots: Iterable<OpencodeTokenSnapshot>): OpencodeTokenSnapshot {
    let input = 0;
    let output = 0;
    let reasoning = 0;
    let cacheRead = 0;
    let cacheWrite = 0;
    let cost = 0;
    let total = 0;
    let allHaveTotal = true;
    let count = 0;

    for (const snapshot of snapshots) {
        count += 1;
        input += snapshot.input;
        output += snapshot.output;
        reasoning += snapshot.reasoning;
        cacheRead += snapshot.cacheRead;
        cacheWrite += snapshot.cacheWrite;
        cost += snapshot.cost ?? 0;
        if (typeof snapshot.total === "number" && Number.isFinite(snapshot.total)) {
            total += snapshot.total;
        } else {
            allHaveTotal = false;
        }
    }

    const summed: OpencodeTokenSnapshot = {
        input,
        output,
        reasoning,
        cacheRead,
        cacheWrite,
    };

    if (count > 0 && cost !== 0) {
        summed.cost = cost;
    }

    if (count > 0 && allHaveTotal) {
        summed.total = total;
    } else {
        summed.total = input + output + reasoning + cacheRead;
    }

    return summed;
}

/**
 * Map aggregated OpenCode tokens into platform ChatMessageUsage.
 */
export function toChatMessageUsage(
    snapshot: OpencodeTokenSnapshot,
    extras?: { perMessage?: Record<string, OpencodeTokenSnapshot>; source?: string },
): ChatMessageUsage {
    const textTokens = snapshot.output;
    const reasoningTokens = snapshot.reasoning;
    const inputTokens = snapshot.input;
    const outputTokens = textTokens + reasoningTokens;
    const totalTokens =
        typeof snapshot.total === "number" && Number.isFinite(snapshot.total)
            ? snapshot.total
            : inputTokens + outputTokens + snapshot.cacheRead;

    return {
        inputTokens,
        outputTokens,
        totalTokens,
        inputTokenDetails: {
            noCacheTokens: inputTokens,
            cacheReadTokens: snapshot.cacheRead,
            cacheWriteTokens: snapshot.cacheWrite,
        },
        outputTokenDetails: {
            textTokens,
            reasoningTokens,
        },
        reasoningTokens,
        cachedInputTokens: snapshot.cacheRead,
        raw: {
            opencode: {
                source: extras?.source ?? "message.updated",
                costSum: snapshot.cost ?? 0,
                ...(extras?.perMessage ? { perMessage: extras.perMessage } : {}),
            },
        },
    };
}

/**
 * Accumulates OpenCode token reports for one Bowi AI chat turn.
 * Primary source: assistant `message.updated` (latest tokens per message id).
 * Fallback: `step-finish` parts when message-level tokens stay empty.
 */
export class OpencodeTokenUsageAccumulator {
    private readonly byMessageId = new Map<string, OpencodeTokenSnapshot>();
    private readonly stepFinishByPartId = new Map<string, OpencodeTokenSnapshot>();

    observeMessageUpdated(info: unknown): void {
        if (!info || typeof info !== "object") return;
        const record = info as Record<string, unknown>;
        if (String(record.role ?? "") !== "assistant") return;
        const id = typeof record.id === "string" ? record.id : String(record.id ?? "");
        if (!id) return;

        const snapshot = normalizeOpencodeTokens(record.tokens, record.cost);
        if (!snapshot) return;
        this.byMessageId.set(id, snapshot);
    }

    observeStepFinishPart(part: unknown): void {
        if (!part || typeof part !== "object") return;
        const record = part as Record<string, unknown>;
        if (String(record.type ?? "") !== "step-finish") return;
        const partId = typeof record.id === "string" ? record.id : String(record.id ?? "");
        if (!partId) return;

        const snapshot = normalizeOpencodeTokens(record.tokens, record.cost);
        if (!snapshot) return;
        this.stepFinishByPartId.set(partId, snapshot);
    }

    finalize(): ChatMessageUsage {
        const messageSnapshots = Array.from(this.byMessageId.entries());
        const messageSum = sumSnapshots(this.byMessageId.values());
        if (messageSnapshots.some(([, snap]) => hasPositiveTokens(snap))) {
            const perMessage = Object.fromEntries(messageSnapshots);
            return toChatMessageUsage(messageSum, {
                perMessage,
                source: "message.updated",
            });
        }

        const stepSum = sumSnapshots(this.stepFinishByPartId.values());
        if ([...this.stepFinishByPartId.values()].some(hasPositiveTokens)) {
            return toChatMessageUsage(stepSum, { source: "step-finish" });
        }

        return toChatMessageUsage(messageSum, { source: "message.updated" });
    }
}
