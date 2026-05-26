#!/usr/bin/env node
/**
 * Sync model routing (ark-code-latest) + square publish across all *-platform-agent.service.ts
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./registry.mjs";

const IMPORT_BLOCK = `import {
    BOWI_PLATFORM_AGENT_LLM_MODEL_NAME,
    buildBowiPlatformModelConfig,
    buildBowiPlatformModelRouting,
} from "@buildingai/constants/shared/bowi-platform-agent-profile";
`;

const MODEL_CONFIG_RE =
    /agent\.modelConfig = \{[\s\S]*?maxTokens: \d+,\s*\},\s*\};/;

const MODEL_CONFIG_REPL = `agent.modelConfig = buildBowiPlatformModelConfig(modelId);
        agent.modelRouting = buildBowiPlatformModelRouting(modelId);
        agent.voiceConfig = undefined;`;

const RESOLVE_RE =
    /private async resolveDefaultModel\(\): Promise<AiModel> \{[\s\S]*?\n    \}/;

const RESOLVE_REPL = `private async resolveDefaultModel(): Promise<AiModel> {
        const byName = await this.modelRepo.findOne({
            where: {
                isActive: true,
                model: BOWI_PLATFORM_AGENT_LLM_MODEL_NAME,
                modelType: "llm" as AiModel["modelType"],
            },
        });
        if (byName) return byName;

        const fallback = await this.modelRepo.findOne({
            where: { isActive: true, modelType: "llm" as AiModel["modelType"] },
            order: { createdAt: "ASC" },
        });
        if (!fallback) {
            throw HttpErrorFactory.badRequest(
                \`请先在控制台启用 LLM 模型 \${BOWI_PLATFORM_AGENT_LLM_MODEL_NAME}，再更新智能体\`,
            );
        }
        return fallback;
    }`;

const PUBLISH_RE =
    /private async ensureWebPublish\(agent: Agent\): Promise<void> \{[\s\S]*?\n    \}/;

const PUBLISH_REPL = `private async ensureWebPublish(agent: Agent): Promise<void> {
        const config = (agent.publishConfig ?? {}) as {
            enableSite?: boolean;
            accessToken?: string;
        };
        agent.publishConfig = {
            ...config,
            enableSite: true,
            accessToken: config.accessToken ?? randomBytes(32).toString("hex"),
        };
        agent.squarePublishStatus = SquarePublishStatus.APPROVED;
        agent.publishedToSquare = true;
        agent.publishedAt = agent.publishedAt ?? new Date();
        await this.agentRepo.save(agent);
    }`;

function patchFile(filePath) {
    let s = fs.readFileSync(filePath, "utf8");
    if (!s.includes("buildBowiPlatformModelConfig")) {
        const anchor = 'from "@buildingai/constants/shared/bowi-mcp.constant";';
        if (s.includes(anchor)) {
            s = s.replace(anchor, `${anchor}\n${IMPORT_BLOCK}`);
        } else {
            const alt = "from \"@buildingai/constants/shared/bowi-mcp.constant\";\n";
            if (s.includes(alt)) {
                s = s.replace(alt, `${alt}${IMPORT_BLOCK}`);
            }
        }
    }
    s = s.replace(MODEL_CONFIG_RE, MODEL_CONFIG_REPL);
    s = s.replace(RESOLVE_RE, RESOLVE_REPL);
    s = s.replace(PUBLISH_RE, PUBLISH_REPL);
    fs.writeFileSync(filePath, s, "utf8");
    console.log(`Synced ${filePath}`);
}

function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (!["node_modules", "build", ".output"].includes(ent.name)) walk(p);
        } else if (ent.name.endsWith("-platform-agent.service.ts")) {
            patchFile(p);
        }
    }
}

walk(path.join(ROOT, "extensions"));
console.log("Done syncing platform agent profiles.");
