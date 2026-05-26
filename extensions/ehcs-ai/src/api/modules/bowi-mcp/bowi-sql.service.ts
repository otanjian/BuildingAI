import {
    BOWI_APP_SCOPES,
    qualifyTable,
    type BowiAppScope,
} from "@buildingai/constants/shared/bowi-app-scopes";
import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import { BowiAppScopeService } from "./bowi-app-scope.service";

const FORBIDDEN_KEYWORDS =
    /\b(drop|truncate|alter|create|grant|revoke|copy|call|execute|vacuum|reindex|cluster|comment|security|extension)\b/i;

const OTHER_SCHEMAS = BOWI_APP_SCOPES.map((s) => s.schema.toLowerCase());

function stripSqlComments(sql: string): string {
    return sql
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/--[^\n]*/g, " ")
        .trim();
}

function singleStatement(sql: string): string {
    const trimmed = stripSqlComments(sql);
    const parts = trimmed.split(";").map((p) => p.trim()).filter(Boolean);
    if (parts.length !== 1) {
        throw new Error("Only a single SQL statement is allowed");
    }
    return parts[0]!;
}

function assertNoForbidden(sql: string): void {
    if (FORBIDDEN_KEYWORDS.test(sql)) {
        throw new Error("Statement contains forbidden keywords");
    }
}

function allowedQualifiedNames(scope: BowiAppScope): Set<string> {
    const names = new Set<string>();
    for (const table of Object.values(scope.tables)) {
        names.add(`${scope.schema}.${table}`.toLowerCase());
        names.add(`"${scope.schema}"."${table}"`.toLowerCase());
    }
    return names;
}

function assertSqlScopedToApp(scope: BowiAppScope, sql: string): void {
    const lower = sql.toLowerCase();
    for (const other of OTHER_SCHEMAS) {
        if (other === scope.schema.toLowerCase()) {
            continue;
        }
        if (lower.includes(other)) {
            throw new Error(`SQL must not reference schema ${other}`);
        }
    }

    const allowed = allowedQualifiedNames(scope);
    const refs = sql.match(/"([^"]+)"\s*\.\s*"([^"]+)"/g) ?? [];
    for (const ref of refs) {
        if (!allowed.has(ref.toLowerCase())) {
            throw new Error(
                `SQL references ${ref} which is not allowed for appId ${scope.appId}. Allowed tables: ${Object.values(scope.tables).join(", ")}`,
            );
        }
    }

    if (!lower.includes(scope.schema.toLowerCase())) {
        throw new Error(
            `SQL must qualify tables with schema "${scope.schema}" (appId ${scope.appId})`,
        );
    }
}

@Injectable()
export class BowiSqlService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly scopeService: BowiAppScopeService,
    ) {}

    async query(appId: unknown, sql: string, params?: unknown[]) {
        const scope = this.scopeService.resolve(appId);
        const statement = singleStatement(sql);
        assertNoForbidden(statement);
        if (!/^\s*select\b/i.test(statement)) {
            throw new Error("bowi_sql_query only allows SELECT statements");
        }
        assertSqlScopedToApp(scope, statement);
        const rows = await this.dataSource.query(statement, this.normalizeParams(params));
        const list = Array.isArray(rows) ? rows : [];
        return { ok: true, rows: list, rowCount: list.length, appId: scope.appId };
    }

    async execute(appId: unknown, sql: string, params?: unknown[]) {
        const scope = this.scopeService.resolve(appId);
        const statement = singleStatement(sql);
        assertNoForbidden(statement);
        if (!/^\s*(insert|update|delete)\b/i.test(statement)) {
            throw new Error("bowi_sql_execute only allows INSERT, UPDATE, or DELETE statements");
        }
        assertSqlScopedToApp(scope, statement);
        const result = await this.dataSource.query(statement, this.normalizeParams(params));
        const rows = Array.isArray(result) ? result : [];
        const rowCount =
            typeof result?.rowCount === "number" ? result.rowCount : rows.length;
        return { ok: true, rows, rowCount, appId: scope.appId };
    }

    formatScopeHint(scope: BowiAppScope): string {
        const lines = Object.values(scope.tables).map(
            (t) => qualifyTable(scope, t),
        );
        return `Allowed: ${lines.join(", ")}`;
    }

    private normalizeParams(params?: unknown[]): unknown[] | undefined {
        if (!params || params.length === 0) {
            return undefined;
        }
        return params;
    }
}
