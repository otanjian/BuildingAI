import type { SensitiveWordConfig } from "@buildingai/types/ai/agent-config.interface";

import { createSensitiveWordFilter, SensitiveWordFilter } from "./sensitive-word-filter";

type MessageChunk = Record<string, any>;
type PartKind = "text" | "reasoning";

interface PartState {
    key: string;
    kind: PartKind;
    id: string;
    stream: ReturnType<SensitiveWordFilter["createStream"]> | null;
    latestDelta: MessageChunk | null;
}

const OPEN_PART_LIMIT = 32;
const STREAM_INVALID_ERROR = "Assistant response stream is invalid.";
const BOUNDARY_TYPES = new Set(["start", "start-step", "finish-step", "finish", "abort", "error"]);
const TERMINAL_TYPES = new Set(["finish", "abort", "error"]);

function partKind(type: unknown): PartKind | null {
    if (type === "text-start" || type === "text-delta" || type === "text-end") return "text";
    if (type === "reasoning-start" || type === "reasoning-delta" || type === "reasoning-end") {
        return "reasoning";
    }
    return null;
}

function partAction(type: unknown): "start" | "delta" | "end" | null {
    if (type === "text-start" || type === "reasoning-start") return "start";
    if (type === "text-delta" || type === "reasoning-delta") return "delta";
    if (type === "text-end" || type === "reasoning-end") return "end";
    return null;
}

function partKey(kind: PartKind, id: string): string {
    return `${kind}:${id}`;
}

function usablePartId(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function filterDisplayChunk(chunk: MessageChunk, filter: SensitiveWordFilter): MessageChunk {
    if (chunk.type === "error" && typeof chunk.errorText === "string") {
        return { ...chunk, errorText: filter.filterText(chunk.errorText) };
    }
    if (
        chunk.type === "data-follow-up-suggestions" &&
        Array.isArray(chunk.data) &&
        chunk.data.every((value: unknown) => typeof value === "string")
    ) {
        return { ...chunk, data: chunk.data.map((value: string) => filter.filterText(value)) };
    }
    if (
        (chunk.type === "data-custom-reply" || chunk.type === "data-annotation-reply") &&
        chunk.data &&
        typeof chunk.data === "object" &&
        typeof chunk.data.text === "string"
    ) {
        return { ...chunk, data: { ...chunk.data, text: filter.filterText(chunk.data.text) } };
    }
    return chunk;
}

function createProjector(
    filter: SensitiveWordFilter,
    applyToReasoning: boolean,
    enqueue: (chunk: MessageChunk) => void,
) {
    const states = new Map<string, PartState>();
    let terminal = false;

    const emitStateDelta = (state: PartState, delta: string) => {
        if (!delta) return;
        const base = state.latestDelta ?? {};
        enqueue({ ...base, type: `${state.kind}-delta`, id: state.id, delta });
    };

    const closeState = (state: PartState, explicitEnd?: MessageChunk) => {
        for (const delta of state.stream?.flush() ?? []) emitStateDelta(state, delta);
        enqueue(explicitEnd ?? { type: `${state.kind}-end`, id: state.id });
        states.delete(state.key);
    };

    const closeAll = () => {
        for (const state of [...states.values()]) closeState(state);
    };

    const terminateInvalid = () => {
        closeAll();
        enqueue({ type: "error", errorText: STREAM_INVALID_ERROR });
        terminal = true;
    };

    const openState = (kind: PartKind, id: string, startChunk: MessageChunk): PartState | null => {
        const key = partKey(kind, id);
        const existing = states.get(key);
        if (existing) closeState(existing);
        if (states.size >= OPEN_PART_LIMIT) {
            terminateInvalid();
            return null;
        }
        const shouldFilter = kind === "text" || applyToReasoning;
        const state: PartState = {
            key,
            kind,
            id,
            stream: shouldFilter ? filter.createStream() : null,
            latestDelta: null,
        };
        states.set(key, state);
        enqueue(startChunk);
        return state;
    };

    return {
        write(chunk: MessageChunk) {
            if (terminal || !chunk || typeof chunk !== "object") return;
            const type = chunk.type;
            const kind = partKind(type);
            const action = partAction(type);

            if (kind && action) {
                if (!usablePartId(chunk.id)) {
                    if (action === "end") return;
                    terminateInvalid();
                    return;
                }
                const key = partKey(kind, chunk.id);

                if (action === "start") {
                    openState(kind, chunk.id, chunk);
                    return;
                }
                if (action === "end") {
                    const state = states.get(key);
                    if (!state) return;
                    closeState(state, chunk);
                    return;
                }

                let state = states.get(key);
                if (!state) {
                    state = openState(kind, chunk.id, { type: `${kind}-start`, id: chunk.id });
                    if (!state) return;
                }
                state.latestDelta = chunk;
                if (!state.stream) {
                    enqueue(chunk);
                    return;
                }
                for (const delta of state.stream.push(typeof chunk.delta === "string" ? chunk.delta : "")) {
                    emitStateDelta(state, delta);
                }
                return;
            }

            if (BOUNDARY_TYPES.has(type)) closeAll();
            if (type === "error" && typeof chunk.errorText !== "string") {
                enqueue({ type: "error", errorText: STREAM_INVALID_ERROR });
                terminal = true;
                return;
            }
            enqueue(filterDisplayChunk(chunk, filter));
            if (TERMINAL_TYPES.has(type)) terminal = true;
        },
        flush() {
            if (!terminal) closeAll();
        },
    };
}

export function createSensitiveWordTransformStream<Chunk extends MessageChunk = MessageChunk>(
    config: SensitiveWordConfig | null | undefined,
): TransformStream<Chunk, Chunk> {
    const filter = createSensitiveWordFilter(config);
    return createSensitiveWordTransformStreamFromFilter(
        filter,
        filter.policy.applyToReasoning,
    );
}

export function createSensitiveWordTransformStreamFromFilter(
    filter: SensitiveWordFilter,
    applyToReasoning?: boolean,
): TransformStream<any, any>;
export function createSensitiveWordTransformStreamFromFilter<Chunk extends MessageChunk>(
    filter: SensitiveWordFilter,
    applyToReasoning = true,
): TransformStream<Chunk, Chunk> {
    return new TransformStream<Chunk, Chunk>({
        start(controller) {
            const projector = createProjector(filter, applyToReasoning, (chunk) =>
                controller.enqueue(chunk as Chunk),
            );
            (this as { projector?: typeof projector }).projector = projector;
        },
        transform(chunk) {
            (this as { projector: ReturnType<typeof createProjector> }).projector.write(chunk);
        },
        flush() {
            (this as { projector: ReturnType<typeof createProjector> }).projector.flush();
        },
    });
}
