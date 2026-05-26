/**
 * Upsert PRJ check rules catalog (35 rules, all disabled).
 *
 * Usage (from repo root, after `pnpm --filter project-health-ai build:api`):
 *   node extensions/project-health-ai/scripts/seed-check-rules.mjs
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
const { SnakeNamingStrategy } = require("typeorm-naming-strategies");

const entitiesGlob = path
    .join(__dirname, "../build/db/entities/*.entity.js")
    .replace(/\\/g, "/");

const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_DATABASE || "buildingai",
    namingStrategy: new SnakeNamingStrategy(),
    entities: [entitiesGlob],
    synchronize: false,
    logging: false,
});

const seedsIndex = path.join(__dirname, "../build/db/seeds/index.js");
const seedsModule = await import(seedsIndex);

await dataSource.initialize();

const seeders = await seedsModule.getSeeders();
const catalogSeeder = seeders.find((s) => s.name === "ProjectHealthCheckRulesCatalogSeeder");
if (!catalogSeeder) {
    console.error("ProjectHealthCheckRulesCatalogSeeder not found. Run: pnpm --filter project-health-ai build:api");
    process.exit(1);
}

await catalogSeeder.run(dataSource);
await dataSource.destroy();

console.log("Done. Open PRJ → 检查规则 to verify 35 rules (all disabled).");
