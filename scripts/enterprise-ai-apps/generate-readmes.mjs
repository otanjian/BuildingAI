#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadRegistry, mcpPrefix, ROOT } from "./registry.mjs";

function readme(app) {
    const mp = mcpPrefix(app.tablePrefix);
    return `# ${app.productNameFull} (\`${app.appId}\`)

Scaffolded from \`ehcs-ai\`. PRD: \`docs/PRD-${app.slug}.md\`, DB: \`docs/DB-${app.slug}.md\`.

## Entry

- \`/apps/${app.appId}\`
- \`/extension/${app.appId}\`

## Setup

1. Enable in \`extensions/extensions.json\` → \`pnpm extension:sync\`
2. Settings → **${app.agentName}**
3. \`pnpm --filter ${app.appId} build:api\` then \`pnpm --filter ${app.appId} seed:rules\`

Rules catalog: **30+** entries in \`src/api/db/seed-data/${app.tablePrefix.replace(/-$/, "")}-check-rules-catalog.ts\`.

## MCP

\`${mp}_start_full_check\`, \`${mp}_get_check_progress\`, \`${mp}_cancel_check\`, \`${mp}_ingest_rule_result\`, \`${mp}_sql_query\`, \`${mp}_sql_execute\`
`;
}

const data = loadRegistry();
for (const app of data.apps) {
    const p = path.join(ROOT, "extensions", app.appId, "README.md");
    if (fs.existsSync(path.join(ROOT, "extensions", app.appId))) {
        fs.writeFileSync(p, readme(app), "utf8");
    }
}
console.log("READMEs written for", data.apps.length, "apps");
