import type { SensitiveWordConfig } from "@buildingai/types/ai/agent-config.interface";

import { createSensitiveWordFilter, SensitiveWordFilter } from "./sensitive-word-filter";

/**
 * Thin adapters that apply a `SensitiveWordFilter` to AI SDK UI message streams.
 *
 * - `createSensitiveWordWriter`: wraps a `writer.write`-style function. Used by
 *   the third-party providers (opencode / coze / dify) which emit chunks via
 *   `writer.write`.
 * - `createSensitiveWordTransformStream`: a `TransformStream` used by the direct
 *   (ToolLoop) path, which merges an external UI message stream via
 *   `writer.merge(...)` (merge bypasses `writer.write`, so a transform is needed).
 *
 * Both adapters share the streaming filter instance; the held-back tail is
 * flushed right before `text-end` so the live stream ends with the same text as
 * the batch-filtered persisted message.
 *
 * A `*FromFilter` variant is provided for callers that already hold a filter
 * instance (needed for batch-filtering persisted parts with the same automaton).
 */

type WritePart = Record<string, any>;
type WriterLike = { write: (part: WritePart) => void };

export interface SensitiveWordWriter {
    write: (part: WritePart) => void;
    /** Flush any held-back text as a `text-delta` immediately. */
    flush: () => void;
}

function shouldFilterPart(type: string | undefined, applyToReasoning: boolean): boolean {
    if (type === "text-delta") return true;
    if (type === "reasoning-delta") return applyToReasoning;
    return false;
}

/** Wrap a write-style writer; disabled filters return a passthrough writer. */
export function createSensitiveWordWriter(
    writer: WriterLike,
    config: SensitiveWordConfig | null | undefined,
): SensitiveWordWriter {
    return createSensitiveWordWriterFromFilter(
        writer,
        createSensitiveWordFilter(config),
        config?.applyToReasoning !== false,
    );
}

export function createSensitiveWordWriterFromFilter(
    writer: WriterLike,
    filter: SensitiveWordFilter,
    applyToReasoning = true,
): SensitiveWordWriter {
    if (!filter.enabled) {
        return {
            write: (part) => writer.write(part),
            flush: () => {},
        };
    }
    const stream = filter.createStream();
    let lastTextId = "txt-0";

    const emitHeldBack = () => {
        const rest = stream.flush();
        for (const delta of rest) {
            writer.write({ type: "text-delta", id: lastTextId, delta });
        }
    };

    return {
        write(part) {
            const type = part?.type;
            if (shouldFilterPart(type, applyToReasoning)) {
                if (type === "text-delta" && typeof part.id === "string") {
                    lastTextId = part.id;
                }
                const deltas = stream.push(typeof part.delta === "string" ? part.delta : "");
                for (const delta of deltas) {
                    writer.write({ ...part, delta });
                }
                return;
            }
            if (type === "text-end") {
                emitHeldBack();
                writer.write(part);
                return;
            }
            writer.write(part);
        },
        flush: emitHeldBack,
    };
}

/** TransformStream variant for the direct (ToolLoop) path. */
export function createSensitiveWordTransformStream(
    config: SensitiveWordConfig | null | undefined,
): TransformStream<any, any> {
    return createSensitiveWordTransformStreamFromFilter(
        createSensitiveWordFilter(config),
        config?.applyToReasoning !== false,
    );
}

export function createSensitiveWordTransformStreamFromFilter(
    filter: SensitiveWordFilter,
    applyToReasoning = true,
): TransformStream<any, any> {
    if (!filter.enabled) {
        return new TransformStream<any, any>({
            transform: (chunk, controller) => controller.enqueue(chunk),
        });
    }
    const stream = filter.createStream();
    let lastTextId = "txt-0";

    return new TransformStream<any, any>({
        transform(chunk, controller) {
            const type = chunk?.type;
            if (shouldFilterPart(type, applyToReasoning)) {
                if (type === "text-delta" && typeof chunk.id === "string") {
                    lastTextId = chunk.id;
                }
                const deltas = stream.push(typeof chunk.delta === "string" ? chunk.delta : "");
                for (const delta of deltas) {
                    controller.enqueue({ ...chunk, delta });
                }
                return;
            }
            if (type === "text-end") {
                const rest = stream.flush();
                for (const delta of rest) {
                    controller.enqueue({
                        type: "text-delta",
                        id: typeof chunk.id === "string" ? chunk.id : lastTextId,
                        delta,
                    });
                }
                controller.enqueue(chunk);
                return;
            }
            controller.enqueue(chunk);
        },
        flush(controller) {
            const rest = stream.flush();
            for (const delta of rest) {
                controller.enqueue({ type: "text-delta", id: lastTextId, delta });
            }
        },
    });
}
