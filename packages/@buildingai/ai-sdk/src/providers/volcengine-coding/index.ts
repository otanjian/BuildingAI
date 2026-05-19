import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModelV3, LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings, ProviderModelInfo } from "../../types";
import { fetchProviderModels } from "../../utils/fetch-models";

export interface VolcengineCodingProviderSettings extends BaseProviderSettings {}

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3";

class VolcengineCodingProviderImpl implements AIProvider {
    readonly id = "volcengine-coding";
    readonly name = "火山引擎 Coding";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;
    private settings: VolcengineCodingProviderSettings;

    constructor(settings: VolcengineCodingProviderSettings = {}) {
        this.settings = {
            ...settings,
            baseURL: settings.baseURL || DEFAULT_BASE_URL,
        };

        this.baseProvider = createOpenAICompatible({
            name: "volcengine-coding",
            baseURL: this.settings.baseURL!,
            headers: {
                Authorization:
                    this.settings?.apiKey && this.settings?.apiKey.includes("Bearer ")
                        ? this.settings.apiKey
                        : `Bearer ${this.settings.apiKey}`,
                ...this.settings.headers,
            },
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.embeddingModel(modelId);
    }

    async listModels(): Promise<ProviderModelInfo[]> {
        return fetchProviderModels(this.settings);
    }
}

export function volcengineCoding(
    settings: VolcengineCodingProviderSettings = {},
): AIProvider {
    return new VolcengineCodingProviderImpl(settings);
}
