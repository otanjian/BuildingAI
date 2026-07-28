import {
    createStreamIdleWatchdog,
    DEFAULT_STREAM_IDLE_TIMEOUT_MS,
    resolveStreamIdleTimeoutMs,
} from "./stream-idle-watchdog";

describe("resolveStreamIdleTimeoutMs", () => {
    it("defaults when unset", () => {
        expect(resolveStreamIdleTimeoutMs(undefined)).toBe(DEFAULT_STREAM_IDLE_TIMEOUT_MS);
        expect(resolveStreamIdleTimeoutMs({})).toBe(DEFAULT_STREAM_IDLE_TIMEOUT_MS);
    });

    it("allows disabling with 0", () => {
        expect(resolveStreamIdleTimeoutMs({ streamIdleTimeoutMs: 0 })).toBe(0);
    });

    it("uses configured positive value", () => {
        expect(resolveStreamIdleTimeoutMs({ streamIdleTimeoutMs: 120000 })).toBe(120000);
    });

    it("falls back on invalid values", () => {
        expect(resolveStreamIdleTimeoutMs({ streamIdleTimeoutMs: -1 })).toBe(
            DEFAULT_STREAM_IDLE_TIMEOUT_MS,
        );
        expect(resolveStreamIdleTimeoutMs({ streamIdleTimeoutMs: Number.NaN })).toBe(
            DEFAULT_STREAM_IDLE_TIMEOUT_MS,
        );
    });
});

describe("createStreamIdleWatchdog", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("aborts after idle timeout without touch", () => {
        const watchdog = createStreamIdleWatchdog({ timeoutMs: 1000 });
        watchdog.touch();
        expect(watchdog.signal.aborted).toBe(false);
        jest.advanceTimersByTime(999);
        expect(watchdog.signal.aborted).toBe(false);
        jest.advanceTimersByTime(2);
        expect(watchdog.signal.aborted).toBe(true);
        expect(String(watchdog.signal.reason)).toMatch(/stalled/i);
        watchdog.dispose();
    });

    it("resets timer on touch", () => {
        const watchdog = createStreamIdleWatchdog({ timeoutMs: 1000 });
        watchdog.touch();
        jest.advanceTimersByTime(800);
        watchdog.touch();
        jest.advanceTimersByTime(800);
        expect(watchdog.signal.aborted).toBe(false);
        jest.advanceTimersByTime(300);
        expect(watchdog.signal.aborted).toBe(true);
        watchdog.dispose();
    });

    it("does not idle-abort when timeoutMs is 0", () => {
        const watchdog = createStreamIdleWatchdog({ timeoutMs: 0 });
        watchdog.touch();
        jest.advanceTimersByTime(60_000);
        expect(watchdog.signal.aborted).toBe(false);
        watchdog.dispose();
    });

    it("aborts when parent signal aborts", () => {
        const parent = new AbortController();
        const watchdog = createStreamIdleWatchdog({
            timeoutMs: 60_000,
            parentSignal: parent.signal,
        });
        parent.abort(new Error("client disconnect"));
        expect(watchdog.signal.aborted).toBe(true);
        watchdog.dispose();
    });

    it("touches while reading wrapped readable stream", async () => {
        const watchdog = createStreamIdleWatchdog({ timeoutMs: 1000 });

        const source = new ReadableStream<number>({
            start(controller) {
                controller.enqueue(1);
                setTimeout(() => controller.enqueue(2), 800);
                setTimeout(() => {
                    controller.enqueue(3);
                    controller.close();
                }, 1600);
            },
        });

        const collected: number[] = [];
        const reader = watchdog.wrapReadableStream(source).getReader();
        const pump = (async () => {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                collected.push(value as number);
            }
        })();

        await Promise.resolve();
        jest.advanceTimersByTime(800);
        await Promise.resolve();
        jest.advanceTimersByTime(800);
        await pump;

        expect(collected).toEqual([1, 2, 3]);
        expect(watchdog.signal.aborted).toBe(false);
    });
});
