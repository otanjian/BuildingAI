/**
 * Shared DB bootstrap for extension platform-agent seed scripts.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

/**
 * Load all TypeORM entities from @buildingai/db dist (avoids missing relation metadata).
 * @param {string} rootDir - Monorepo root
 * @returns {Function[]}
 */
export function loadCoreDbEntities(rootDir) {
    const dbEntitiesDir = path.join(rootDir, "packages/@buildingai/db/dist/entities");
    const files = readdirSync(dbEntitiesDir).filter((f) => f.endsWith(".entity.js"));
    const entities = [];
    for (const file of files) {
        const mod = require(path.join(dbEntitiesDir, file));
        for (const exp of Object.values(mod)) {
            if (typeof exp === "function" && exp.prototype) {
                entities.push(exp);
                break;
            }
        }
    }
    return entities;
}

/**
 * @param {string} rootDir
 * @param {import("typeorm").DataSourceOptions} [extra]
 */
export async function createPlatformAgentDataSource(rootDir, extra = {}) {
    const { DataSource } = require("@buildingai/db/typeorm");
    const { SnakeNamingStrategy } = require("typeorm-naming-strategies");
    return new DataSource({
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "buildingai",
        entities: loadCoreDbEntities(rootDir),
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
        logging: false,
        ...extra,
    });
}

/**
 * @param {import("typeorm").DataSource} dataSource
 * @param {string} seedsIndexPath - path to extension build/db/seeds/index.js
 * @param {string} seederName - e.g. InvOptPlatformAgentSeeder
 */
export async function runPlatformAgentSeeder(dataSource, seedsIndexPath, seederName) {
    const { SeedRunner } = await import("@buildingai/db/seeds");
    const seedsModule = await import(pathToFileURL(seedsIndexPath).href);
    const seeders = await seedsModule.getSeeders();
    const agentSeeder = seeders.find((s) => s.name === seederName);
    if (!agentSeeder) {
        throw new Error(`${seederName} not found in ${seedsIndexPath}`);
    }
    const runner = new SeedRunner(dataSource);
    await runner.run([agentSeeder]);
}
