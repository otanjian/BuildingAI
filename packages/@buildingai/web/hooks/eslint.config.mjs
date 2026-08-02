import { config as baseConfig } from "@buildingai/eslint-config/base";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";

/** @type {import("eslint").Linter.Config} */
export default defineConfig([
    ...baseConfig,
    {
        files: ["src/**/*.{ts,tsx}"],
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
        },
    },
]);
