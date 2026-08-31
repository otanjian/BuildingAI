import type { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1788500000000 implements MigrationInterface {
    name = "Migration1788500000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS vector; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pgvector extension unavailable; semantic index will remain unavailable'; END $$`);

        await queryRunner.query(`ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "classification" VARCHAR(64) DEFAULT 'internal'`);
        await queryRunner.query(`ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "acl_policy" JSONB`);
        await queryRunner.query(`ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "source_version" INTEGER NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "index_version" VARCHAR(100)`);
        await queryRunner.query(`ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "index_status" VARCHAR(32) NOT NULL DEFAULT 'ready'`);

        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "tenant_id" UUID`);
        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "project_id" UUID`);
        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "classification" VARCHAR(64) DEFAULT 'internal'`);
        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "acl_policy" JSONB`);
        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "source_version" INTEGER NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "parser_version" VARCHAR(64)`);
        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "chunking_version" VARCHAR(64)`);
        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "checksum" VARCHAR(128)`);
        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMPTZ`);
        await queryRunner.query(`ALTER TABLE "datasets_documents" ADD COLUMN IF NOT EXISTS "deletion_job_id" VARCHAR(64)`);

        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "tenant_id" UUID`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "project_id" UUID`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "classification" VARCHAR(64) DEFAULT 'internal'`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "acl_policy" JSONB`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "source_version" INTEGER NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "parser_version" VARCHAR(64)`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "chunking_version" VARCHAR(64)`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "checksum" VARCHAR(128)`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "index_version" VARCHAR(100)`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "index_status" VARCHAR(32) NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "datasets_segments" ADD COLUMN IF NOT EXISTS "tombstoned_at" TIMESTAMPTZ`);

        await queryRunner.query(`
            UPDATE "datasets_documents" d
            SET tenant_id = ds.tenant_id,
                project_id = ds.project_id,
                classification = COALESCE(d.classification, ds.classification, 'internal'),
                acl_policy = COALESCE(d.acl_policy, ds.acl_policy),
                parser_version = COALESCE(d.parser_version, 'llm-file-parser-v1'),
                chunking_version = COALESCE(d.chunking_version, 'default-v1')
            FROM "datasets" ds WHERE ds.id = d.dataset_id
        `);
        await queryRunner.query(`
            UPDATE "datasets_segments" s
            SET tenant_id = d.tenant_id,
                project_id = d.project_id,
                classification = COALESCE(d.classification, 'internal'),
                acl_policy = d.acl_policy,
                source_version = d.source_version,
                parser_version = d.parser_version,
                chunking_version = d.chunking_version,
                index_version = COALESCE(s.index_version, ds.index_version, 'legacy-v1'),
                index_status = CASE WHEN s.enabled = 1 AND s.status = 'completed' THEN 'active' ELSE s.index_status END
            FROM "datasets_documents" d
            JOIN "datasets" ds ON ds.id = d.dataset_id
            WHERE d.id = s.document_id
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dataset_documents_scope" ON "datasets_documents" ("tenant_id", "project_id", "dataset_id", "status")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_dataset_documents_checksum" ON "datasets_documents" ("dataset_id", "checksum") WHERE checksum IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dataset_segments_retrieval_scope" ON "datasets_segments" ("tenant_id", "project_id", "dataset_id", "status", "enabled")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dataset_segments_index_version" ON "datasets_segments" ("dataset_id", "index_version", "index_status")`);
        await queryRunner.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_dataset_segments_embedding_hnsw" ON "datasets_segments" USING hnsw ((embedding::text::vector) vector_cosine_ops) WHERE embedding IS NOT NULL'; END IF; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pgvector index unavailable; continuing without HNSW'; END $$`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "datasets_embeddings" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "document_id" UUID NOT NULL, "segment_id" UUID NOT NULL,
                "model_version" VARCHAR(100) NOT NULL, "dimension" INTEGER NOT NULL, "checksum" VARCHAR(128) NOT NULL,
                "vector" DOUBLE PRECISION[] NOT NULL, "status" VARCHAR(32) NOT NULL DEFAULT 'active',
                CONSTRAINT "pk_datasets_embeddings" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dataset_embeddings_scope" ON "datasets_embeddings" ("tenant_id", "dataset_id", "document_id", "segment_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_dataset_embeddings_checksum" ON "datasets_embeddings" ("segment_id", "checksum", "model_version")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "datasets_ingestion_jobs" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL, "project_id" UUID, "dataset_id" UUID NOT NULL, "document_id" UUID,
                "stage" VARCHAR(32) NOT NULL, "status" VARCHAR(32) NOT NULL DEFAULT 'queued', "progress" INTEGER NOT NULL DEFAULT 0,
                "attempts_made" INTEGER NOT NULL DEFAULT 0, "max_attempts" INTEGER NOT NULL DEFAULT 3, "next_attempt_at" TIMESTAMPTZ,
                "checkpoint" VARCHAR(128), "error_message" TEXT, "idempotency_key" VARCHAR(160) NOT NULL, "metadata" JSONB,
                CONSTRAINT "pk_datasets_ingestion_jobs" PRIMARY KEY ("id"),
                CONSTRAINT "ck_dataset_ingestion_progress" CHECK ("progress" >= 0 AND "progress" <= 100),
                CONSTRAINT "ck_dataset_ingestion_stage" CHECK ("stage" IN ('parse','chunk','embed','index','re_embed','revoke','delete')),
                CONSTRAINT "ck_dataset_ingestion_status" CHECK ("status" IN ('queued','running','paused','failed','dead_letter','completed','cancelled'))
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dataset_ingestion_scope" ON "datasets_ingestion_jobs" ("tenant_id", "dataset_id", "status", "created_at")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_dataset_ingestion_idempotency" ON "datasets_ingestion_jobs" ("tenant_id", "idempotency_key")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "datasets_deletion_evidence" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "document_id" UUID, "job_id" VARCHAR(64) NOT NULL,
                "content_digest" VARCHAR(128) NOT NULL, "tombstoned_at" TIMESTAMPTZ NOT NULL, "physically_deleted_at" TIMESTAMPTZ,
                "status" VARCHAR(32) NOT NULL DEFAULT 'pending', CONSTRAINT "pk_datasets_deletion_evidence" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dataset_deletion_evidence_scope" ON "datasets_deletion_evidence" ("tenant_id", "dataset_id", "document_id", "created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "datasets_deletion_evidence"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "datasets_ingestion_jobs"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "datasets_embeddings"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_dataset_segments_embedding_hnsw"`);
        for (const column of ["tenant_id", "project_id", "classification", "acl_policy", "source_version", "parser_version", "chunking_version", "checksum", "index_version", "index_status", "tombstoned_at"]) {
            await queryRunner.query(`ALTER TABLE "datasets_segments" DROP COLUMN IF EXISTS "${column}"`);
        }
        for (const column of ["tenant_id", "project_id", "classification", "acl_policy", "source_version", "parser_version", "chunking_version", "checksum", "revoked_at", "deletion_job_id"]) {
            await queryRunner.query(`ALTER TABLE "datasets_documents" DROP COLUMN IF EXISTS "${column}"`);
        }
        for (const column of ["classification", "acl_policy", "source_version", "index_version", "index_status"]) {
            await queryRunner.query(`ALTER TABLE "datasets" DROP COLUMN IF EXISTS "${column}"`);
        }
    }
}
