import type { MigrationInterface, QueryRunner } from "typeorm";

/** Production feedback signals are intentionally redacted before persistence. */
export class AddAiEvaluationFeedback1788900000000 implements MigrationInterface {
    name = "AddAiEvaluationFeedback1788900000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_evaluation_feedback" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" timestamptz NOT NULL DEFAULT now(),
                "updated_at" timestamptz NOT NULL DEFAULT now(),
                "tenant_id" uuid NOT NULL,
                "project_id" uuid,
                "source_type" varchar(24) NOT NULL,
                "source_id" varchar(160),
                "state" varchar(24) NOT NULL DEFAULT 'new',
                "tags" varchar(120)[] NOT NULL DEFAULT '{}',
                "sensitivity" varchar(24) NOT NULL DEFAULT 'internal',
                "redacted_summary" text NOT NULL,
                "input_digest" varchar(64) NOT NULL,
                "expected_outcome" jsonb,
                "provenance" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "promoted_case_id" uuid,
                "created_by" uuid,
                "reviewed_by" uuid,
                "reviewed_at" timestamptz,
                CONSTRAINT "pk_ai_evaluation_feedback" PRIMARY KEY ("id"),
                CONSTRAINT "ck_ai_evaluation_feedback_source" CHECK ("source_type" IN ('production_failure','user_feedback','incident','tool_policy')),
                CONSTRAINT "ck_ai_evaluation_feedback_state" CHECK ("state" IN ('new','triaged','promoted','rejected'))
            );
            CREATE INDEX IF NOT EXISTS "idx_ai_evaluation_feedback_scope" ON "ai_evaluation_feedback" ("tenant_id","project_id","state","created_at");
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_evaluation_feedback"`);
    }
}
