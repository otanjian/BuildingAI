/**
 * Migration: add-agent-manage-permission
 * Version: 26.1.2
 *
 * Inserts the "agent.manage" permission record used to gate access to
 * the "我的智能体" feature on the web agent square page.
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1778700000000 implements MigrationInterface {
    name = "Migration1778700000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the permission already exists to keep this migration idempotent
        const exists = await queryRunner.query(
            `SELECT 1 FROM "permissions" WHERE code = $1 LIMIT 1`,
            ["agent.manage"],
        );

        if (exists.length === 0) {
            await queryRunner.query(
                `INSERT INTO "permissions" ("id", "code", "name", "description", "group", "group_name", "type", "is_deprecated", "created_at", "updated_at")
                 VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, false, now(), now())`,
                [
                    "agent.manage",
                    "管理智能体",
                    "创建和管理自己的智能体",
                    "agent",
                    "智能体管理",
                    "system",
                ],
            );
        }

        // Assign agent.manage to all existing roles so existing admins retain access.
        // Admins can later remove this permission from specific roles via the console UI.
        const rolePermissionPairs = await queryRunner.query(
            `SELECT r.id AS role_id, p.id AS permission_id
             FROM roles r, permissions p
             WHERE p.code = $1
               AND NOT EXISTS (
                 SELECT 1 FROM role_permissions rp
                 WHERE rp.roles_id = r.id AND rp.permissions_id = p.id
               )`,
            ["agent.manage"],
        );

        for (const pair of rolePermissionPairs) {
            await queryRunner.query(
                `INSERT INTO "role_permissions" ("roles_id", "permissions_id") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [pair.role_id, pair.permission_id],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "permissions" WHERE code = $1`,
            ["agent.manage"],
        );
    }
}
