/**
 * Abort an agent chat stream when no activity arrives for a configured idle window.
 */

export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 90_000;

export type ToolConfigWithStreamIdle = {
    streamIdleTimeoutMs?: number;
    toolTimeout?: number;
    maxResultChars?: number;
    requireApproval?: boolean;
};

export function resolveStreamIdleTimeoutMs(
    toolConfig: ToolConfigWithStreamIdle | null | undefined,
    fallbackMs: number = DEFAULT_STREAM_IDLE_TIMEOUT_MS,
): number {
    const configured = Number(toolConfig?.streamIdleTimeoutMs);
    if (!Number.isFinite(configured)) return fallbackMs;
    if (configured < 0) return fallbackMs;
    return Math.floor(configured);
}

export type StreamIdleWatchdog = {
    signal: AbortSignal;
    touch: () => void;
    dispose: () => void;
    wrapReadableStream: <T>(source: ReadableStream<T>) => ReadableStream<T>;
};

/**
 * Creates an AbortSignal that fires after `timeoutMs` of inactivity.
 * Call `touch()` (or pull from a wrapped stream) to reset the timer.
 * `timeoutMs <= 0` disables the idle abort (signal never aborts from idle).
 */
export function createStreamIdleWatchdog(options: {
    timeoutMs: number;
    parentSignal?: AbortSignal;
}): StreamIdleWatchdog {
    const { timeoutMs, parentSignal } = options;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const abortFromParent = () => {
        if (!controller.signal.aborted) {
            controller.abort(parentSignal?.reason ?? new DOMException("Aborted", "AbortError"));
        }
    };

    if (parentSignal) {
        if (parentSignal.aborted) {
            abortFromParent();
        } else {
            parentSignal.addEventListener("abort", abortFromParent, { once: true });
        }
    }

    const clearTimer = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    const touch = () => {
        if (disposed || timeoutMs <= 0 || controller.signal.aborted) return;
        clearTimer();
        timer = setTimeout(() => {
            if (disposed || controller.signal.aborted) return;
            controller.abort(
                new DOMException(
                    `Agent chat stream stalled: no activity for ${timeoutMs}ms`,
                    "TimeoutError",
                ),
            );
        }, timeoutMs);
    };

    const dispose = () => {
        disposed = true;
        clearTimer();
        if (parentSignal) {
            parentSignal.removeEventListener("abort", abortFromParent);
        }
    };

    const wrapReadableStream = <T>(source: ReadableStream<T>): ReadableStream<T> => {
        return source.pipeThrough(
            new TransformStream<T, T>({
                transform(chunk, ctl) {
                    touch();
                    ctl.enqueue(chunk);
                },
                flush() {
                    dispose();
                },
            }),
        );
    };

    return {
        signal: controller.signal,
        touch,
        dispose,
        wrapReadableStream,
    };
}
