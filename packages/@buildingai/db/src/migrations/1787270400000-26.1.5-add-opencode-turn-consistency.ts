import type { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787270400000 implements MigrationInterface {
    name = "Migration1787270400000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_agent_opencode_turn" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "conversation_id" UUID NOT NULL,
                "request_hash" TEXT NOT NULL,
                "dispatch_snapshot" JSONB,
                "artifact_baseline" JSONB,
                "runtime_config_hash" TEXT NOT NULL,
                "input_message_id" UUID NOT NULL,
                "assistant_message_id" UUID,
                "opencode_user_message_id" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'accepted',
                "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "error_code" TEXT,
                "error_message" TEXT,
                "lease_token" UUID,
                "lease_expires_at" TIMESTAMP WITH TIME ZONE,
                "cancel_requested_at" TIMESTAMP WITH TIME ZONE,
                "started_at" TIMESTAMP WITH TIME ZONE,
                "completed_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "pk_oc_turn" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(
            `ALTER TABLE "ai_agent_chat_record" ADD COLUMN IF NOT EXISTS "opencode_session_id" TEXT`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_chat_record" ADD COLUMN IF NOT EXISTS "opencode_runtime_hash" TEXT`,
        );

        await this.addConstraintIfMissing(
            queryRunner,
            "ai_agent_opencode_turn",
            "ck_oc_turn_status",
            `CHECK ("status" IN ('accepted', 'running', 'committing', 'completed', 'cancelled', 'failed'))`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ai_agent_opencode_turn",
            "ck_oc_turn_lifecycle",
            `CHECK (
                (
                    "status" = 'accepted'
                    AND "completed_at" IS NULL
                    AND "assistant_message_id" IS NULL
                    AND "dispatch_snapshot" IS NOT NULL
                )
                OR
                (
                    "status" = 'running'
                    AND "completed_at" IS NULL
                    AND "assistant_message_id" IS NULL
                    AND "dispatch_snapshot" IS NOT NULL
                    AND "artifact_baseline" IS NOT NULL
                )
                OR
                (
                    "status" = 'committing'
                    AND "completed_at" IS NULL
                    AND "assistant_message_id" IS NULL
                    AND "dispatch_snapshot" IS NOT NULL
                    AND (
                        "artifact_baseline" IS NOT NULL
                        OR (
                            "cancel_requested_at" IS NOT NULL
                            AND "started_at" IS NULL
                        )
                    )
                )
                OR
                (
                    "status" IN ('completed', 'cancelled', 'failed')
                    AND "completed_at" IS NOT NULL
                    AND "assistant_message_id" IS NOT NULL
                    AND "dispatch_snapshot" IS NULL
                    AND "artifact_baseline" IS NULL
                    AND "lease_token" IS NULL
                    AND "lease_expires_at" IS NULL
                    AND "cancel_requested_at" IS NULL
                )
            )`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ai_agent_opencode_turn",
            "ck_oc_turn_lease_pair",
            `CHECK (
                ("lease_token" IS NULL AND "lease_expires_at" IS NULL)
                OR ("lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL)
            )`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ai_agent_chat_record",
            "ck_agent_chat_oc_session_binding",
            `CHECK (
                ("opencode_session_id" IS NULL AND "opencode_runtime_hash" IS NULL)
                OR ("opencode_session_id" IS NOT NULL AND "opencode_runtime_hash" IS NOT NULL)
            )`,
        );

        await this.addConstraintIfMissing(
            queryRunner,
            "ai_agent_opencode_turn",
            "fk_oc_turn_conversation",
            `FOREIGN KEY ("conversation_id") REFERENCES "ai_agent_chat_record"("id") ON DELETE CASCADE`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ai_agent_opencode_turn",
            "fk_oc_turn_input_message",
            `FOREIGN KEY ("input_message_id") REFERENCES "ai_agent_chat_message"("id") ON DELETE RESTRICT`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ai_agent_opencode_turn",
            "fk_oc_turn_assistant_message",
            `FOREIGN KEY ("assistant_message_id") REFERENCES "ai_agent_chat_message"("id") ON DELETE RESTRICT`,
        );

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "uq_oc_turn_one_active_conversation"
            ON "ai_agent_opencode_turn" ("conversation_id")
            WHERE "status" IN ('accepted', 'running', 'committing')
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "uq_oc_turn_input_message"
            ON "ai_agent_opencode_turn" ("input_message_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "uq_oc_turn_assistant_message"
            ON "ai_agent_opencode_turn" ("assistant_message_id")
            WHERE "assistant_message_id" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "uq_oc_turn_remote_user_message"
            ON "ai_agent_opencode_turn" ("conversation_id", "opencode_user_message_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_chat_oc_runtime_session"
            ON "ai_agent_chat_record" ("opencode_runtime_hash", "opencode_session_id")
            WHERE "opencode_session_id" IS NOT NULL AND "opencode_runtime_hash" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_oc_turn_active_lease"
            ON "ai_agent_opencode_turn" ("lease_expires_at", "created_at")
            WHERE "status" IN ('accepted', 'running', 'committing')
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_oc_turn_conversation_created"
            ON "ai_agent_opencode_turn" ("conversation_id", "created_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "uq_account_log_oc_turn_billing"
            ON "account_log" ("association_no")
            WHERE "association_no" LIKE 'opencode-turn:%' AND "action" = 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "uq_account_log_oc_turn_billing"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "uq_agent_chat_oc_runtime_session"`);
        await queryRunner.query(
            `ALTER TABLE "ai_agent_chat_record" DROP CONSTRAINT IF EXISTS "ck_agent_chat_oc_session_binding"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_chat_record" DROP COLUMN IF EXISTS "opencode_runtime_hash"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_chat_record" DROP COLUMN IF EXISTS "opencode_session_id"`,
        );
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_agent_opencode_turn"`);
    }

    private async addConstraintIfMissing(
        queryRunner: QueryRunner,
        table: string,
        constraint: string,
        definition: string,
    ): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = '${constraint}'
                      AND conrelid = '"${table}"'::regclass
                ) THEN
                    ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" ${definition};
                END IF;
            END
            $$
        `);
    }
}
