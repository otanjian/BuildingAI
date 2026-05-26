import path from "node:path";
import { fileURLToPath } from "node:url";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";

const viteDir = path.dirname(fileURLToPath(import.meta.url));
const extensionDashboardSrc = path.resolve(
    viteDir,
    "../../../../extension-dashboard/src",
);

const extensionDashboardAlias = {
    "@buildingai/extension-dashboard": path.join(extensionDashboardSrc, "index.ts"),
};

// https://vite.dev/config/
export const defineExtensionViteConfig = (packageJson: { name: string }, config?: UserConfig) => {
    const userResolve = config?.resolve ?? {};
    const userAlias =
        userResolve.alias && typeof userResolve.alias === "object" && !Array.isArray(userResolve.alias)
            ? userResolve.alias
            : {};

    return defineConfig({
        plugins: [react(), tailwindcss(), babel({ presets: [reactCompilerPreset()] })],
        base: `/extension/${packageJson.name}`,
        envDir: "./../../",
        build: {
            outDir: ".output/public",
            sourcemap: false,
            rollupOptions: {
                onwarn(warning, warn) {
                    if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
                    if (warning.code === "COMMONJS_VARIABLE_IN_ESM") return;
                    if (
                        warning.message &&
                        warning.message.includes(
                            "dynamic import will not move module into another chunk",
                        )
                    )
                        return;
                    if (
                        warning.message &&
                        warning.message.includes("externalized for browser compatibility")
                    )
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
        ...config,
        resolve: {
            ...userResolve,
            tsconfigPaths: true,
            alias: {
                ...extensionDashboardAlias,
                ...userAlias,
            },
        },
    });
};
