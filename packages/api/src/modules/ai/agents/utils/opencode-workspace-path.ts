import path from "node:path";

/** Directory/file basenames to hide from the workspace tree UI. */
export const WORKSPACE_NOISE_BASENAMES = new Set([
    "node_modules",
    ".git",
    ".DS_Store",
    "dist",
    "coverage",
    ".pnpm-store",
    ".turbo",
]);

export type WorkspaceEntryType = "file" | "directory";

export type WorkspaceEntry = {
    name: string;
    path: string;
    type: WorkspaceEntryType;
    ignored?: boolean;
};

/**
 * Normalize a client-requested path into a relative path under workspace (no leading slash).
 * Rejects traversal outside the workspace root.
 */
export function resolveSafeWorkspaceRelativePath(params: {
    workspace: string;
    requestPath: string;
}): string {
    const workspace = path.resolve(params.workspace);
    const raw = String(params.requestPath ?? "").trim();
    if (raw.includes("\0")) {
        throw new Error("Invalid workspace path");
    }

    const relativeInput =
        raw === "" || raw === "." || raw === "/"
            ? "."
            : raw.replace(/^\/+/, "").replace(/\/+$/, "");
    if (relativeInput === ".") {
        return "";
    }

    const absolute = path.resolve(workspace, relativeInput);
    if (absolute !== workspace && !absolute.startsWith(workspace + path.sep)) {
        throw new Error("Path escapes workspace");
    }

    const relative = path.relative(workspace, absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error("Path escapes workspace");
    }

    return relative.split(path.sep).join("/");
}

/**
 * Path query value for OpenCode `GET /file?path=`.
 */
export function toOpenCodeListPath(requestPath: string): string {
    const trimmed = String(requestPath ?? "").trim();
    if (!trimmed || trimmed === "." || trimmed === "/") {
        return ".";
    }
    return trimmed.replace(/^\/+/, "");
}

/**
 * Drop OpenCode-ignored entries, known noise basenames, and dotfiles/dotdirs.
 */
export function filterWorkspaceEntries<T extends WorkspaceEntry>(entries: T[]): T[] {
    return entries.filter((entry) => {
        if (entry.ignored) return false;
        const base = entry.name || path.basename(entry.path);
        if (!base || base.startsWith(".")) return false;
        if (WORKSPACE_NOISE_BASENAMES.has(base)) return false;
        return true;
    });
}
