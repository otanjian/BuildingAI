#!/usr/bin/env node
/**
 * Point all enterprise (+ ehcs) platform agents at unified bowi-mcp.
 * - Adds bowi-mcp-tool-sync module per extension
 * - Patches *-platform-agent.service.ts and settings.module.ts
 * - Regenerates platform agent configs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistry, ROOT } from "./registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SYNC_SERVICE = `import { BOWI_MCP_TOOL_CATALOG } from "@buildingai/constants/shared/bowi-mcp.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpTool } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class BowiMcpToolSyncService {
    private readonly logger = new Logger(BowiMcpToolSyncService.name);

    constructor(
        @InjectRepository(AiMcpTool)
        private readonly mcpToolRepo: Repository<AiMcpTool>,
    ) {}

    async syncCatalogToDatabase(mcpServerId: string): Promise<number> {
        const tools = BOWI_MCP_TOOL_CATALOG.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
        }));

        const existing = await this.mcpToolRepo.find({ where: { mcpServerId } });
        const existingMap = new Map(existing.map((row) => [row.name, row]));
        const newNames = new Set(tools.map((t) => t.name));

        for (const tool of tools) {
            const row = existingMap.get(tool.name);
            if (row) {
                await this.mcpToolRepo.update(row.id, {
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                });
            } else {
                await this.mcpToolRepo.save({
                    mcpServerId,
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                });
            }
        }

        for (const row of existing) {
            if (!newNames.has(row.name)) {
                await this.mcpToolRepo.delete(row.id);
            }
        }

        this.logger.log(\`Synced \${tools.length} bowi-mcp tools for server \${mcpServerId}\`);
        return tools.length;
    }
}
`;

const SYNC_MODULE = `import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpTool } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { BowiMcpToolSyncService } from "./bowi-mcp-tool-sync.service";

@Module({
    imports: [TypeOrmModule.forFeature([AiMcpTool])],
    providers: [BowiMcpToolSyncService],
    exports: [BowiMcpToolSyncService],
})
export class BowiMcpToolSyncModule {}
`;

function writeBowiToolSync(extDir) {
    const dir = path.join(extDir, "src/api/modules/bowi-mcp-tool-sync");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "bowi-mcp-tool-sync.service.ts"), SYNC_SERVICE, "utf8");
    fs.writeFileSync(path.join(dir, "bowi-mcp-tool-sync.module.ts"), SYNC_MODULE, "utf8");
}

function patchSettingsModule(extDir, oldMcpModuleName) {
    const settingsPath = path.join(extDir, "src/api/modules/settings/settings.module.ts");
    if (!fs.existsSync(settingsPath)) return;
    let s = fs.readFileSync(settingsPath, "utf8");
    s = s.replace(
        new RegExp(`import \\{ ${oldMcpModuleName} \\} from \"\\.\\./[^\"]+\";\\n`, "g"),
        `import { BowiMcpToolSyncModule } from "../bowi-mcp-tool-sync/bowi-mcp-tool-sync.module";\n`,
    );
    s = s.replace(new RegExp(`\\s*${oldMcpModuleName},?\\n`, "g"), "\n        BowiMcpToolSyncModule,\n");
    fs.writeFileSync(settingsPath, s, "utf8");
}

function patchPlatformAgentService(filePath) {
    let s = fs.readFileSync(filePath, "utf8");
    const pairs = [
        [/import \{[^}]+\} from "\.\.\/\.\.\/[^"]*-mcp\/[^"]+";/g, ""],
        [/import \{[^}]+\} from "\.\.\/\.\.\/ehcs-mcp\/[^"]+";/g, ""],
        [
            /from "\.\.\/\.\.\/[^"]*-platform-agent\.config"/,
            (m) => m,
        ],
    ];
    for (const [a, b] of pairs) {
        s = s.replace(a, b);
    }

    if (!s.includes("@buildingai/constants/shared/bowi-mcp.constant")) {
        s = s.replace(
            /from "@nestjs\/common";/,
            `from "@nestjs/common";\nimport {\n    BOWI_MCP_SERVER_NAME,\n    BOWI_MCP_TOOL_CATALOG,\n    getBowiMcpPublicUrl,\n} from "@buildingai/constants/shared/bowi-mcp.constant";`,
        );
    }
    if (!s.includes("BowiMcpToolSyncService")) {
        s = s.replace(
            /from "\.\/settings\.service";/,
            `import { BowiMcpToolSyncService } from "../../bowi-mcp-tool-sync/bowi-mcp-tool-sync.service";\nimport { SettingsService } from "./settings.service";`,
        );
    }
    s = s.replace(
        /import \{ SettingsService \} import \{ BbowiMcpToolSyncService[^\n]+\n/g,
        "",
    );
    s = s.replace(/import \{ SettingsService \}\s*\nimport \{ BowiMcpToolSyncService/g, "import { BowiMcpToolSyncService");

    s = s.replace(/EhcsMcpToolSyncService|InvOptMcpToolSyncService|[A-Za-z]+McpToolSyncService/g, "BowiMcpToolSyncService");
    s = s.replace(/ehcsMcpToolSync|invOptMcpToolSync|[a-z]+McpToolSync/g, "bowiMcpToolSync");
    s = s.replace(/ensureEhcsMcpServer|ensureInvOptMcpServer|ensure[A-Za-z]+McpServer/g, "ensureBowiMcpServer");
    s = s.replace(/isEhcsMcpServer/g, "isBowiMcpServer");
    s = s.replace(/EHCS_MCP_SERVER_NAME|INVO_MCP_SERVER_NAME|[A-Z]+_MCP_SERVER_NAME/g, "BOWI_MCP_SERVER_NAME");
    s = s.replace(/EHCS_MCP_TOOL_CATALOG|INVO_MCP_TOOL_CATALOG|[A-Z]+_MCP_TOOL_CATALOG/g, "BOWI_MCP_TOOL_CATALOG");
    s = s.replace(/getEhcsMcpPublicUrl|getInvOptMcpPublicUrl|get[A-Za-z]+McpPublicUrl/g, "getBowiMcpPublicUrl");
    s = s.replace(/role: "ehcs" \| "erp"/g, 'role: "bowi" | "erp"');
    s = s.replace(/role: "ehcs"/g, 'role: "bowi"');
    s = s.replace(/ehcsMcpId/g, "bowiMcpId");
    s = s.replace(/alias: "[^"]*内置检查[^"]*"/g, 'alias: "Bowi 企业自治 MCP"');
    s = s.replace(
        /description: "[^"]*（扩展内置 MCP）"/g,
        'description: "统一企业自治 MCP（bowi-mcp，按 appId 隔离 schema）"',
    );
    s = s.replace(/ehcs-mcp tool catalog is empty/g, "bowi-mcp tool catalog is empty");
    s = s.replace(/ehcs-mcp/g, "bowi-mcp");

    fs.writeFileSync(filePath, s, "utf8");
}

function patchAppIds() {
    const { apps } = loadRegistry();
    const targets = [{ appId: "ehcs-ai" }, ...apps];
    for (const app of targets) {
        const extDir = path.join(ROOT, "extensions", app.appId);
        if (!fs.existsSync(extDir)) continue;
        writeBowiToolSync(extDir);
        const pascal = app.appId.replace(/-ai$/, "").split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
        const oldModule = `${pascal}McpModule`;
        patchSettingsModule(extDir, oldModule);
        const svcDir = path.join(extDir, "src/api/modules/settings/services");
        for (const f of fs.readdirSync(svcDir)) {
            if (f.endsWith("-platform-agent.service.ts")) {
                patchPlatformAgentService(path.join(svcDir, f));
            }
        }
        console.log("patched", app.appId);
    }
}

patchAppIds();
console.log("Run: node scripts/enterprise-ai-apps/generate-agent-config.mjs");
