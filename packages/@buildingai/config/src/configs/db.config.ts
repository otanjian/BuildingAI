import "../utils/env";

import { DataSource, DataSourceOptions } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

/**
 * Creates a data source configuration object
 * @param opts Optional configuration options for the typeorm datasource
 */
export const createDataSourceConfig = (
    opts?: Pick<DataSourceOptions, "synchronize" | "logging" | "entities" | "migrations">,
): DataSourceOptions => {
    const synchronize =
        opts?.synchronize !== undefined
            ? opts?.synchronize
            : process.env.NODE_ENV === "development"
              ? process.env.DB_DEV_SYNCHRONIZE === "true"
              : process.env.DB_SYNCHRONIZE === "true" || false;

    if (process.env.NODE_ENV === "production" && synchronize) {
        throw new Error("Database synchronize must be disabled in production.");
    }

    return {
        type: process.env.DB_TYPE as "postgres",
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "buildingai",
        synchronize,
        logging: opts?.logging || process.env.DB_LOGGING === "true",
        namingStrategy: new SnakeNamingStrategy(),
        migrations: opts?.migrations || [],
        migrationsTableName: "migrations_history",
        extra: {
            max: Number(process.env.DB_POOL_MAX) || 50,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 10_000,
        },
    };
};

export default new DataSource(createDataSourceConfig());
