import path from "node:path";

import {
    isHtmlArtifactPath,
    resolveArtifactRoot,
    resolveSafeArtifactFilePath,
} from "./opencode-artifact-path";

describe("opencode-artifact-path", () => {
    const workspace = "/home/opencodework";
    const conversationId = "11111111-1111-4111-8111-111111111111";

    it("resolves L2 artifact root per conversation", () => {
        const root = resolveArtifactRoot({ workspace, conversationId });
        expect(root).toBe(path.join(workspace, "artifacts", conversationId));
    });

    it("rejects artifact template that escapes workspace", () => {
        expect(() =>
            resolveArtifactRoot({
                workspace,
                conversationId,
                artifactDirTemplate: "../../etc/{conversationId}",
            }),
        ).toThrow(/escapes workspace/);
    });

    it("resolves safe relative paths inside artifact root", () => {
        const root = resolveArtifactRoot({ workspace, conversationId });
        const file = resolveSafeArtifactFilePath({
            artifactRoot: root,
            relativePath: "dashboard/index.html",
        });
        expect(file).toBe(path.join(root, "dashboard", "index.html"));
    });

    it("rejects path traversal outside artifact root", () => {
        const root = resolveArtifactRoot({ workspace, conversationId });
        expect(() =>
            resolveSafeArtifactFilePath({
                artifactRoot: root,
                relativePath: "../other/secret.html",
            }),
        ).toThrow(/escapes artifact root/);
    });

    it("isolates conversations by artifact root membership", () => {
        const rootA = resolveArtifactRoot({ workspace, conversationId });
        const rootB = resolveArtifactRoot({
            workspace,
            conversationId: "22222222-2222-4222-8222-222222222222",
        });
        const fileInB = path.join(rootB, "index.html");
        expect(isHtmlArtifactPath(fileInB, rootA)).toBe(false);
        expect(isHtmlArtifactPath(fileInB, rootB)).toBe(true);
    });
});
