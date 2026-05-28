import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
// import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, type ProxyOptions } from "vite";

const host = process.env.TAURI_DEV_HOST;
const apiTarget = process.env.VITE_DEVELOP_APP_BASE_URL || "http://localhost:4090";
const constantsDist = path.resolve(__dirname, "../@buildingai/constants/dist");

const constantsAliases = [
  {
    find: /^@buildingai\/constants\/shared\/(.+)$/,
    replacement: `${path.join(constantsDist, "shared")}/$1.js`,
  },
  {
    find: "@buildingai/constants/web",
    replacement: path.join(constantsDist, "web/index.js"),
  },
  {
    find: "@buildingai/constants/shared",
    replacement: path.join(constantsDist, "shared/index.js"),
  },
];

/** Proxy /{extensionId}/consoleapi|api to the API server (apps iframe uses same origin in dev). */
function buildExtensionApiProxies(target: string): Record<string, ProxyOptions> {
  const proxies: Record<string, ProxyOptions> = {};
  const configPath = path.resolve(__dirname, "../../extensions/extensions.json");
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      applications?: Record<string, unknown>;
      functionals?: Record<string, unknown>;
    };
    const ids = [
      ...Object.keys(config.applications ?? {}),
      ...Object.keys(config.functionals ?? {}),
    ];
    for (const id of ids) {
      proxies[`/${id}`] = { target, changeOrigin: true };
    }
  } catch {
    proxies["/ehcs-ai"] = { target, changeOrigin: true };
  }
  return proxies;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    // visualizer({
    //   open: true,
    // }),
  ],
  clearScreen: false,
  resolve: {
    tsconfigPaths: true,
    alias: [
      ...constantsAliases,
      { find: "@", replacement: path.resolve(__dirname, "src") },
      {
        find: "@buildingai/types/ai/agent-config.interface",
        replacement: path.resolve(__dirname, "../@buildingai/types/dist/ai/agent-config.interface.mjs"),
      },
      {
        find: "@buildingai/types",
        replacement: path.resolve(__dirname, "../@buildingai/types/dist/index.mjs"),
      },
    ],
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  server: {
    host: host || "0.0.0.0",
    open: true,
    port: 4091,
    strictPort: true,
    proxy: {
      // Production index.html (cached) preloads /assets/*; serve built chunks from API in dev.
      "/assets": { target: apiTarget, changeOrigin: true },
      "/extension": { target: apiTarget, changeOrigin: true },
      "/api": { target: apiTarget, changeOrigin: true },
      "/consoleapi": { target: apiTarget, changeOrigin: true },
      "/web": { target: apiTarget, changeOrigin: true },
      ...buildExtensionApiProxies(apiTarget),
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        if (warning.code === "COMMONJS_VARIABLE_IN_ESM") return;
        if (
          warning.message &&
          warning.message.includes("dynamic import will not move module into another chunk")
        )
          return;
        if (warning.message && warning.message.includes("externalized for browser compatibility"))
          return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes("lucide-react")) {
            return "lucide";
          }
        },
      },
    },
  },
  envDir: "../../",
});
