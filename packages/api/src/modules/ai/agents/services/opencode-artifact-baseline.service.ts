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
}
