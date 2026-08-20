export type OpencodePersonalParams = Record<string, unknown>;

export function buildOpencodePersonalParamsSection(
    personalParams?: OpencodePersonalParams | null,
): string | undefined {
    if (!personalParams) return undefined;

    const lines: string[] = [];
    for (const [rawKey, rawValue] of Object.entries(personalParams)) {
        const key = rawKey.trim();
        if (!key) continue;
        const value =
            typeof rawValue === "string"
                ? rawValue
                : rawValue == null
                  ? ""
                  : JSON.stringify(rawValue);
        lines.push(`- ${key}: ${value}`);
    }
    if (lines.length === 0) return undefined;

    return [
        "## User personal parameters",
        "Use these account-level parameters when the task needs them.",
        ...lines,
    ].join("\n");
}

export function buildOpencodeSystemPrompt(params: {
    rolePrompt?: string | null;
    personalParams?: OpencodePersonalParams | null;
    systemHint: string;
}): string {
    const role = params.rolePrompt?.trim() || "";
    const personalSection = buildOpencodePersonalParamsSection(params.personalParams);
    return [role || undefined, personalSection, params.systemHint].filter(Boolean).join("\n\n");
}
