#!/usr/bin/env node
/**
 * Sync DB tables for ehcs-ai + all enterprise extensions (TypeORM synchronize).
 *
 * Usage (repo root, after build:api):
 *   node scripts/enterprise-ai-apps/sync-all-extension-schemas.mjs
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import fs from "node:fs";

import { loadRegistry, ROOT } from "./registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(ROOT, ".env") });

const requireFromRoot = createRequire(path.join(ROOT, "package.json"));
const require = createRequire(import.meta.url);

function getExtensionSchemaName(identifier) {
    return identifier.replace(/-/g, "_");
}

async function syncOne(identifier) {
    const extensionDir = path.join(ROOT, "extensions", identifier);
    const entitiesPath = path.join(extensionDir, "build", "db", "entities");

    if (!fs.existsSync(entitiesPath)) {
        throw new Error(`Missing build entities: ${entitiesPath} (run build:api first)`);
    }

    const { DataSource } = require(path.join(ROOT, "packages/@buildingai/db/dist/typeorm.js"));
    const { SnakeNamingStrategy } = requireFromRoot("typeorm-naming-strategies");
    const entityFiles = fs
        .readdirSync(entitiesPath)
        .filter((f) => f.endsWith(".entity.js"))
        .map((f) => path.join(entitiesPath, f));
    const mainEntityFiles = fs
        .readdirSync(path.join(ROOT, "packages/@buildingai/db/dist/entities"))
        .filter((f) => f.endsWith(".entity.js"))
        .map((f) => path.join(ROOT, "packages/@buildingai/db/dist/entities", f));

    const schemaName = getExtensionSchemaName(identifier);
    const admin = new DataSource({
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "buildingai",
        synchronize: false,
        logging: false,
    });
    await admin.initialize();
    try {
        await admin.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    } finally {
        await admin.destroy();
    }

    const tempDataSource = new DataSource({
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "buildingai",
        namingStrategy: new SnakeNamingStrategy(),
        entities: [...mainEntityFiles, ...entityFiles],
        synchronize: true,
        logging: false,
    });

    await tempDataSource.initialize();
    const tables = await tempDataSource.query(
        `SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_schema = $1`,
        [schemaName],
    );
    await tempDataSource.destroy();
    console.log(`OK ${identifier} (${tables[0].c} tables in ${schemaName})`);
}

async function main() {
    const { apps } = loadRegistry();
    const ids = ["ehcs-ai", ...apps.map((a) => a.appId)];
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
        try {
            await syncOne(id);
            ok++;
        } catch (err) {
            fail++;
            console.error(`FAIL ${id}:`, err instanceof Error ? err.message : err);
        }
    }
    console.log(`SUMMARY ok=${ok} fail=${fail}`);
    if (fail > 0) process.exit(1);
}

main();
