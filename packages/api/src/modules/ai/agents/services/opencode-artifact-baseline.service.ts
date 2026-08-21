import { Injectable } from "@nestjs/common";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

export type OpencodeArtifactBaseline = {
    version: 1;
    files: Array<{ path: string; size: number; mtimeMs: number }>;
};

@Injectable()
export class OpencodeArtifactBaselineService {
    async capture(artifactRoot: string): Promise<OpencodeArtifactBaseline> {
        const root = path.resolve(artifactRoot);
        const files: OpencodeArtifactBaseline["files"] = [];
        await this.walk(root, root, files);
        files.sort((left, right) => left.path.localeCompare(right.path));
        return { version: 1, files };
    }

    async changedHtmlFiles(
        artifactRoot: string,
        baseline: OpencodeArtifactBaseline,
    ): Promise<string[]> {
        this.assertBaseline(baseline);
        const current = await this.capture(artifactRoot);
        const previous = new Map(baseline.files.map((file) => [file.path, file]));
        return current.files
            .filter((file) => /\.html?$/i.test(file.path))
            .filter((file) => {
                const before = previous.get(file.path);
                return (
                    !before || before.size !== file.size || before.mtimeMs !== file.mtimeMs
                );
            })
            .map((file) => file.path);
    }

    private async walk(
        root: string,
        current: string,
        files: OpencodeArtifactBaseline["files"],
    ): Promise<void> {
        let entries;
        try {
            entries = await readdir(current, { withFileTypes: true });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
            throw error;
        }

        for (const entry of entries) {
            if (entry.isSymbolicLink()) continue;
            const absolute = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await this.walk(root, absolute, files);
                continue;
            }
            if (!entry.isFile()) continue;
            const stat = await lstat(absolute);
            if (!stat.isFile()) continue;
            files.push({
                path: path.relative(root, absolute).split(path.sep).join("/"),
                size: stat.size,
                mtimeMs: stat.mtimeMs,
            });
        }
    }

    private assertBaseline(value: OpencodeArtifactBaseline): void {
        if (value?.version !== 1 || !Array.isArray(value.files)) {
            throw new Error("Invalid OpenCode artifact baseline");
        }
        for (const file of value.files) {
            if (
                !file ||
                typeof file.path !== "string" ||
                !file.path ||
                path.isAbsolute(file.path) ||
                file.path.split("/").includes("..") ||
                !Number.isFinite(file.size) ||
                !Number.isFinite(file.mtimeMs)
            ) {
                throw new Error("Invalid OpenCode artifact baseline entry");
            }
        }
    }
}
