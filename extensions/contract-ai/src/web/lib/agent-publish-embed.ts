/** Platform WebAPP publish chat URL for iframe embed (same as console → Publish → embed code). */
export function buildAgentPublishEmbedUrl(agentId: string, accessToken: string): string {
    const origin =
        typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : "";
    const token = encodeURIComponent(accessToken.trim());
    return `${origin}/agents/${agentId}/${token}`;
}

export function isPublishEmbedReady(
    publishConfig: { enableSite?: boolean; accessToken?: string | null } | null | undefined,
): boolean {
    return Boolean(
        publishConfig?.enableSite &&
            publishConfig.accessToken &&
            String(publishConfig.accessToken).trim(),
    );
}
