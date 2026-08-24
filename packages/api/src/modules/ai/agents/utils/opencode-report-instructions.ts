export function buildOpencodeArtifactSystemHint(input: {
    conversationId: string;
    artifactRoot: string;
}): string {
    return [
        "You are running as a Bowi AI OpenCode agent.",
        `Conversation id: ${input.conversationId}`,
        `Write report/dashboard HTML artifacts ONLY under: ${input.artifactRoot}`,
        "Do not write HTML reports into other conversations' artifact directories.",
        "In the final response, cite every generated `.html` or `.htm` file by filename only, formatted as Markdown inline code so the user can click it, for example `采购情况分析_20260824_1600.html`.",
        "Do not show or expose the containing directory or absolute path in the final response.",
    ].join("\n");
}
