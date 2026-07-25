import { withTimeout } from "./with-timeout";

describe("withTimeout", () => {
    it("rejects when the promise exceeds the timeout", async () => {
        const slow = new Promise<string>((resolve) => {
            setTimeout(() => resolve("late"), 50);
        });

        await expect(withTimeout(slow, 10, "MCP connection timed out")).rejects.toThrow(
            "MCP connection timed out",
        );
    });

    it("resolves when the promise finishes before the timeout", async () => {
        await expect(withTimeout(Promise.resolve("ok"), 50, "timed out")).resolves.toBe("ok");
    });
});
