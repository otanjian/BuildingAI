import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type OpencodeWorkspaceEntryType = "file" | "directory";

export type OpencodeWorkspaceEntry = {
    name: string;
    path: string;
    type: OpencodeWorkspaceEntryType;
    ignored?: boolean;
};

export type OpencodeWorkspaceListResult = {
    path: string;
    entries: OpencodeWorkspaceEntry[];
};

export type OpencodeWorkspaceFileContent = {
    path: string;
    content: string;
    encoding?: string;
};

export async function listOpencodeWorkspaceFiles(
    agentId: string,
    path = ".",
): Promise<OpencodeWorkspaceListResult> {
    return apiHttpClient.get<OpencodeWorkspaceListResult>(
        `/ai-agents/${agentId}/opencode/workspace/files`,
        { params: { path } },
    );
}

export async function getOpencodeWorkspaceFileContent(
    agentId: string,
    path: string,
): Promise<OpencodeWorkspaceFileContent> {
    return apiHttpClient.get<OpencodeWorkspaceFileContent>(
        `/ai-agents/${agentId}/opencode/workspace/files/content`,
        { params: { path } },
    );
}

export function useOpencodeWorkspaceFilesQuery(
    agentId: string | undefined,
    path: string,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ["opencode-workspace-files", agentId, path],
        queryFn: () => listOpencodeWorkspaceFiles(agentId!, path),
        enabled: Boolean(agentId) && (options?.enabled ?? true),
        staleTime: 30_000,
    });
}

export function useOpencodeWorkspaceFileContentQuery(
    agentId: string | undefined,
    path: string | null,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ["opencode-workspace-file-content", agentId, path],
        queryFn: () => getOpencodeWorkspaceFileContent(agentId!, path!),
        enabled: Boolean(agentId && path) && (options?.enabled ?? true),
        staleTime: 30_000,
    });
}
