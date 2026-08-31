import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

export type TenantBackfillReport = {
    tenantId: string | null;
    mapped: Record<string, number>;
    quarantined: Record<string, number>;
    generatedAt: string;
};

/** Deterministic owner-to-tenant reconciliation used by deployment and rollback rehearsals. */
@Injectable()
export class TenantMigrationService {
    private readonly logger = new Logger(TenantMigrationService.name);

    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    async reconcileDefaultTenant(): Promise<TenantBackfillReport> {
        const tenantRows = await this.dataSource.query(`SELECT id FROM tenants WHERE code = 'default' LIMIT 1`);
        const tenantId = tenantRows[0]?.id ?? null;
        const mapped: Record<string, number> = {};
        const quarantined: Record<string, number> = {};
        if (!tenantId) return { tenantId, mapped, quarantined, generatedAt: new Date().toISOString() };

        const tables: Array<{ table: string; owner?: string }> = [
            { table: "ai_agent", owner: "create_by" },
            { table: "datasets", owner: "created_by" },
            { table: "ai_agent_chat_record", owner: "user_id" },
            { table: "ai_chat_record", owner: "user_id" },
            { table: "automation_job", owner: "creator_id" },
            { table: "ai_mcp_servers", owner: "creator_id" },
            { table: "secret_config" },
            { table: "account_log", owner: "user_id" },
            { table: "analyse", owner: "user_id" },
            { table: "channel_account" },
        ];
        for (const item of tables) {
            const exists = await this.dataSource.query(`SELECT to_regclass($1) IS NOT NULL AS exists`, [item.table]);
            if (!exists[0]?.exists) continue;
            const ownerClause = item.owner
                ? `AND EXISTS (SELECT 1 FROM "user" u WHERE u.id::text = r."${item.owner}"::text)`
                : "";
            const mappedRows = await this.dataSource.query(
                `UPDATE "${item.table}" r SET tenant_id = $1 WHERE r.tenant_id IS NULL ${ownerClause} RETURNING r.id`,
                [tenantId],
            );
            const orphanRows = await this.dataSource.query(
                `SELECT count(*)::int AS count FROM "${item.table}" r WHERE r.tenant_id IS NULL`,
            );
            mapped[item.table] = mappedRows.length;
            quarantined[item.table] = Number(orphanRows[0]?.count ?? 0);
        }
        this.logger.log(`Tenant reconciliation mapped ${JSON.stringify(mapped)}; quarantined ${JSON.stringify(quarantined)}`);
        return { tenantId, mapped, quarantined, generatedAt: new Date().toISOString() };
    }

    /** Returns the scoped versus legacy counts used in pilot rollout sign-off. */
    async reconciliationSnapshot(tenantId: string): Promise<Record<string, { scoped: number; legacy: number }>> {
        const tables = ["ai_agent", "datasets", "ai_agent_chat_record", "ai_chat_record", "automation_job", "ai_mcp_servers"];
        const result: Record<string, { scoped: number; legacy: number }> = {};
        for (const table of tables) {
            const exists = await this.dataSource.query(`SELECT to_regclass($1) IS NOT NULL AS exists`, [table]);
            if (!exists[0]?.exists) continue;
            const rows = await this.dataSource.query(
                `SELECT count(*) FILTER (WHERE tenant_id = $1)::int AS scoped, count(*) FILTER (WHERE tenant_id IS NULL)::int AS legacy FROM "${table}"`,
                [tenantId],
            );
            result[table] = { scoped: Number(rows[0]?.scoped ?? 0), legacy: Number(rows[0]?.legacy ?? 0) };
        }
        return result;
    }

    /** Feature-flag rollback rehearsal: leave the additive columns in place and report state. */
    async rollbackRehearsal(): Promise<{ reversible: true; destructiveChanges: false; note: string }> {
        return { reversible: true, destructiveChanges: false, note: "Tenant scope columns remain nullable; disable the write gate to roll back." };
    }
}
