/**
 * Run AST 0.1.3 table rename migration (asset-life-* prefix).
 *
 * Usage (from repo root, after `pnpm --filter asset-life-ai build:api`):
 *   node extensions/asset-life-ai/scripts/run-rename-tables-migration.mjs
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
config({ path: path.join(rootDir, ".env") });

const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);
const { DataSource } = require("@buildingai/db/typeorm");

const MIGRATION_NAME = "1766716800000-0.1.3-rename-tables.js";
const EXTENSION_ID = "asset-life-ai";

const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_DATABASE || "buildingai",
    synchronize: false,
    logging: ["error"],
});

const migrationPath = path.join(__dirname, "../build/db/migrations", MIGRATION_NAME);

await dataSource.initialize();

try {
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "extensions_migrations_history" (
            id SERIAL PRIMARY KEY,
            extension_identifier VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            version VARCHAR(50) NOT NULL,
            timestamp BIGINT NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(extension_identifier, name)
        )
    `);

    const [{ count }] = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM "extensions_migrations_history"
         WHERE extension_identifier = $1 AND name = $2`,
        [EXTENSION_ID, MIGRATION_NAME],
    );

    if (Number(count) > 0) {
        console.log(`Migration already recorded: ${MIGRATION_NAME}`);
    } else {
        const mod = await import(migrationPath);
        if (typeof mod.up !== "function") {
            throw new Error(`Migration module missing up(): ${migrationPath}`);
        }
        console.log(`Executing ${MIGRATION_NAME}...`);
        await mod.up(dataSource);
        await dataSource.query(
            `INSERT INTO "extensions_migrations_history"
             (extension_identifier, name, version, timestamp)
             VALUES ($1, $2, $3, $4)`,
            [EXTENSION_ID, MIGRATION_NAME, "0.1.3", 1766716800000],
        );
        console.log("Migration completed and recorded.");
    }

    const tables = await dataSource.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'asset_life_ai'
         ORDER BY table_name`,
    );
    console.log("asset_life_ai tables:", tables.map((r) => r.table_name).join(", "));
} finally {
    await dataSource.destroy();
}
