/** Default LLM for all Bowi enterprise platform agents (matches console model id). */
export const BOWI_PLATFORM_AGENT_LLM_MODEL_NAME = "ark-code-latest";

export const BOWI_PLATFORM_AGENT_MODEL_OPTIONS = {
    temperature: 0.3,
    maxTokens: 8192,
} as const;

export function buildBowiPlatformModelConfig(modelId: string) {
    return {
        id: modelId,
        options: { ...BOWI_PLATFORM_AGENT_MODEL_OPTIONS },
    };
}

/** Main + memory + planning + follow-up chips — all use the same model. */
export function buildBowiPlatformModelRouting(modelId: string) {
    const ref = {
        modelId,
        options: { ...BOWI_PLATFORM_AGENT_MODEL_OPTIONS },
    };
    return {
        memoryModel: ref,
        planningModel: ref,
        titleModel: ref,
    };
}
