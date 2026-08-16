import path from "node:path";

import {
    WORKSPACE_NOISE_BASENAMES,
    filterWorkspaceEntries,
    resolveSafeWorkspaceRelativePath,
    toOpenCodeListPath,
} from "./opencode-workspace-path";

describe("opencode-workspace-path", () => {
    const workspace = "/home/opencodework";

    it("resolves empty and . to workspace-relative empty path for OpenCode list", () => {
        expect(toOpenCodeListPath("")).toBe(".");
        expect(toOpenCodeListPath(".")).toBe(".");
        expect(toOpenCodeListPath("/")).toBe(".");
    });

    it("normalizes relative paths without escaping workspace", () => {
        expect(resolveSafeWorkspaceRelativePath({ workspace, requestPath: "src/app" })).toBe(
            "src/app",
        );
        expect(resolveSafeWorkspaceRelativePath({ workspace, requestPath: "./packages/api" })).toBe(
            "packages/api",
        );
    });

    it("rejects path traversal outside workspace", () => {
        expect(() =>
            resolveSafeWorkspaceRelativePath({ workspace, requestPath: "../secret" }),
        ).toThrow(/escapes workspace/);
        expect(() =>
            resolveSafeWorkspaceRelativePath({
                workspace,
                requestPath: "src/../../etc/passwd",
            }),
        ).toThrow(/escapes workspace/);
    });

    it("rejects null bytes", () => {
        expect(() =>
            resolveSafeWorkspaceRelativePath({ workspace, requestPath: "src/\0evil" }),
        ).toThrow(/Invalid/);
    });

    it("filters ignored, noise, and dotfile basenames", () => {
        const entries = [
            { name: "src", path: "src", type: "directory" as const, ignored: false },
            { name: "node_modules", path: "node_modules", type: "directory" as const, ignored: false },
            { name: ".git", path: ".git", type: "directory" as const, ignored: false },
            { name: ".opencode", path: ".opencode", type: "directory" as const, ignored: false },
            { name: ".env", path: ".env", type: "file" as const, ignored: false },
            { name: "secret.env", path: "secret.env", type: "file" as const, ignored: true },
            { name: "README.md", path: "README.md", type: "file" as const, ignored: false },
            { name: "dist", path: "dist", type: "directory" as const, ignored: false },
        ];
        const filtered = filterWorkspaceEntries(entries);
        expect(filtered.map((e) => e.name)).toEqual(["src", "README.md"]);
        expect(WORKSPACE_NOISE_BASENAMES.has("node_modules")).toBe(true);
        expect(path.basename("/x/node_modules")).toBe("node_modules");
    });
});
