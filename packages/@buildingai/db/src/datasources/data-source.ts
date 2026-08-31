import "@buildingai/config/utils/env";

import { globSync } from "glob";
import path from "path";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { DataSource } from "./../typeorm";

const distDir = __dirname.replace("/src", "/dist");
const entitiesPattern = path.join(distDir, "..", "entities", "**", "*.entity.js");
const entityFiles = globSync(entitiesPattern);
const migrationsPattern = path.join(distDir, "..", "migrations", "**", "*.js");
const migrationClasses = globSync(migrationsPattern).flatMap((file) => {
    // A migration module may expose testable helpers alongside its migration
    // class. TypeORM's directory loader treats every exported function as a
    // migration, so select only constructors that implement up/down here.
    const moduleExports = require(file) as Record<string, unknown>;
    return Object.values(moduleExports).filter(
        (value): value is new () => { up?: unknown; down?: unknown } =>
            typeof value === "function" &&
            (typeof (value as { prototype?: { up?: unknown } }).prototype?.up === "function" ||
                typeof (value as { prototype?: { down?: unknown } }).prototype?.down === "function"),
    );
});

export const AppDataSource = new DataSource({
    type: process.env.DB_TYPE as "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_DATABASE || "buildingai",
    logging: true,
    namingStrategy: new SnakeNamingStrategy(),
    migrations: migrationClasses,
    entities: entityFiles,
    synchronize: false,
    migrationsTableName: "migrations_history",
});
