import path from "node:path";

export const DEFAULT_OPENCODE_WORKSPACE = "/home/opencodework";
export const DEFAULT_ARTIFACT_DIR_TEMPLATE = "artifacts/{conversationId}";

/**
 * Resolve the conversation-scoped artifact root under a fixed workspace (L2 isolation).
 */
export function resolveArtifactRoot(params: {
    workspace: string;
    conversationId: string;
    artifactDirTemplate?: string;
}): string {
    const workspace = path.resolve(params.workspace);
    const template = params.artifactDirTemplate?.trim() || DEFAULT_ARTIFACT_DIR_TEMPLATE;
    const relative = template.replaceAll("{conversationId}", params.conversationId);
    const root = path.resolve(workspace, relative);

    if (root !== workspace && !root.startsWith(workspace + path.sep)) {
        throw new Error("Artifact root escapes workspace");
    }

    return root;
}

/**
 * Resolve a safe absolute file path inside an artifact root. Rejects traversal.
 */
export function resolveSafeArtifactFilePath(params: {
    artifactRoot: string;
    relativePath: string;
}): string {
    const root = path.resolve(params.artifactRoot);
    const normalizedRelative = params.relativePath.replace(/^\/+/, "");
    if (!normalizedRelative || normalizedRelative.includes("\0")) {
        throw new Error("Invalid artifact path");
    }

    const absolute = path.resolve(root, normalizedRelative);
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
        throw new Error("Artifact path escapes artifact root");
    }

    return absolute;
}

/**
 * Detect whether a workspace-relative or absolute file path belongs to a conversation artifact dir
 * and looks like an HTML entry candidate.
 */
export function isHtmlArtifactPath(filePath: string, artifactRoot: string): boolean {
    const root = path.resolve(artifactRoot);
    const absolute = path.resolve(filePath);
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
        return false;
    }
    return absolute.toLowerCase().endsWith(".html") || absolute.toLowerCase().endsWith(".htm");
}

/**
 * Prefer index.html under artifact root; otherwise return null (caller may scan).
 */
export function preferredHtmlEntryRelativePath(): string {
    return "index.html";
}
