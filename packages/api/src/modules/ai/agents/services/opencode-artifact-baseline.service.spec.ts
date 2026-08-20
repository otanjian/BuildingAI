jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { OpencodeArtifactBaselineService } from "./opencode-artifact-baseline.service";

describe("OpencodeArtifactBaselineService", () => {
    const roots: string[] = [];

    afterEach(async () => {
        await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
    });

    it("captures a deterministic compact relative-path/stat baseline", async () => {
        const parent = await mkdtemp(path.join(tmpdir(), "opencode-baseline-"));
        roots.push(parent);
        const root = path.join(parent, "artifacts");
        await mkdir(path.join(root, "nested"), { recursive: true });
        await writeFile(path.join(root, "z.html"), "z");
        await writeFile(path.join(root, "nested", "a.html"), "alpha");
        await symlink(path.join(root, "z.html"), path.join(root, "ignored-link.html"));

        const baseline = await new OpencodeArtifactBaselineService().capture(root);

        expect(baseline.version).toBe(1);
        expect(baseline.files.map((file) => file.path)).toEqual(["nested/a.html", "z.html"]);
        expect(baseline.files[0]).toEqual({
            path: "nested/a.html",
            size: 5,
            mtimeMs: expect.any(Number),
        });
    });

    it("returns an empty baseline when the artifact root does not exist", async () => {
        const parent = await mkdtemp(path.join(tmpdir(), "opencode-baseline-"));
        roots.push(parent);

        await expect(
            new OpencodeArtifactBaselineService().capture(path.join(parent, "missing")),
        ).resolves.toEqual({ version: 1, files: [] });
    });
});
