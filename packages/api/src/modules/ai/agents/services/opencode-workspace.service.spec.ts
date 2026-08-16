import { HttpErrorFactory } from "@buildingai/errors";

import {
    filterWorkspaceEntries,
    resolveSafeWorkspaceRelativePath,
    toOpenCodeListPath,
} from "../utils/opencode-workspace-path";

describe("OpencodeWorkspaceService path pipeline", () => {
    const workspace = "/home/opencodework";

    it("maps client path through safe resolve + OpenCode list path", () => {
        const relative = resolveSafeWorkspaceRelativePath({
            workspace,
            requestPath: "packages/api",
        });
        expect(relative).toBe("packages/api");
        expect(toOpenCodeListPath(relative)).toBe("packages/api");
        expect(toOpenCodeListPath(resolveSafeWorkspaceRelativePath({ workspace, requestPath: "" }) || ".")).toBe(
            ".",
        );
    });

    it("rejects escape before any OpenCode call would happen", () => {
        expect(() =>
            resolveSafeWorkspaceRelativePath({ workspace, requestPath: "../../etc" }),
        ).toThrow(/escapes workspace/);
    });

    it("filters ignored and noise before returning to client", () => {
        const filtered = filterWorkspaceEntries([
            { name: "app", path: "app", type: "directory", ignored: false },
            { name: "node_modules", path: "node_modules", type: "directory", ignored: false },
            { name: "tmp", path: "tmp", type: "directory", ignored: true },
        ]);
        expect(filtered).toEqual([{ name: "app", path: "app", type: "directory", ignored: false }]);
    });
});
