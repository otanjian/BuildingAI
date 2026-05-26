/**
 * Fix duplicate tax_compliance_ai tables: drop empty tax-compliance-* stubs, rename legacy tables.
 * Run after synchronize created empty prefixed tables before migration.
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

const migrationPath = path.join(
    __dirname,
    "../build/db/migrations/1766716800000-0.1.3-rename-tables.js",
);

const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_DATABASE || "buildingai",
    synchronize: false,
    logging: false,
});

await dataSource.initialize();
try {
    const mod = await import(migrationPath);
    console.log("Applying table rename fix...");
    await mod.up(dataSource);
    const tables = await dataSource.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'tax_compliance_ai' ORDER BY table_name`,
    );
    console.log("tax_compliance_ai tables:", tables.map((r) => r.table_name).join(", "));
    for (const { table_name } of tables) {
        const [{ c }] = await dataSource.query(
            `SELECT COUNT(*)::int AS c FROM "tax_compliance_ai"."${table_name}"`,
        );
        console.log(`  ${table_name}: ${c} rows`);
    }
} finally {
    await dataSource.destroy();
}
