import { OpencodeTurnRunnerService } from "./opencode-turn-runner.service";

describe("OpencodeTurnRunnerService", () => {
    it("starts one turn and reports running", () => {
        const runner = new OpencodeTurnRunnerService();
        const handle = runner.start("c1");
        expect(runner.isRunning("c1")).toBe(true);
        expect(handle.signal.aborted).toBe(false);
        runner.complete("c1");
        expect(runner.isRunning("c1")).toBe(false);
    });

    it("rejects a second overlapping start", () => {
        const runner = new OpencodeTurnRunnerService();
        runner.start("c1");
        expect(() => runner.start("c1")).toThrow(/already running/);
        runner.complete("c1");
    });

    it("cancel aborts the signal", () => {
        const runner = new OpencodeTurnRunnerService();
        const handle = runner.start("c1");
        expect(runner.cancel("c1")).toBe(true);
        expect(handle.signal.aborted).toBe(true);
        runner.complete("c1");
    });

    it("keepAlive retains a promise until settled", async () => {
        const runner = new OpencodeTurnRunnerService();
        let resolve!: () => void;
        const pending = new Promise<void>((r) => {
            resolve = r;
        });
        const tracked = runner.keepAlive(pending);
        resolve();
        await tracked;
        expect(true).toBe(true);
    });
});
