import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineExtensionViteConfig } from "@buildingai/web-core/vite/extension";

import packageJson from "./package.json";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const aiSdkReact = path.resolve(
    rootDir,
    "../../node_modules/.pnpm/@ai-sdk+react@3.0.101_react@19.2.4_zod@4.3.6/node_modules/@ai-sdk/react",
);
const recharts = path.resolve(
    rootDir,
    "../../node_modules/.pnpm/recharts@2.15.4_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/recharts",
);

export default defineExtensionViteConfig(packageJson, {
    resolve: {
        alias: {
            "@ai-sdk/react": aiSdkReact,
            recharts,
        },
    },
    server: {
        port: 5174,
        strictPort: true,
        open: "/extension/esg-report-ai",
    },
});
